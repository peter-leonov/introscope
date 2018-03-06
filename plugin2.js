const toPairs = obj => {
    const pairs = []
    for (const key in obj) {
        pairs.push([key, obj[key]])
    }
    return pairs
}

export default function({ types: t }) {
    const findIdentifiersFromScope = (scope, path) => {
        const identifiers = []
        path.traverse({
            Identifier(path) {
                console.log(path.node.type, Object.keys(path.scope))
                // toPairs(path.scope.bindings).map(([name, binding]) => [
                //     name,
                //     binding.scope.uid
                // ])
            }
        })
    }

    return {
        visitor: {
            Program(path) {
                console.log(path.scope)
                // findIdentifiersFromScope(path.scope, path.get("body")[1])
            }
        }
    }
}
