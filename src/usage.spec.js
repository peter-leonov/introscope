import { transform } from 'babel-core'
import plugin from '../plugin'

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
        `)
    })

    it('declarations', () => {
        shoot(`
            let noInitValue;
            for (var forVar = 0; forVar != 0; forVar++);
            let singleInit = 1;
            let doubleInit1 = 1, doubleInit2 = 2;
            var sameDoubleInit = 1, sameDoubleInit = 2;
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
            global3();
            !function(){ return nestedGlobal }();
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
