const push = (a, b) => a.push.apply(a, b)
const flatten = (acc = [], ary) => acc.concat(ary)
const get = prop => obj => obj[prop]

export default function({ types: t }) {
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

    const removeExports = path => {
        const identifiers = []
        const remove = path => path.remove()
        path.traverse({
            ExportDefaultDeclaration: remove,
            ExportNamedDeclaration: remove,
            ExportAllDeclaration: remove
        })
        return identifiers
    }

    const identifiersToObjectProperties = identifiers =>
        identifiers.map(identifier =>
            t.objectProperty(identifier, identifier, undefined, true)
        )

    const byType = type => node => node.type == type
    const getDeclarators = node => node.declarations
    const findDeclarationIdentifiers = ary =>
        ary
            .filter(byType("VariableDeclaration"))
            .map(getDeclarators)
            .reduce(flatten)
            .map(get("id"))

    const findFunctionIdentifiers = ary =>
        ary.filter(byType("FunctionDeclaration")).map(get("id"))

    return {
        visitor: {
            Program: function(path) {
                const importIds = getAndRemoveImportedIdentifiers(path)
                removeExports(path)
                path.node.body = [
                    t.functionDeclaration(
                        t.identifier("wrapper"),
                        [
                            t.objectPattern(
                                identifiersToObjectProperties(importIds)
                            )
                        ],
                        t.blockStatement(
                            path.node.body.concat([
                                t.returnStatement(
                                    t.objectExpression(
                                        identifiersToObjectProperties(
                                            findDeclarationIdentifiers(
                                                path.node.body
                                            ).concat(
                                                findFunctionIdentifiers(
                                                    path.node.body
                                                )
                                            )
                                        )
                                    )
                                )
                            ])
                        )
                    )
                ]
            }
        }
    }
}
