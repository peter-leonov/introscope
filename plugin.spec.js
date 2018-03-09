import { transform } from 'babel-core'
import plugin from './plugin'

const shoot = code =>
    expect(
        transform(code, {
            plugins: [plugin]
        }).code
    ).toMatchSnapshot()

describe('plugin', () => {
    it('import', () => {
        shoot(`
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
        `)
    })

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
            !{ x }
        `)
    })

    it('declarations', () => {
        shoot(`
            let noInitValue;
            for (var forVar = 0; forVar != 0; forVar++);
            let singleInit = 1;
            let doubleInit1 = 1, doubleInit2 = 2;
            var sameDoubleInit = 1, sameDoubleInit = 2;

            let { singleDestructing } = 1
            let { objectDestruction1, objectDestruction2, nestedProperty: { objectNestedDestruction1 } } = { objectDestruction1, objectDestruction2, nestedProperty: { objectNestedDestruction1 } }, let2 = objectDestruction1;
            // let { ...objectRest } = 1;
            let [ arrayDestruction1, arrayDestruction2, [ arrayNestedDestruction ] ] = 1;
            //let [ ...arrayRest ] ] = 1;


            class ClassName {}; new ClassName();
            functionName(); function functionName () {}
        `)
    })

    it('scopes', () => {
        shoot(`
            let x = true;
            for (let x = 0; x != 0; x++);
            { let x = false; }
            !function(){ var x = false; }
        `)
    })

    it('globals', () => {
        shoot(`
            let x = global1;
            global2 = 1;
            global2 = 1;
            globalFunction();
            !function(){ return [nestedGlobal1, global2] }();
        `)
    })

    it('export', () => {
        shoot(`
            let defaultExport, toBeNameExport1, toBeNameExport2;
            export default defaultExport;
            export const namedSingleExport = 'namedSingleExportValue'
            export { toBeNameExport1, toBeNameExport2 }
            export * from 'some-module'
        `)
    })
})

describe('options', () => {
    it('removeImport', () => {
        shoot(`
            // @introscope removeImports: ['defaultImport1', 'singleNamedImport1', 'namedImport1', 'namedImport2', 'localImportName1', 'namespaceImport1']
            import defaultImport1 from 'some-module1'
            import defaultImport2 from 'some-module2'
            import { singleNamedImport1 } from 'some-module2'
            import { singleNamedImport2 } from 'some-module3'
            import { namedImport1, namedImport2 } from 'some-module4'
            import { namedImport3, namedImport4 } from 'some-module5'
            import { originalImportName1 as localImportName1 } from 'some-module6'
            import { originalImportName2 as localImportName2 } from 'some-module7'
            import * as namespaceImport1 from 'some-module8'
            import * as namespaceImport2 from 'some-module9'

            [
                defaultImport1,
                defaultImport2,
                singleNamedImport1,
                singleNamedImport2,
                namedImport1,
                namedImport2,
                namedImport3,
                namedImport4,
                localImportName1,
                localImportName2,
                namespaceImport1,
                namespaceImport2
             ]
        `)
    })
})
