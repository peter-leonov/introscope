import { resolve } from 'path';

const introscope = path => require(path + '?introscope.js');

describe('require.introscope', () => {
    it('does not cache when require() goes first', () => {
        // in each require order test filenames should be uniqe
        const file = './require1';

        // cache the original transformation first
        const firstRequire = require(file);
        expect(typeof firstRequire).toBe('object');
        expect(firstRequire.publicVariable).toBe('publicValue');
        expect(firstRequire.privateVariable).toBe(undefined);

        // require with introscope enabled
        const firstIntroscope = introscope(file);
        expect(typeof firstIntroscope).toBe('function');
        const scope1 = firstIntroscope();
        expect(scope1.publicVariable).toBe('publicValue');
        expect(scope1.privateVariable).toBe('privateValue');

        // get again the original transformation
        const secondRequire = require(file);
        expect(typeof secondRequire).toBe('object');
        expect(secondRequire.publicVariable).toBe('publicValue');
        expect(secondRequire.privateVariable).toBe(undefined);
    });

    it('does not cache when require.introscope() goes first', () => {
        // in each require order test filenames should be uniqe
        const file = './require2';

        // require with introscope enabled first
        const firstIntroscope = introscope(file);
        expect(typeof firstIntroscope).toBe('function');
        const scope1 = firstIntroscope();
        expect(scope1.publicVariable).toBe('publicValue');
        expect(scope1.privateVariable).toBe('privateValue');

        // try getting original transformation second
        const firstRequire = require(file);
        expect(typeof firstRequire).toBe('object');
        expect(firstRequire.publicVariable).toBe('publicValue');
        expect(firstRequire.privateVariable).toBe(undefined);

        // require again with introscope enabled
        const secondIntroscope = introscope(file);
        expect(typeof secondIntroscope).toBe('function');
        const scope2 = secondIntroscope();
        expect(scope2.publicVariable).toBe('publicValue');
        expect(scope2.privateVariable).toBe('privateValue');
    });
});

describe('source maps', () => {
    it('stack trace is correct', () => {
        expect.assertions(4);

        const errorScope = introscope('./error.js');
        expect(typeof errorScope).toBe('function');
        const scope = errorScope();
        expect(typeof scope.throws).toBe('function');

        expect(() => {
            try {
                scope.throws();
            } catch (err) {
                const introscopedPart = err.stack.split(__filename)[0];

                expect(
                    introscopedPart.split(__dirname).join('__dirname')
                ).toMatchSnapshot();
                throw err;
            }
        }).toThrow();
    });
});
