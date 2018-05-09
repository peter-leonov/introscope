# Introscope

A reflection (aka, monkey-patching) babel plugin for delightful unit testing of modern ES6 modules. It allows you to override imports, locals, globals and built-ins (like `Date` or `Math`) independently for each unit test by turning your nice ES6 module in a factory function on the fly.

```js
// increment.js
const INCREMENT_BY = 1;
const increment = v => v + INCREMENT_BY;

// increment.spec.js
import { introscope } from './increment.js';

test('increment', () => {
    const scope = introscope();
    expect(scope.increment(1)).toBe(2);

    scope.INCREMENT_BY = 1000;
    expect(scope.increment(1)).toBe(1001);
});
```

## Description

**TL;DR;** no need to export all the functions/variables of your module just to make it testable, Introscope does it automatically by changing the module source on the fly in testing environment.

Introscope is (mostly) a babel plugin which allows a unit test code look inside an ES module without rewriting the code of the module. Introscope does it by transpiling the module source to a (factory) function which exposes the full internal scope of a module on the fly. This helps separate how the actual application consumes the module via it's exported API and how it gets tested using Introscope with all functions/variables visible, mockable and spy-able.

It has handy [integration with Jest](#usage) and [Proxy based robust spies](#effectslogger). Support for more popular unit testing tools to come soon.

## Usage

Introscope works best with Jest but other frameworks can utilise Introscope with [magic comments](#magic-comments).

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
    testRunner: 'introscope/testRunner',
};
```

Done! Start using Introscope in tests:

```js
import { introscope } from './tested-module';

// or using common modules (note the `?introscope` suffix)
const { introscope } = require('./tested-module?introscope');
```

For safety reasons this plugin does anything only when `NODE_ENV` equals to `'test'`. In production or development it's a no-op.

Introscope supports all the new ES features including type annotations (if not, [create an issue](https://github.com/peter-leonov/introscope/issues) 🙏). That means, if Babel supports some new fancy syntax, Introscope should do too.

## Example

What Introscope does is just wraping a whole module code in a function that accepts one object argument `scope` and returns it with all module internals (variables, functions, classes and imports) exposed as properties. Here is a little example, a module like this one:

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
        (0, _scope.ensureOkStatus),
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
        // apiScope() creates a new unaltered scope
        const { ensureOkStatus } = apiScope();

        expect(() => {
            ensureOkStatus({ status: 500 });
        }).toThrowError('Non OK status');
    });
    it('passes response 200 status', () => {
        // apiScope() creates a new unaltered scope
        const { ensureOkStatus } = apiScope();

        expect(ensureOkStatus({ status: 200 })).toBe(okResponse);
    });
});

describe('getTodos', () => {
    it('calls httpGet() and ensureOkStatus()', async () => {
        // here we save scope to a variable to tweak it
        const scope = apiScope();
        // mock the local module functions
        // this part can be vastly automated, see EffectsLogger below
        scope.httpGet = jest.fn(() => Promise.resolve());
        scope.ensureOkStatus = jest.fn();

        // call with altered environment
        await scope.getTodos();
        expect(scope.httpGet).toBeCalled();
        expect(scope.ensureOkStatus).toBeCalled();
    });
});
```

## EffectsLogger

_This module saves 90% of time you spend writing boiler plate code in tests._

EffectsLogger is a nice helping tool which utilises the power of module scope introspection for side effects logging and DI mocking. It reduces the repetitive code in tests by auto mocking simple side effects and logging inputs and outputs of the tested function with support of a nicely looking custom Jest Snapshot serializer.

Example:

```js
// todo.js
const log = (...args) => console.log(...args);
let count = 0;
const newTodo = (id, title) => {
    log('new todo created', id);
    return {
        id,
        title,
    };
};
const addTodo = title => newTodo(++count, title);

// todo.spec.js
import { introscope } from './increment.js';
import { effectsLogger, SPY, KEEP } from 'introscope/logger';

// decorate introscope with effectsLogger
const effectsScope = effectsLogger(introscope);

describe('todos', () => {
    it('addTodo', () => {
        const { effects, addTodo } = effectsScope({
            newTodo: SPY,
            addTodo: KEEP,
        });

        addTodo('start using Introscope :)');

        expect(effects()).toMatchSnapshot();
        /*
        EffectsLog [
          module.count =
            1,
          newTodo(
            1,
            "start using Introscope :)",
          ),
          log(
            "new todo created",
            1,
          ),
        ]
        */
    });
});
```

How it works? It iterates over all the symbols (functions, locals, globals) in the scope returned by `introscope()` and for each function creates an empty mock. With symbols marked with `KEEP` it does nothing and for symbols marked as `SPY` it wraps them. All the mocks write to the same side effects log (plain array, btw) wchi then can be inspected manually or, better, sent to Jest's `expect().matchSnaphot()`. There is a custom serializer available to make log snapshots more readable.

## Usage with Flow

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
    functionB,
    // other identifiers of your module
});
```

If your project ignores `node_modules` with config like this:

```ini
[ignore]
.*/node_modules/.*
```

`flow check` will error out with such message:

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

## Usage with other frameworks

To disable appending `?introscope` to introscope imports add this babel plugin option: `instrumentImports: false`.

## Magic comments

It's a very familiar concept from Flow, ESLint, etc.

Introscope can be configured using babel plugin config and / or magic comments. Here is the example of a magic comment:

```js
// @introscope "enable": true, "removeImports": true
```

It's just a comment with leading `@introscope` substring followed by a JSON object body (without wrapping curly braces). Here is a list of avalable configuration options:

*   `enable = true | false`: per file enable / disable transpilation; if `enable` equals `false` Introscope will only parse magic comments and stop, so it's quite a good tool for performance optimisation on super large files;
*   `removeImports = true | false`: instucts introscope to remove all import diretives though keeping the local scope variables for the imports so a test can mock them;
*   `ignore = [id1, id2, id3...]`: a list of IDs (functions, variables, imports) introscope should not touch; this means if there was a local constant variable with name `foo` and the magic comment has `ignore: ['foo']` than Introscope will not transform this variable to a scope property and the test could not change or mock the value; this is useful for such globals like `Date`, `Math`, `Array` as testers normally do not care of those.

## Babel plugin options

*   `disable = true | false`: disables plugin completely, useful in complex `.babelrc.js` configurations to make sure Introscope does not alter a build for some very specific environment;

## TODOs

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

## License

MIT
