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
            let fn1 = () => x++
            let fn2 = fn1()
        `)
    })
})
