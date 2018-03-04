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
        `,
        {
            plugins: [plugin]
        }
    )

    // print the generated code to screen
    console.log(out.code)
})
