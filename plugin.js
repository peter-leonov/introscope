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

    const getLocalSpecifierIdentifiers = path => {
        const identifiers = []
        const getLocalIdentifiers = path => {
            const local = path.node.local
            if (t.isIdentifier(local)) identifiers.push(local)
        }
        path.traverse({
            ImportDefaultSpecifier: getLocalIdentifiers,
            ImportSpecifier: getLocalIdentifiers,
            ImportNamespaceSpecifier: getLocalIdentifiers
        })
        return identifiers
    }

    const getAndRemoveImportedIdentifiers = path => {
        const identifiers = []
        path.traverse({
            ImportDeclaration(path) {
                push(identifiers, getLocalSpecifierIdentifiers(path))
                path.remove()
            }
        })
        return identifiers
    }

    const unwrapOrRemoveExports = path => {
        const identifiers = []
        path.traverse({
            ExportDefaultDeclaration: path =>
                path.replaceWith(
                    t.variableDeclaration('const', [
                        t.variableDeclarator(
                            t.identifier('defaultExport'),
                            path.node.declaration
                        )
                    ])
                ),
            ExportNamedDeclaration: path =>
                path.node.declaration
                    ? path.replaceWith(path.node.declaration)
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

    const declarationToScope = scopeId => path => {
        switch (path.node.type) {
            case 'VariableDeclarator':
                variableDeclaratorToScope(scopeId)(path)
                break
            default:
            // TODO: error out here using babel logger
        }
        return scopeId
    }

    const replaceReferenceWithScope = scopeId => path => {
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
                unwrapOrRemoveExports(path)

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
            }
        }
    }
}
