const toPairs = obj => {
    const pairs = []
    for (const key in obj) {
        pairs.push([key, obj[key]])
    }
    return pairs
}

const byType = type => node => node.type == type
const not = fn => (...args) => !fn(...args)

function processProgram({ types: t }, programPath, programState) {
    let options = { removeImports: false }

    const scopeId = programPath.scope.generateUidIdentifier('scope')

    const scopeSet = (left, right) =>
        t.assignmentExpression('=', t.memberExpression(scopeId, left), right)

    const unwrapOrRemoveExports = path => {
        path.get('body').forEach(path => {
            if (path.isExportDefaultDeclaration()) {
                path.replaceWith(
                    t.expressionStatement(
                        scopeSet(
                            t.identifier('default'),
                            path.get('declaration').node
                        )
                    )
                )
            } else if (path.isExportNamedDeclaration()) {
                path.node.declaration
                    ? path.replaceWith(path.get('declaration').node)
                    : path.remove()
            } else if (path.isExportAllDeclaration()) {
                path.remove()
            }
        })
    }

    const identifiersToObjectProperties = identifiers =>
        identifiers.map(identifier =>
            t.objectProperty(identifier, identifier, undefined, true)
        )

    const wrapInFunction = (globalIds, body) =>
        t.functionExpression(
            null,
            [t.assignmentPattern(scopeId, t.objectExpression([]))],
            t.blockStatement(
                []
                    .concat(
                        globalIds.length
                            ? t.variableDeclaration(
                                  'var',
                                  globalIds.map(id => t.variableDeclarator(id))
                              )
                            : []
                    )
                    .concat(body)
                    .concat([t.returnStatement(scopeId)])
            )
        )

    const getGlobalIdentifiers = scope =>
        toPairs(scope.globals).map(([_, identifier]) => identifier)

    const moduleExports = right =>
        t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.memberExpression(
                    t.identifier('module'),
                    t.identifier('exports')
                ),
                right
            )
        )

    const variableDeclaratorToScope = (path, identifier) => {
        const idPath = path.get('id')
        if (idPath.isObjectPattern()) {
            path.insertAfter(
                t.variableDeclarator(
                    path.scope.generateUidIdentifier('temp'),
                    scopeSet(t.clone(identifier), t.clone(identifier))
                )
            )
        } else if (idPath.isArrayPattern()) {
        } else {
            const init = path.get('init')
            if (!init.node) return
            // Q: Why not replace the parent VariableDeclaration node?
            // A: To not die debugging variable declaration order in a `for` loop if one of the binding should be ignored dew to introscope configuration (expected future feature). And it's simplier to implement :)
            init.replaceWith(scopeSet(path.get('id').node, init.node))
        }
    }

    const classDeclarationToScope = path => {
        const classExpression = t.clone(path.node)
        classExpression.type = 'ClassExpression'
        path.replaceWith(
            t.expressionStatement(
                scopeSet(path.get('id').node, classExpression)
            )
        )
    }

    const functionDeclarationToScope = path => {
        const program = path.findParent(path => path.isProgram())
        program.unshiftContainer(
            'body',
            t.expressionStatement(
                scopeSet(path.get('id').node, path.get('id').node)
            )
        )
    }

    const declarationToScope = (path, identifier) => {
        if (path.isNodeType('VariableDeclarator')) {
            variableDeclaratorToScope(path, identifier)
        } else if (path.isNodeType('ClassDeclaration')) {
            classDeclarationToScope(path)
        } else if (path.isNodeType('FunctionDeclaration')) {
            functionDeclarationToScope(path)
        } else if (
            path.isNodeType('ImportDefaultSpecifier') ||
            path.isNodeType('ImportSpecifier') ||
            path.isNodeType('ImportNamespaceSpecifier')
        ) {
            if (options.removeImports === true) {
                // ignore
            } else if (path.parentPath.isImportDeclaration()) {
                return path.get('local').node
            }
        } else {
            throw new TypeError('Unknown node.type = ' + path.node.type)
            // TODO: log warning here using babel logger
        }
    }

    const replaceReferenceWithScope = path => {
        // ExportNamedDeclaration gets properly processed by replaceMutationWithScope()
        if (path.node.type == 'ExportNamedDeclaration') return
        // ExportSpecifier gets removed by unwrapOrRemoveExports()
        if (path.parent.type == 'ExportSpecifier') return
        if (path.findParent(path => path.isObjectPattern())) return

        const scoped = t.memberExpression(scopeId, path.node)
        if (path.parent && path.parent.type == 'CallExpression') {
            path.replaceWith(
                t.sequenceExpression([t.numericLiteral(0), scoped])
            )
        } else {
            path.replaceWith(scoped)
        }
    }

    const replaceMutationWithScope = path => {
        if (path.node.type == 'AssignmentExpression') {
            const left = path.get('left')
            left.replaceWith(t.memberExpression(scopeId, left.node))
        }
    }

    const bindingToScope = binding => {
        binding.referencePaths.forEach(replaceReferenceWithScope)
        binding.constantViolations.forEach(replaceMutationWithScope)
        return declarationToScope(binding.path, binding.identifier)
    }

    const bindingsToScope = bindings =>
        toPairs(bindings)
            .map(([_, binding]) => binding)
            .map(bindingToScope)
            .filter(Boolean)

    const program = (path, state) => {
        const globalIds = getGlobalIdentifiers(path.scope)
        const programGlobalNames = Object.keys(path.scope.globals)

        const localImportIds = bindingsToScope(path.scope.bindings)

        // unwrapOrRemoveExports() should go after bindingsToScope() as the latter treats `export var/let/const` as a reference and uses node.parent to distinguish
        unwrapOrRemoveExports(path)

        // reverse()-ing to preserve order after unshift()-ing
        localImportIds
            .reverse()
            .forEach(localId =>
                path.node.body.unshift(
                    t.expressionStatement(scopeSet(localId, localId))
                )
            )

        const programBody = path.node.body
        if (options.removeImports === true) {
            path.node.body = []
        } else {
            const importsOnly = programBody.filter(byType('ImportDeclaration'))
            path.node.body = importsOnly
        }
        const bodyWithoutImports = programBody.filter(
            not(byType('ImportDeclaration'))
        )

        path.pushContainer(
            'body',
            moduleExports(wrapInFunction(globalIds, bodyWithoutImports))
        )

        const uniqueGlobalIds = new Set()
        path.traverse({
            Scope(path, state) {
                programGlobalNames.forEach(globalName => {
                    const binding = path.scope.getBinding(globalName)
                    uniqueGlobalIds.add(binding)
                })
            }
        })
        bindingsToScope(Array.from(uniqueGlobalIds.values()))
    }

    program(programPath, programState)
}

export default function(babel) {
    return {
        visitor: {
            Program(path, state) {
                processProgram(babel, path, state)
            }
        }
    }
}
