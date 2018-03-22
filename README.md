# Introscope

A reflection / introspection babel plugin for delightful ES modules testing.

```js
// Babel plugin creates `introscope` export on the fly for tests
import { introscope } from './cool-es-module';

test('privateFunction', () => {
    const scope = introscope({
        PRIVATE_CONSTANT: 123
    });
    expect(scope.privateFunction()).toBe(scope.ANOTHER_PRIVATE_CONSTANT);
});
```

## Description

**TL;DR;** no need to export all the functions/variables of your module just to make it testable, Introscope does it automatically.

Introscope is (mostly) a babel plugin which allows a unit test code look inside an ES module without rewriting the code of the module. Introscope does it by transpiling the module source to a function which exposes the full internal scope of a module on the fly. This helps separate how the actual application consumes the module via it's exported API and how it gets tested using Introscope with all functions/variables visible, mockable and spy-able.

It has Handy [integration with Jest](#usage). Support for more popular unit testing tools and nice tricks like `Proxy` based wrappers/spies to come soon.

## Usage

Install:

```sh
yarn add --dev introscope
# or
npm install --save-dev introscope
```

Add the babel plugin to the project's babel configuration (most likely `.babelrc`):

```json
{
    "plugins": ["introscope/babel-plugin"]
}
```

and for easy integration with Jest modify it's configuration (most likely `jest.config.js`):

```js
module.exports = {
    // this makes the `?introscope` suffix work
    testRunner: 'introscope/testRunner'
};
```

Done! Start using Introscope in tests:

```js
import { introscope } from './tested-module';

// or using common modules (note the `?introscope` suffix)
const { introscope } = require('./tested-module?introscope');
```

For safety reasons this plugin does anything only when `NODE_ENV` equals to `'test'`, in production or development it's a no-op.

Introscope supports all the new ES features (if not, [create an issue](https://github.com/peter-leonov/introscope/issues) 🙏). That means, if Babel supports some new fancy syntax, Introscope should too.

## Example

What Introscope does is it just wraps a whole module code in a function that accepts one object argument `scope` and returns it with all module internals (variables, functions, classes and imports) exposed as properties. Here is a little example, a module like this one:

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
// @introscope "enable": true, "ignore": ["Error"]
```

gets transpiled on the fly to a module like this:

```js
// api.js
import httpGet from 'some-http-library';

export const introscope = function(_scope = {}) {
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

You can play with the transpilation in this [AST explorer example](https://astexplorer.net/#/gist/eae4a1db26c203390763fd5d1b6ed67a/5afa750c98ca6f775d2b4562f1c837f959f7108a).

The resulting code you can then import in your Babel powered test environment and examine like this:

```js
// api.spec.js

import { introscope as apiScope } from './api.js';
// Introscope exports a factory function for module scope,
// it creates a new module scope on each call,
// so that it's easier to test the code of a module
// with different mocks and spies.

describe('ensureOkStatus', () => {
    it('throws on non 200 status', () => {
        // creates a new unaltered scope
        const scope = apiScope();

        const errorResponse = { status: 500 };
        expect(() => {
            scope.ensureOkStatus(errorResponse);
        }).toThrowError('Non OK status');
    });
    it('passes response 200 status', () => {
        // creates a new unaltered scope
        const scope = apiScope();

        const okResponse = { status: 200 };
        expect(scope.ensureOkStatus(okResponse)).toBe(okResponse);
    });
});

describe('getTodos', () => {
    it('calls httpGet() and ensureOkStatus()', async () => {
        // creates a new unaltered scope
        const scope = apiScope();
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

### Usage with Flow

If it's ok for you to have `any` type in tests, then just export `introscope` from the tested module like this:

```js
export { introscope } from 'introscope';
```

The function `introscope` has type `{[string]: any} => {[string]: any}`, so a scope created from this function will give type `any` for any property.

And in case you prefer strict type checking, here is an example on how to make flow getting the correct type for the `introscope` export:

```js
import { scope } from 'introscope';
export const introscope = scope({
    constantA,
    functionB
    // other identifiers of your module
});
```

If your project ignores `node_modules` with this config line:

`flow check` will error out with message like this:

```
Error--------------example.js:15:23
Cannot resolve module introscope.
```

there are two solutions:

1.  use [flow-typed](https://github.com/flowtype/flow-typed)

```sh
yarn add -D flow-typed
yarn flow-typed install introscope@1.0.10
```

2.  just add this line to `.flowconfig` `[libs]` section:

```ini
[libs]
node_modules/introscope/flow-typed
```

## TODOs

### Usage without Jest

Add option to ignore `import { introscope } …` and rely only on magic comments.

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
