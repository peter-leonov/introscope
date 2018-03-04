const getLocalSpecifierIdentifiers = (t, path) => {
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

module.exports = function(babel) {
    var t = babel.types
    return {
        visitor: {
            ImportDeclaration(path) {
                path.replaceWith(
                    t.callExpression(
                        t.identifier("importing"),
                        getLocalSpecifierIdentifiers(t, path)
                    )
                )
            }
            // Program: function(path) {
            //     console.log("path.node")
            //     console.log(path.node)
            // }
        }
    }
}
