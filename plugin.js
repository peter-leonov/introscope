module.exports = function(babel) {
    var t = babel.types
    return {
        visitor: {
            ArrayExpression: function(path) {
                path.replaceWith(
                    t.callExpression(
                        t.memberExpression(
                            t.identifier("mori"),
                            t.identifier("vector")
                        ),
                        path.node.elements
                    )
                )
            }
        }
    }
}
