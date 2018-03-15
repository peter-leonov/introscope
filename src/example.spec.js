// import introscope from './example?bloblo';

const introscope = require.introscope('./example');

// Introscope exports a factory function for module scope,
// it creates a new module scope on each call,
// so that it's easier to test the code of a module
// with different mocks and spies.

describe('require', () => {
    it('still works', () => {
        expect(require('./example').getTodos).toBeInstanceOf(Function);
    });
});

describe('ensureOkStatus', () => {
    it('throws on non 200 status', () => {
        // creates a new unaltered scope
        const scope = introscope();

        const errorResponse = { status: 500 };
        expect(() => {
            scope.ensureOkStatus(errorResponse);
        }).toThrowError('Non OK status');
    });
    it('passes response 200 status', () => {
        // creates a new unaltered scope
        const scope = introscope();

        const okResponse = { status: 200 };
        expect(scope.ensureOkStatus(okResponse)).toBe(okResponse);
    });
});

describe('getTodos', () => {
    it('calls httpGet() and ensureOkStatus()', async () => {
        // creates a new unaltered scope
        const scope = introscope();
        // mock the local module functions
        scope.httpGet = jest.fn(() => Promise.resolve());
        scope.ensureOkStatus = jest.fn();

        // call with altered environment
        await scope.getTodos();
        expect(scope.httpGet).toBeCalled();
        expect(scope.ensureOkStatus).toBeCalled();
    });
});
