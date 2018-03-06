import { transform } from "babel-core"
import plugin from "../plugin2"

describe("plugin2", () => {
    it("deep", () => {
        const code = `
            const topLevel = true
            function fn () {
                topLevel++
                let local = global
            }
        `
        expect(
            transform(code, {
                plugins: [plugin]
            }).code
        ).toMatchSnapshot()
    })
})
