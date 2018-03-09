const toPairs = obj => {
    const pairs = []
    for (const key in obj) {
        pairs.push([key, obj[key]])
    }
    return pairs
}

const byType = type => node => node.type == type
const not = fn => (...args) => !fn(...args)

function processProgram({ types: t }, rootPath, rootState) {
    let options = { removeImports: false }

    const scopeSet = (scopeId, left, right) =>
        t.assignmentExpression('=', t.memberExpression(scopeId, left), right)

    const unwrapOrRemoveExports = scopeId => path => {
        path.get('body').forEach(path => {
            if (path.isExportDefaultDeclaration()) {
                path.replaceWith(
                    t.expressionStatement(
                        scopeSet(
                            scopeId,
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

    const wrapInFunction = (scopeId, idsIn, body) =>
        t.functionExpression(
            null,
            [
                t.assignmentPattern(scopeId, t.objectExpression([])),
                t.objectPattern(identifiersToObjectProperties(idsIn))
            ],
            t.blockStatement(body.concat([t.returnStatement(scopeId)]))
        )

    const getGlobalIdentifiers = scope =>
        toPairs(scope.globals).map(([_, identifier]) => identifier)

    const moduleExports = idendifier =>
        t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.memberExpression(
                    t.identifier('module'),
                    t.identifier('exports')
                ),
                idendifier
            )
        )

    const variableDeclaratorToScope = scopeId => path => {
        const init = path.get('init')
        if (!init.node) return
        // Q: Why not replace the parent VariableDeclaration node?
        // A: To not die debugging variable declaration order in a `for` loop if one of the binding should be ignored dew to introscope configuration (expected future feature). And it's simplier to implement :)
        init.replaceWith(scopeSet(scopeId, path.get('id').node, init.node))
    }

    const classDeclarationToScope = scopeId => path => {
        const classExpression = t.clone(path.node)
        classExpression.type = 'ClassExpression'
        path.replaceWith(
            t.expressionStatement(
                scopeSet(scopeId, path.get('id').node, classExpression)
            )
        )
    }

    const functionDeclarationToScope = scopeId => path => {
        const program = path.findParent(path => path.isProgram())
        program.unshiftContainer(
            'body',
            t.expressionStatement(
                scopeSet(scopeId, path.get('id').node, path.get('id').node)
            )
        )
    }

    const declarationToScope = scopeId => path => {
        if (path.isNodeType('VariableDeclarator')) {
            variableDeclaratorToScope(scopeId)(path)
        } else if (path.isNodeType('ClassDeclaration')) {
            classDeclarationToScope(scopeId)(path)
        } else if (path.isNodeType('FunctionDeclaration')) {
            functionDeclarationToScope(scopeId)(path)
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

    const replaceReferenceWithScope = scopeId => path => {
        // ExportNamedDeclaration gets properly processed by replaceMutationWithScope()
        if (path.node.type == 'ExportNamedDeclaration') return
        // ExportSpecifier gets removed by unwrapOrRemoveExports()
        if (path.parent.type == 'ExportSpecifier') return

        const scoped = t.memberExpression(scopeId, path.node)
        if (path.parent && path.parent.type == 'CallExpression') {
            path.replaceWith(
                t.sequenceExpression([t.numericLiteral(0), scoped])
            )
        } else {
            path.replaceWith(scoped)
        }
    }

    const replaceMutationWithScope = scopeId => path => {
        if (path.node.type == 'AssignmentExpression') {
            const left = path.get('left')
            left.replaceWith(t.memberExpression(scopeId, left.node))
        }
    }

    const bindingToScope = scopeId => binding => {
        binding.referencePaths.forEach(replaceReferenceWithScope(scopeId))
        binding.constantViolations.forEach(replaceMutationWithScope(scopeId))
        return declarationToScope(scopeId)(binding.path)
    }

    const bindingsToScope = scopeId => bindings =>
        toPairs(bindings)
            .map(([_, binding]) => binding)
            .map(bindingToScope(scopeId))
            .filter(Boolean)

    const program = (path, state) => {
        const scopeId = path.scope.generateUidIdentifier('scope')

        const globalIds = getGlobalIdentifiers(path.scope)

        const localImportIds = bindingsToScope(scopeId)(path.scope.bindings)

        // unwrapOrRemoveExports() should go after bindingsToScope() as the latter treats `export var/let/const` as a reference and uses node.parent to distinguish
        unwrapOrRemoveExports(scopeId)(path)

        // reverse()-ing to preserve order after unshift()-ing
        localImportIds
            .reverse()
            .forEach(localId =>
                path.node.body.unshift(
                    t.expressionStatement(scopeSet(scopeId, localId, localId))
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
            moduleExports(
                wrapInFunction(scopeId, globalIds, bodyWithoutImports)
            )
        )
    }

    program(rootPath, rootState)
}

export default function(babel) {
    return {
        visitor: {
            Program: function(path, state) {
                processProgram(babel, path, state)
            }
        }
    }
}
