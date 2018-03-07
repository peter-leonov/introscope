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
    ImportDeclaration: 'import "some-module"',
    ImportDefaultSpecifier: 'import defaultImport from "some-module"',
    ImportSpecifier1: 'import { singleNamedImport } from "some-module"',
    ImportSpecifier2:
        'import { namedImport1, namedImport2 } from "some-module"',
    ImportSpecifier3:
        'import { originalImportName as localImportName } from "some-module"',
    ImportNamespaceSpecifier: 'import * as namespaceImport from "some-module"',
    ClassDeclaration: "class className { fn() { const i = 0 } }",
    FunctionDeclaration: "function functionName () { function i() {} }",
    GlobalAccess1: "global1 = 1",
    GlobalAccess2: "global2()",
    GlobalAccess3: "!function(){ return global3 }()",
    VariableDeclaration1: "var undefinedVar, var1 = 1, var2 = 2, var3 = 3",
    VariableDeclaration2: "let undefinedLet, let1 = 1, let2 = 2, let3 = 3",
    VariableDeclaration3: "const const1 = 1, const2 = 2, const3 = 3",
    BlockScope: "{ let scoped = false }",
    ExportDefaultDeclaration: "export default true",
    ExportNamedDeclaration1: "export const namedSingleExport = true",
    ExportNamedDeclaration2: "export { var1, let2, const3 }",
    ExportAllDeclaration: 'export * from "all"'
}

xdescribe("plugin", () => {
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
