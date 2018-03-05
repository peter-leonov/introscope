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
    ClassDeclaration: "class cl { fn() { const i = 0 } }",
    FunctionDeclaration: "function fn () { function i() {} }",
    VariableDeclaration1: "var x, x1 = 1, x2 = 2, x3 = 4",
    VariableDeclaration2: "let y, y1 = 1, y2 = 2, y3 = 3",
    VariableDeclaration3: "const z1 = 1, z2 = 2, z3 = 3",
    ExportDefaultDeclaration: "export default true",
    ExportNamedDeclaration1: "export const v = true",
    ExportNamedDeclaration2: "export { a, b, c }",
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
