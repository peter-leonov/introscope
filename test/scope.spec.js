import { transform } from 'babel-core';
import plugin from '../babel-plugin';

// bring back normal node global
global.global = global;

const applyPlugin = (code, opts = {}) =>
    transform(code, {
        sourceType: 'module',
        plugins: [
            'syntax-flow',
            'syntax-object-rest-spread',
            [plugin, { enable: true, es6export: false, ...opts }],
        ],
    }).code;

const evalModule = code => {
    // console.log(code);
    const exports = {};
    const module = { exports };
    new Function('module', 'exports', code)(module, exports);
    return exports;
};

// r = require
const r = (...args) => evalModule(applyPlugin(...args));

describe('scope / globals', () => {
    const { introscope } = r(`
        function getGlobalDate() {
            return Date;
        }
        
        export function getGlobalFoo() {
            return Foo;
        }
        
        function getGlobal() {
            return global;
        }

        // @introscope "ignore": ["-global"]
    `);

    it('ignores built-ins', () => {
        const scope = introscope();
        scope.Date = 111;
        expect(scope.getGlobalDate()).toBe(Date);
    });

    it('leaves custom globals undefined', () => {
        const scope = introscope();
        expect(scope.getGlobalFoo()).toBe(undefined);
    });

    it('allows setting custom globals', () => {
        const foo = 222;
        const scope = introscope();
        scope.Foo = foo;
        expect(scope.getGlobalFoo()).toBe(foo);
        delete global.Foo;
    });

    it('saves custom globals in scope', () => {
        const foo = 333;
        global.Foo = foo;
        const scope = introscope();
        expect(scope.Foo).toBe(foo);
        expect(scope.getGlobalFoo()).toBe(foo);
        delete global.Foo;
    });

    it('is still possible to mock global', () => {
        const scope = introscope();
        expect(scope.global).toBe(global);
        expect(scope.getGlobal()).toBe(global);
        scope.global = 444;
        expect(scope.getGlobal()).toBe(444);
    });

    it('is possible to spy on global', () => {
        let spiedGlobal = null;
        const spyScope = {
            set global(v) {
                spiedGlobal = v;
            },
            get global() {
                return { spiedGlobal };
            },
        };
        const scope = introscope(spyScope);
        expect(spiedGlobal).toBe(global);
        expect(scope.global.spiedGlobal).toBe(global);
        expect(scope.getGlobal().spiedGlobal).toBe(global);
    });
});
