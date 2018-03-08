import { transform } from 'babel-core'
import plugin from '../plugin'

const shoot = code =>
    expect(
        transform(code, {
            plugins: [plugin]
        }).code
    ).toMatchSnapshot()

describe('plugin', () => {
    it('simple', () => {
        shoot(`
            let x;
            x = 1
            x = x
        `)
    })
})
