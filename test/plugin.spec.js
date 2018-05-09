import { transform } from 'babel-core';
import plugin from '../babel-plugin';

const shoot = (code, opts = {}) =>
    expect(
        transform(code, {
            sourceType: 'module',
            plugins: [
                'syntax-flow',
                'syntax-object-rest-spread',
                [plugin, { enable: true, ...opts }],
            ],
        }).code,
    ).toMatchSnapshot();

describe('plugin', () => {
    it('import', () => {
        const code = `
            import 'some-module1'
            import defaultImport from 'some-module2'
            import { singleNamedImport } from 'some-module3'
            import { namedImport1, namedImport2 } from 'some-module4'
            import { originalImportName as localImportName } from 'some-module5'
            import * as namespaceImport from 'some-module6'

            [
                defaultImport,
                singleNamedImport,
                namedImport1,
                namedImport2,
                localImportName,
                namespaceImport
            ]
        `;
        shoot(code);
        shoot(code, { removeImports: true });
    });

    it('assignments', () => {
        shoot(`
            let x;
            x++;
            x = 1;
        `);
    });

    it('references', () => {
        shoot(`
            let x;
            x();
            !function(){ x++ };
            () => { return { x } };
            !{ x }
        `);
    });

    it('declarations', () => {
        shoot(`
            let noInitValue;
            for (var forVar = 0; forVar != 0; forVar++);
            let singleInit = 1;
            let doubleInit1 = 1, doubleInit2 = 2;
            var sameDoubleInit = 1, sameDoubleInit = 2;

            let { singleDestructing } = 1
            var { objectDestruction1, objectDestruction2, nestedProperty: { objectNestedDestruction1 } } = { objectDestruction1, objectDestruction2, nestedProperty: { objectNestedDestruction1 } }, let2 = objectDestruction1;
            let { ...objectRest } = 1;
            var [ arrayDestruction1, arrayDestruction2, [ arrayNestedDestruction ] ] = [ arrayDestruction1, arrayDestruction2, [ arrayNestedDestruction ] ];
            let [ ...arrayRest ] = 1;


            class ClassName {}; new ClassName();
            functionName(); function functionName () {}
        `);
    });

    it('scopes', () => {
        shoot(`
            let x = true;
            for (let x = 0; x != 0; x++);
            { let x = false; }
            !function(){ var x = false; }
        `);
    });

    it('globals', () => {
        shoot(`
            let x = global1;
            global2 = 1;
            global2 = 1;
            globalFunction();
            !function(){ return [nestedGlobal1, global2] }();
        `);
    });

    it('export', () => {
        shoot(`
            let defaultExport, toBeNameExport1, toBeNameExport2;
            export default defaultExport;
            export const namedSingleExport = 'namedSingleExportValue'
            export { toBeNameExport1, toBeNameExport2 }
            export * from 'some-module'
        `);
    });

    it('flow', () => {
        shoot(`
            import type { TypeImportedTypeShouldBeIgnored } from 'x'
            import { type ImportedTypeShouldBeIgnored } from 'y'
            type LocalTypeShouldBeIgnored = ImportedTypeShouldBeIgnored | TypeImportedTypeShouldBeIgnored;
        `);

        shoot(`
            type SomeType = number;
            type SomeOtherType = SomeType;
            function typedFuntion(x: SomeType): SomeOtherType {
                let typedVar: SomeType | SomeOtherType = 123
            }
        `);

        shoot(`
            opaque type OpaqueType = string;
            let foo: OpaqueType = "foo"
        `);
    });
});

describe('options', () => {
    it('does nothing if NODE_ENV != "test"', () => {
        const NODE_ENV = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        shoot(`
            var shouldBeUntouched = true;
        `);
        process.env.NODE_ENV = 'development';
        shoot(`
        var shouldBeUntouched = true;
        `);
        process.env.NODE_ENV = 'test';
        shoot(`
            var shouldBeTransformed = true;
        `);
        process.env.NODE_ENV = NODE_ENV;
    });

    it('removeImports', () => {
        shoot(`
            // @introscope "removeImports": true
            // other comment
            import sholdBeRemoved from 'some-module1'
            sholdBeRemoved++
        `);
        shoot(`
            // @other-at-comment bla bla bla
            import sholdBeRemoved from 'some-module1'
            sholdBeRemoved++
            // @introscope "removeImports": true
        `);
        shoot(
            `
            // @introscope "removeImports": false
            import sholdNotBeRemoved from 'some-module1'
            sholdNotBeRemoved++
        `,
            { removeImports: true },
        );
        shoot(`
            // @introscope "removeImports": true
            import sholdNotBeRemoved from 'some-module1'
            sholdNotBeRemoved++
            // last takes precedence
            // @introscope "removeImports": false
        `);
        shoot(`
            import sholdNotBeRemoved from 'some-module1'
            defaultImport1++
        `);
    });

    describe('ignore', () => {
        it('adds', () => {
            shoot(`
            // @introscope "ignore": ["localIgnored", "deepGlobalIgnored"]
            const x = { deep: { global: { variable: deepGlobal, variableIgnored: deepGlobalIgnored }}}
            const localIgnored = 1;
            localIgnored++;
            function throwError (message) {
                throw message
            }
            `);
        });

        it('removes', () => {
            shoot(`
            // @introscope "ignore": ["-Error", "-Date"]
            [
                Error, Date
            ]
            `);
        });

        it('id', () => {
            shoot(`
            // @introscope "ignore": []
            [
                Error, Date
            ]
            `);
        });

        it('ignores builtins', () => {
            shoot(`
            [
                Infinity,
                NaN,
                undefined,
                null,
                eval,
                isFinite,
                isNaN,
                parseFloat,
                parseInt,
                decodeURI,
                decodeURIComponent,
                encodeURI,
                encodeURIComponent,
                escape,
                unescape,
                Object,
                Function,
                Boolean,
                Symbol,
                Error,
                EvalError,
                InternalError,
                RangeError,
                ReferenceError,
                SyntaxError,
                TypeError,
                URIError,
                Number,
                Math,
                Date,
                String,
                RegExp,
                Array,
                Int8Array,
                Uint8Array,
                Uint8ClampedArray,
                Int16Array,
                Uint16Array,
                Int32Array,
                Uint32Array,
                Float32Array,
                Float64Array,
                Map,
                Set,
                WeakMap,
                WeakSet,
                SIMD,
                ArrayBuffer,
                SharedArrayBuffer, 
                Atomics, 
                DataView,
                JSON,
                Promise,
                Generator,
                GeneratorFunction,
                AsyncFunction,
                Reflect,
                Proxy,
                Intl,
                WebAssembly,
                arguments,
                Buffer,
            ]
            `);
        });
    });

    it('enable', () => {
        shoot(
            `
            let shouldBeUntouched = true;
        `,
            { enable: false },
        );

        shoot(
            `
            // @introscope "enable": false
            let shouldBeUntouched = true;
        `,
            { enable: true },
        );

        shoot(
            `
            // @introscope "enable": true
            let shouldBeTransformed = true;
        `,
            { enable: false },
        );
    });

    it('disable', () => {
        shoot(
            `
            let shouldBeUntouched = true;
        `,
            { disable: true },
        );

        shoot(
            `
            // inline "disable" is ignored, use "enable": false
            // @introscope "disable": true
            let shouldBeTransformed = true;
        `,
        );

        shoot(
            `
            let shouldBeTransformed = true;
        `,
        );
    });

    describe('exportName', () => {
        it('uses default', () => {
            shoot(`
                // no exportName
                `);
        });

        it('works with magic comment', () => {
            shoot(
                `
                // @introscope "exportName": "microscope1"
                `,
            );
        });

        it('works with plugin options', () => {
            shoot(
                `
                // code
                `,
                { exportName: 'microscope' },
            );
        });
    });
});

describe('introscope import', () => {
    it('should stay', () => {
        shoot(
            `
            import { foo } from 'foo';
            import { scope } from 'introscope';
            export const introscope = scope({
                constantA,
                functionB,
                // other identifiers of your module
            });
        `,
            { removeImports: true },
        );
    });
});

describe('test', () => {
    const code = `
    import { introscope } from 'directModule';
    import { introscope as renamed } from 'renamedModule';
    import { otherNamedImport } from 'otheModule';
    `;

    it('does normal transpilation if enabled in opts', () => {
        shoot(code, { enable: true });
    });

    it('does normal transpilation if enabled in code', () => {
        shoot(code + '\n// @introscope "enable": true', {
            enable: false,
        });
    });

    it('in test code does transpile only introscope import', () => {
        shoot(code, { enable: false });
    });

    it('in test code does transpile only introscope import', () => {
        shoot(code, { enable: false, instrumentImports: false });
    });
});
