// import { foo } from "./foo"

import { transform } from "babel-core"
import plugin from "../plugin"

test("foo", () => {
    expect(true).toBe(true)

    var out = transform(
        `
            // no specifiers
            import "bla"
            // ImportDefaultSpecifier
            import a from "bla"
            // ImportSpecifier
            import { b } from "bla"
            import { c, d } from "bla"
            import { x as e } from "bla"
            // ImportNamespaceSpecifier
            import * as f from "bla"

            function fn () {}
            var x = 1
            let y = 2
            const z = 3


            // ExportDefaultDeclaration
            export default 7
            // ExportNamedDeclaration
            export const v = 0
            // ExportAllDeclaration
            export * from 'all'
        `,
        {
            plugins: [plugin]
        }
    )

    // print the generated code to screen
    console.log(out.code)
})
