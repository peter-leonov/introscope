const push = (a, b) => a.push.apply(a, b)
const flatten = (acc, ary) => acc.concat(ary)
const get = prop => obj => obj[prop]
const or = (a, b) => v => a(v) || b(v)

const toPairs = obj => {
    const pairs = []
    for (const key in obj) {
        pairs.push([key, obj[key]])
    }
    return pairs
}

export default function({ types: t }) {
    const byType = type => node => node.type == type

    const removeImports = path => {
        path.traverse({
            ImportDeclaration(path) {
                path.remove()
            }
        })
    }

    const unwrapOrRemoveExports = scopeId => path => {
        const identifiers = []
        path.traverse({
            ExportDefaultDeclaration: path =>
                path.replaceWith(
                    t.assignmentExpression(
                        '=',
                        t.memberExpression(scopeId, t.identifier('default')),
                        path.get('declaration').node
                    )
                ),
            ExportNamedDeclaration: path =>
                path.node.declaration
                    ? path.replaceWith(path.get('declaration').node)
                    : path.remove(),
            ExportAllDeclaration: path => path.remove()
        })
        return identifiers
    }

    const identifiersToObjectProperties = identifiers =>
        identifiers.map(identifier =>
            t.objectProperty(identifier, identifier, undefined, true)
        )

    const wrapInFunction = (scopeId, idsIn, body) =>
        t.functionExpression(
            null,
            [scopeId, t.objectPattern(identifiersToObjectProperties(idsIn))],
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
        init.replaceWith(
            t.assignmentExpression(
                '=',
                t.memberExpression(scopeId, path.get('id').node),
                init.node
            )
        )
    }

    const classDeclarationToScope = scopeId => path => {
        const classExpression = t.clone(path.node)
        classExpression.type = 'ClassExpression'
        path.replaceWith(
            t.assignmentExpression(
                '=',
                t.memberExpression(scopeId, path.get('id').node),
                classExpression
            )
        )
    }

    const functionDeclarationToScope = scopeId => path => {
        const program = path.findParent(path => path.isProgram())
        program.unshiftContainer(
            'body',
            t.expressionStatement(
                t.assignmentExpression(
                    '=',
                    t.memberExpression(scopeId, path.get('id').node),
                    path.get('id').node
                )
            )
        )
    }

    const declarationToScope = scopeId => path => {
        switch (path.node.type) {
            case 'VariableDeclarator':
                variableDeclaratorToScope(scopeId)(path)
                break
            case 'ClassDeclaration':
                classDeclarationToScope(scopeId)(path)
                break
            case 'FunctionDeclaration':
                functionDeclarationToScope(scopeId)(path)
                break
            case 'ImportDefaultSpecifier':
            case 'ImportSpecifier':
            case 'ImportNamespaceSpecifier':
                // ignore
                break
            default:
                throw new TypeError('Unknown node.type = ' + path.node.type)
            // TODO: log warning here using babel logger
        }
        return scopeId
    }

    const replaceReferenceWithScope = scopeId => path => {
        // ExportNamedDeclaration gets properly processed by replaceMutationWithScope()
        if (path.node.type == 'ExportNamedDeclaration') return
        // ExportSpecifier gets revoved by unwrapOrRemoveExports()
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
        declarationToScope(scopeId)(binding.path)
        binding.referencePaths.forEach(replaceReferenceWithScope(scopeId))
        binding.constantViolations.forEach(replaceMutationWithScope(scopeId))
    }

    return {
        visitor: {
            Program: function(path, state) {
                const scopeId = path.scope.generateUidIdentifier('scope')

                toPairs(path.scope.bindings)
                    .map(([_, binding]) => binding)
                    .forEach(bindingToScope(scopeId))

                const globalIds = getGlobalIdentifiers(path.scope)
                path.node.body = [
                    moduleExports(
                        wrapInFunction(scopeId, globalIds, path.node.body)
                    )
                ]

                removeImports(path)
                unwrapOrRemoveExports(scopeId)(path)
            }
        }
    }
}
