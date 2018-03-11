import { transform } from 'babel-core';
import plugin from './plugin';

const shoot = (code, opts = {}) =>
    expect(
        transform(code, {
            sourceType: 'module',
            plugins: [
                'syntax-object-rest-spread',
                [plugin, { enable: true, ...opts }]
            ]
        }).code
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
});

describe('options', () => {
    it('does nothing if NODE_ENV == "production"', () => {
        const NODE_ENV = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        shoot(`
            var shouldBeUntouched = true;
        `);
        process.env.NODE_ENV = 'development';
        shoot(`
            var shouldBeTransformed = true;
        `);
        process.env.NODE_ENV = 'test';
        shoot(`
            var shouldBeTransformed = true;
        `);
        process.env.NODE_ENV = NODE_ENV;
    });

    it('removeImports', () => {
        shoot(`
            // @introscope-config "removeImports": true
            // other comment
            import sholdBeRemoved from 'some-module1'
            sholdBeRemoved++
        `);
        shoot(`
            // @other-at-comment bla bla bla
            import sholdBeRemoved from 'some-module1'
            sholdBeRemoved++
            // @introscope-config "removeImports": true
        `);
        shoot(
            `
            // @introscope-config "removeImports": false
            import sholdNotBeRemoved from 'some-module1'
            sholdNotBeRemoved++
        `,
            { removeImports: true }
        );
        shoot(`
            // @introscope-config "removeImports": true
            import sholdNotBeRemoved from 'some-module1'
            sholdNotBeRemoved++
            // last takes precedence
            // @introscope-config "removeImports": false
        `);
        shoot(`
            import sholdNotBeRemoved from 'some-module1'
            defaultImport1++
        `);
    });

    it('ignore', () => {
        shoot(`
        // @introscope-config "ignore": ["localIgnored", "Error", "deepGlobalIgnored"]
        const x = { deep: { global: { variable: deepGlobal, variableIgnored: deepGlobalIgnored }}}
        const localIgnored = 1;
        localIgnored++;
        function throwError (message) {
            throw new Error(message)
        }
        `);
    });

    it('enable', () => {
        shoot(
            `
            let shouldBeUntouched = true;
        `,
            { enable: false }
        );

        shoot(
            `
            // @introscope-config "enable": false
            let shouldBeUntouched = true;
        `,
            { enable: true }
        );

        shoot(
            `
            // @introscope-config "enable": true
            let shouldBeTransformed = true;
        `,
            { enable: false }
        );
    });

    it('disable', () => {
        shoot(
            `
            let shouldBeUntouched = true;
        `,
            { disable: true }
        );

        shoot(
            `
            // inline "disable" is ignored, use "enable": false
            // @introscope-config "disable": true
            let shouldBeTransformed = true;
        `
        );

        shoot(
            `
            let shouldBeTransformed = true;
        `
        );
    });
});
