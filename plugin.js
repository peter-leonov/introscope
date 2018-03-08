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
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("defaultExport"),
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
                "=",
                t.memberExpression(
                    t.identifier("module"),
                    t.identifier("exports")
                ),
                idendifier
            )
        )

    const variableDeclaratorToScope = path => path.node

    const declarationToScope = (path, scopeId) => {
        switch (path.node.type) {
            case "VariableDeclarator":
                path.replaceWith(variableDeclaratorToScope(path, scopeId))
                break
        }
        return scopeId
    }

    const referenceToScope = (path, scopeId) => {
        const scoped = t.memberExpression(scopeId, path.node)
        if (path.parent && path.parent.type == "CallExpression") {
            return t.sequenceExpression([t.numericLiteral(0), scoped])
        }
        return scoped
    }

    const bindingToScope = (binding, scopeId) => {
        declarationToScope(binding.path, scopeId)
        binding.referencePaths.forEach(path =>
            path.replaceWith(referenceToScope(path, scopeId))
        )
    }

    return {
        visitor: {
            Program: function(path, state) {
                unwrapOrRemoveExports(path)

                const scopeId = path.scope.generateUidIdentifier("scope")
                toPairs(path.scope.bindings).forEach(([_, binding]) =>
                    bindingToScope(binding, scopeId)
                )

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
