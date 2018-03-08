import { transform } from "babel-core"
import plugin from "../plugin"

const shoot = code =>
    expect(
        transform(code, {
            plugins: [plugin]
        }).code
    ).toMatchSnapshot()

describe("plugin", () => {
    it("simple", () => {
        shoot(`
            let x = 1
            const fn1 = () => x++
            const fn2 = fn1()
        `)
    })
})
