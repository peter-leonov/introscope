# Introscope

A reflection / introspection tool for unit testing ES modules.

```js
// any-module.test.js
import anyModuleScope from './any-module';

test('privateFunction', () => {
    const scope = anyModuleScope({
        PRIVATE_CONSTANT: 123
    });
    expect(scope.privateFunction()).toBe(scope.ANOTHER_PRIVATE_CONSTANT);
});

// any-module.js
// @introscope-config "enable": true

// ...the rest of the module code...
```

## Description

**TL;DR;** no need to export all the functions/constants of your module just for make it testable, Introscope makes it automatically.

Introscope is (mostly) a babel plugin which allows a unit test code look inside an ES module without rewriting the code of the module just for making it testable. Introscope does it by transpiling the module source to a function which exports the full internal scope of a module on the fly. This helps separate how the actual application consumes the module via it's exported API and how it gets tested using Introscope with all functions/variables visible and mockable.

Handy integrations with popular unit testing tools and nice tricks like `Proxy` based wrappers/spies to come soon.

## Usage

Install the babel plugin first:

```sh
yarn add --dev babel-plugin-introscope
# or
npm install --save-dev babel-plugin-introscope
```

Add it to the project's babel configuration (most likely `.babelrc`):

```json
{
    "plugins": ["introscope"]
}
```

add a magic comment to the module you're testing:

```js
// @introscope-config "enable": true
```

and use it in tests:

```js
import scopeFactory from './tested-module';

// or

const scopeFactory = require('./tested-module');
```

Just in case, this plugin does something only if `NODE_ENV` equals to `'test'`.

Introscope supports all the new ES features (if not, create an issue 🙏), so if your babel configuration supports some new fancy syntax, Introscope should too.

## Example

What Introscope does is it wraps a whole module code in a function that accepts one argument `scope` object and returns all variables, functions and classes defined in the module as properties of the `scope` object. Here is a little example. Code like this:

```js
// api.js
import httpGet from 'some-http-library';

const ensureOkStatus = response => {
    if (response.status !== 200) {
        throw new Error('Non OK status');
    }
    return response;
};

export const getTodos = httpGet('/todos').then(ensureOkStatus);
// @introscope-config "enable": true, "ignore": ["Error"]
```

gets transpiled to code like this:

```js
// api.js
import httpGet from 'some-http-library';

module.exports = function(_scope = {}) {
    _scope.httpGet = httpGet;

    const ensureOkStatus = (_scope.ensureOkStatus = response => {
        if (response.status !== 200) {
            throw new Error('Non OK status');
        }
        return response;
    });

    const getTodos = (_scope.getTodos = (0, _scope.httpGet)('/todos').then(
        (0, _scope.ensureOkStatus)
    ));
    return _scope;
};
```

You can play with the transpilation in this [AST explorer example](https://astexplorer.net/#/gist/43715a3277b223b363349129a8741f13/aa91fdf81ae4574491d87385426550c2633b8690).

The resulting code you can then import in your Babel powered test environment and examine like this:

```js
// api.spec.js

import apiScopeFactory from './api.js';
// Introscope exports a factory function for module scope,
// it creates a new module scope on each call,
// so that it's easier to test the code of a module
// with different mocks and spies.

describe('ensureOkStatus', () => {
    it('throws on non 200 status', () => {
        // creates a new unaltered scope
        const scope = apiScopeFactory();

        const errorResponse = { status: 500 };
        expect(() => {
            scope.ensureOkStatus(errorResponse);
        }).toThrowError('Non OK status');
    });
    it('passes response 200 status', () => {
        // creates a new unaltered scope
        const scope = apiScopeFactory();

        const okResponse = { status: 200 };
        expect(scope.ensureOkStatus(okResponse)).toBe(okResponse);
    });
});

describe('getTodos', () => {
    it('calls httpGet() and ensureOkStatus()', async () => {
        // creates a new unaltered scope
        const scope = apiScopeFactory();
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

## Limitation

As far as Introscope requires a magic comment `@introscope-config "enable": true` in every module which gets tested it's currently impossible to require introscoped modules from withing introscoped modules. The better solution is in progress for Jest.

## TODOs

### Usage with flow

If it's ok for you to have `any` type in tests, then just export `introscope` like this:

```js
export { introscope } from 'introscope';
```

The function `introscope` has type `mixed => {[string]: any}`, so a scope created from this function type will have type `any` for every property.

And in case you prefer strict type checking, here is an example on how to make flow getting the correct type for the `introscope` export:

```js
type Introscope<Scope> = ($Shape<Scope>) => Scope;
const scope = {
    constantA,
    functionB
    // other identifiers of your module
};

import { type Introscope, anyScope } from 'introscope';
export const introscope: Introscope<typeof scope> = anyScope;
```

### Imported values in curried functions

Currently, any call to a curried function during the initial call to the module scope factory will remember values from the imports. It's still possible to overcome this by providing an initial value to the `scope` argument with a getter for the desired module import. To be fixed by tooling in `introscope` package, not in the babel plugin.

Example:

```js
import toString from 'lib';

const fmap = fn => x => x.map(fn);
// listToStrings remembers `toString` in `fmap` closure
const listToStrings = fmap(toString);
```

### Importing live binding

Can be in principal supported using a getter on the scope object combined with a closure returning the current value of a live binding. To be implemented once the overall design of unit testing with Introscope becomes clear.

Example:

```js
import { ticksCounter, tick } from 'date';
console.log(ticksCounter); // 0
tick();
console.log(ticksCounter); // 1
```

### Module purity

Implement per module import removal to allow preventing any possible unneeded side effects.

Example:

```js
import 'crazyDropDatabaseModule';
```

Or even worse:

```js
import map from 'lodash';
// map() just maps here
import 'weird-monkey-patch';
// map launches missiles here
```

### Support any test runner environment

Example:

To support simple require-from-a-file semantics the `transformToFile` function will transpile `./module` to `./module-introscoped-3123123` and return the latter.

```js
import { transformToFile } from 'introscope';
const moduleScopeFactory = require(transformToFile('./module'));
```

Or even simpler (but not easier):

```js
import { readFileSync } from 'fs';
import { transform } from 'introscope';
const _module = {};
new Function('module', transform(readFileSync('./module')))(_module);
const moduleScopeFactory = _module.exports;
```

## Nice tricks

Wrap all possible IDs in a test-plan like proxy, mock imported side effects and then just run each function with different input and record how proxies been called and what returned.

## Notes

Based on this documentation and source code:

*   https://astexplorer.net (http://astexplorer.net/#/o5NsNwV46z/1)
*   https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-paths
*   https://babeljs.io/docs/core-packages/babel-types/
*   globals: https://github.com/babel/babel/blob/252ea5a966c1968d8aac21a1a81c6d45173e57dd/packages/babel-helpers/src/index.js#L92
