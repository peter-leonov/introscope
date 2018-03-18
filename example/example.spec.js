// @flow
import { introscope as exampleScope } from './example';

// Introscope exports a factory function for module scope,
// it creates a new module scope on each call,
// so that it's easier to test the code of a module
// with different mocks and spies.

describe('ensureOkStatus', () => {
    it('throws on non 200 status', () => {
        // creates a new unaltered scope
        const scope = exampleScope();

        const errorResponse = { status: 500 };
        expect(() => {
            scope.ensureOkStatus(errorResponse);
        }).toThrow(Error);
    });
    it('passes response 200 status', () => {
        // creates a new unaltered scope
        const scope = exampleScope();

        const okResponse = { status: 200 };
        expect(scope.ensureOkStatus(okResponse)).toBe(okResponse);
    });
});

describe('getTodos', () => {
    it('calls httpGet() and ensureOkStatus()', async () => {
        // creates a new unaltered scope
        const scope = exampleScope();
        // mock the local module functions
        scope.httpGet = jest.fn(() => Promise.resolve({ status: 200 }));
        scope.ensureOkStatus = jest.fn();

        // call with altered environment
        await scope.getTodos();
        expect(scope.httpGet).toBeCalled();
        expect(scope.ensureOkStatus).toBeCalled();
    });
});
