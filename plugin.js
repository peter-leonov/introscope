const push = (a, b) => a.push.apply(a, b)
const flatten = (acc, ary) => acc.concat(ary)
const get = prop => obj => obj[prop]
const or = (a, b) => v => a(v) || b(v)

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

    const byType = type => node => node.type == type
    const getDeclarators = node => node.declarations
    const findDeclarationIdentifiers = ary =>
        ary
            .filter(byType("VariableDeclaration"))
            .map(getDeclarators)
            .reduce(flatten, [])
            .map(get("id"))

    const findFunctionAndClassIdentifiers = ary =>
        ary
            .filter(
                or(byType("FunctionDeclaration"), byType("ClassDeclaration"))
            )
            .map(get("id"))

    const collectLocalScope = body =>
        findDeclarationIdentifiers(body).concat(
            findFunctionAndClassIdentifiers(body)
        )

    const wrapInFunction = (idsIn, idsOut, body) =>
        t.functionDeclaration(
            t.identifier("wrapper"),
            [t.objectPattern(identifiersToObjectProperties(idsIn))],
            t.blockStatement(
                body.concat([
                    t.returnStatement(
                        t.objectExpression(
                            identifiersToObjectProperties(idsOut)
                        )
                    )
                ])
            )
        )

    return {
        visitor: {
            Program: function(path, state) {
                console.log(state.file.parserOpts)
                console.log(state.file.opts)
                const importIds = getAndRemoveImportedIdentifiers(path)
                unwrapOrRemoveExports(path)
                const localIds = collectLocalScope(path.node.body)
                path.node.body = [
                    wrapInFunction(importIds, localIds, path.node.body)
                ]
            }
        }
    }
}
