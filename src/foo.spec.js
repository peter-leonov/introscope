import { transform } from "babel-core"
import plugin from "../plugin"

const toPairs = obj => {
    const pairs = []
    for (const key in obj) {
        pairs.push([key, obj[key]])
    }
    return pairs
}

const snd = ([_, b]) => b

const tests = {
    ImportDeclaration: 'import "foo"',
    ImportDefaultSpecifier: 'import a from "foo"',
    ImportSpecifier1: 'import { b } from "foo"',
    ImportSpecifier2: 'import { c, d } from "foo"',
    ImportSpecifier3: 'import { x as e } from "foo"',
    ImportNamespaceSpecifier: 'import * as f from "foo"',
    ClassDeclaration: "class cl {}",
    FunctionDeclaration: "function fn () {}",
    VariableDeclaration1: "var x = 1",
    VariableDeclaration2: "let y = 2",
    VariableDeclaration3: "const z = 3",
    ExportDefaultDeclaration: "export default true",
    ExportNamedDeclaration: "export const v = true",
    ExportAllDeclaration: 'export * from "all"'
}

describe("plugin", () => {
    toPairs(tests).forEach(([name, code]) => {
        it(name, () => {
            expect(
                transform(code, {
                    plugins: [plugin]
                }).code
            ).toMatchSnapshot()
        })
    })

    it("all", () => {
        const all = toPairs(tests)
            .map(snd)
            .join("\n")
        expect(
            transform(all, {
                plugins: [plugin]
            }).code
        ).toMatchSnapshot()
    })
})
