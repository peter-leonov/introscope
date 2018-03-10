# Introscope

A reflection / introspection tool for unit testing ES modules.

Introscope's babel plugin helps breaking the perfect code encapsulation of modules when the modules need to be tested by transpiling the module source to a function which exports the full internal scope of a module.

Handy tooling like `Proxy` based wrappers/spies, dependency injection, etc to come soon.

## Example

What Introscope does is it wraps a whole module code in a function that accepts one argument `scope` object and returns all variables, functions and classes defined in the module as properties of the `scope` object. Here is a little example. Code like this:

```javascript
// api.js
import httpGet from 'some-http-library';

const ensureOkStatus = response => {
    if (response.status !== 200) {
        throw 'Non OK status';
    }
    return response;
};

export const getTodos = httpGet('/todos').then(ensureOkStatus);
```

gets transpiled to code like this:

```javascript
// api.js
import httpGet from 'some-http-library';

module.exports = function(_scope = {}) {
    _scope.httpGet = httpGet;
    const ensureOkStatus = (_scope.ensureOkStatus = response => {
        if (response.status !== 200) {
            throw 'Non OK status';
        }
        return response;
    });
    const getTodos = (_scope.getTodos = (0, _scope.httpGet)('/todos').then(
        (0, _scope.ensureOkStatus)
    ));
    return _scope;
};
```

You can play with the transpilation in this [AST explorer example](https://astexplorer.net/#/gist/74becf4d81c563440fa9046a3c7fb1af/93068b37fa60fd1085726b2c53915f3f82b85830).

The resulting code you can then import in your Babel powered test environment and examine like this:

```javascript
// api.spec.js

// @introscope-next-line
import introscope from './api.js';
// introscope() is a factory function for module scope,
// it creates a new module scope on each call,
// so that it's easier to test the code of a module
// with different mocks and spies.

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
```

## Usage

    import scope from './filter';

    test('filter against', () => {
        // provide imported functions/values mocks
        const foo = scope({map: mapMock, get: getMock});
        //
        const filter = foo({})
    });

In case this plugin find it's way to production build configuration it will not touch any code if `NODE_ENV`/`BABEL_ENV` equals `'production'`.

## Limitations by design

### Curried functions

Currently, any curried functions created during the initial call to the module scope factory will remember values from the imports. It's still possible to overcome this by providing an initial value to the `scope` argument with a getter for the desired module import. To be fixed by tooling in `introscope` package, not in the babel plugin.

### Importing dynamic module binding

Is not supported right now, but can be implemented using a getter on the scope object. To be implemented once the overall design of unit testing with Introscope becomes clear.

### Module purity

The main limitation is that the module tested using introscope should be a pure module. This means requiring it makes no side effects. The example module is pure:

    import dropDatabase from 'api'
    // this module never calls dropDatabase() itself
    export function safeDropDatabase(password) {
        if (password == '123456')
            dropDatabase();
    }

and the following is not:

    import dropDatabase from 'api'
    // this module calls dropDatabase() each time it gets imported
    if (process.env.node_env == 'test') {
        dropDatabase();
    }

This limitation is easy to avoid putting all the side effects code in an exported function and call it outside of the module in the application code. Anyway, ES6 modules expected to be pure, so making a module testable using Introscope is just another good reason to make all your modules pure.

### Pure imports

Ignored imports are pure. This is an example of an impure import:

    import map from 'lodash'
    // map just maps here
    import 'magic-hack'
    // map launches missles here

In this case both imports should be ignored as `lodash` and `magic-hack` are dependent modules and form a unit together.

In case only some of the imported values has to be ignored ignore them like this:

    // @introscope ignore: ['loadItems']
    import { loadItems, saveItems } from 'api'
    // here `loadItems` comes from 'api' module
    // and `saveItems` comes from a test

### Constant testees

Introscope will warn you if the testee variable is not constant

## Nice tricks

Wrap all possible IDs in a test-plan like proxy, mock imported side effects and then just run each funtion with different input and record how proxies been called and what returned.

In case of a dynamic import value ([bindings](http://2ality.com/2015/07/es6-module-exports.html)) like `ticksCounter` here:

    import { ticksCounter, tick } from 'date'
    console.log(ticksCounter) // 0
    tick()
    console.log(ticksCounter) // 1

this import needs to be wrapped in a clojure + `Proxy` to preserve the semantics of ES6 modules.

To use with any node-based test environment:

    import { transformToFile } from 'introscope'
    const scope = require(transformToFile('./module'))

To copy require-from-a-file semantics the `transformToFile` function will transpile `./module` to `./module-introscoped-3123123` and return the latter.

## Notes

Based on

*   https://astexplorer.net (http://astexplorer.net/#/o5NsNwV46z/1)
*   https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-paths
*   https://babeljs.io/docs/core-packages/babel-types/
*   globals: https://github.com/babel/babel/blob/252ea5a966c1968d8aac21a1a81c6d45173e57dd/packages/babel-helpers/src/index.js#L92
