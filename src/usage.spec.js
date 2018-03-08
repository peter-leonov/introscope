import { transform } from 'babel-core'
import plugin from '../plugin'

const shoot = code =>
    expect(
        transform(code, {
            plugins: [plugin]
        }).code
    ).toMatchSnapshot()

describe('plugin', () => {
    it('assignments', () => {
        shoot(`
            let x;
            x++;
            x = 1;
        `)
    })

    it('references', () => {
        shoot(`
            let x;
            x();
            !function(){ x++ };
            () => { return { x } };
        `)
    })
})
