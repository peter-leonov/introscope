# Introscope

A reflection (aka, monkey-patching) babel plugin and a set of tools for delightful unit testing of modern ES6 modules. It allows you to override imports, locals, globals and built-ins (like `Date` or `Math`) independently for each unit test by instrumenting your ES6 modules on the fly.

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

## What so special?

Intoscope is yet another mocking tool, but with much higher level of control, isolation and performance:

-   easily test any stateful module: on every run you get a fresh module scope;
-   test faster with a fresh module in each test: no need to reset mocks, spies, logs, etc;
-   faster module loading: remove or mock any heavy import on the fly;
-   intercept any top level variable definition: crucial for higher order functions;
-   spy or mock with any tool: `introscope()` returns a plain JS object;
-   easy to use: optimized for Jest and provides well fitting tooling;
-   type safe: full support for Flow in your tests;
-   simple to hack: just compose the factory function with you plugin.

See what Introscope does in [playground](https://astexplorer.net/#/gist/cddaef7ef9db928352f79ce3612aef77/4d6f06a3db399425b3b98bdf2fc142a12e06ba0d).

## Known issues

Please, see a short ☺️ list here: [issues labeled as bug](https://github.com/peter-leonov/introscope/labels/bug)

## Description

**TL;DR;** no need to export all the functions/variables of your module just to make it testable, Introscope does it automatically by changing the module source on the fly in testing environment.

Introscope is (mostly) a babel plugin which allows a unit test code look inside an ES module without rewriting the code of the module. Introscope does it by transpiling the module source to a factory function which exposes the full internal scope of a module on the fly. This helps separate how the actual application consumes the module via it's exported API and how it gets tested using Introscope with all functions/variables visible, mockable and spy-able.

It has handy [integration with Jest](#usage) (tested with v22.4.3 and v23.1.0) and [Proxy based robust spies](#effectslogger). Support for more popular unit testing tools to come soon.

## Usage

Introscope works best with Jest but other frameworks can utilise Introscope with [magic comments](#magic-comments).

Install:

```sh
yarn add -D introscope
# or
npm install -D introscope
```

Add the babel plugin to the project's babel configuration (most likely `.babelrc`):

```json
{
    // presets get run after plugins, and it's ok as introscope
    // understands all the new fancy stuff enabled in these presets
    "presets": ["react", "es2015", "stage-3"],
    "plugins": [
        // ...here go all other plugins...
        // Please, try to keep Introscope's plugin the last one
        // so that it's harsh transformations do not affect others.
        "introscope/babel-plugin"
    ]
}
```

and for easy integration with Jest modify it's configuration (most likely `jest.config.js`):

```js
module.exports = {
    // this makes babel plugin know which file to transform
    testRunner: 'introscope/testRunner',
};
```

Done! Start using Introscope in tests:

```js
import { introscope } from './tested-module';

// or using common modules (note the `?introscope` suffix)
const { introscope } = require('./tested-module?introscope');
```

For safety reasons this plugin does nothing in non test environments, e.g. in production or development environment it's a no-op. Jest sets `NODE_ENV` to `'test'` automatically. Please, see your favirite test runner docs for more.

Introscope supports all the new ES features including type annotations (if not, [create an issue](https://github.com/peter-leonov/introscope/issues/new) 🙏). That means, if Babel supports some new fancy syntax, Introscope should do too.

## Detailed example

What Introscope does is just wraping a whole module code in a function that accepts one object argument `scope` and returns it with all module internals (variables, functions, classes and imports) exposed as properties. Here is a little example. Introscope takes module like this:

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
```

and transpiles it's code on the fly to this (comments added manually):

```js
// api.js
import httpGet from 'some-http-library';

// wrapps all the module source in a single "factory" function
export const introscope = function(_scope = {}) {
    // assigns all imports to a `scope` object
    _scope.httpGet = httpGet;

    // also assigns all locals to the `scope` object
    const ensureOkStatus = (_scope.ensureOkStatus = response => {
        if (response.status !== 200) {
            // built-ins are ignored by default (as `Error` here),
            // but can be configured to be also transpiled
            throw new Error('Non OK status');
        }
        return response;
    });

    // all the accesses to locals get transpiled
    // to property accesses on the `scope` object
    const getTodos = (_scope.getTodos = (0, _scope.httpGet)('/todos').then(
        (0, _scope.ensureOkStatus),
    ));

    // return the new frehly created module scope
    return _scope;
};
```

You can play with the transpilation in this [AST explorer example](https://astexplorer.net/#/gist/eae4a1db26c203390763fd5d1b6ed67a/1871cd4a95586981142e4463e9092999014b9f38).

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
        // this part can be vastly automated, see Effects Logger below
        scope.httpGet = jest.fn(() => Promise.resolve());
        scope.ensureOkStatus = jest.fn();

        // call with altered environment
        await scope.getTodos();
        expect(scope.httpGet).toBeCalled();
        expect(scope.ensureOkStatus).toBeCalled();
    });
});
```

## Effects Logger

_This module saves 90% of time you spend writing boiler plate code in tests._

Effects Logger is a nice helping tool which utilises the power of module scope introspection for side effects logging and DI mocking. It reduces the repetitive code in tests by auto mocking simple side effects and logging inputs and outputs of the tested function with support of a nicely looking custom Jest Snapshot serializer.

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
const addTodo = (title, cb) => {
    cb(newTodo(++count, title));
};

// todo.spec.js
import { introscope } from './increment.js';
import { effectsLogger, SPY, KEEP } from 'introscope/logger';

// decorate introscope with effectsLogger
const effectsScope = effectsLogger(introscope);

describe('todos', () => {
    it('addTodo', () => {
        const {
            scope: { addTodo },
            effects,
            m,
        } = effectsScope({
            newTodo: SPY,
            addTodo: KEEP,
        });

        // `m.cb()` creates and spies on a mock function with name `cb`
        addTodo('start use Introscope :)', m.cb());

        expect(effects()).toMatchSnapshot();
        /*
        EffectsLog [
          module.count =
            1,
          newTodo(
            1,
            "start use Introscope :)",
          ),
          log(
            "new todo created",
            1,
          ),
          cb(
            "new todo created",
            {
                id: 1,
                title: "start use Introscope :)",
            },
          ),
        ]
        */
    });
});
```

How it works? It iterates over all the symbols (functions, locals, globals) in the scope returned by `introscope()` and for each function creates an empty mock. With symbols marked with `KEEP` it does nothing and for symbols marked as `SPY` it wraps them. All the mocks write to the same side effects log (plain array, btw) wchi then can be inspected manually or, better, sent to Jest's `expect().matchSnaphot()`. There is a custom serializer available to make log snapshots more readable.

## Usage with React

JSX syntax is supported natively. No need for any additional configuration.

## Usage with Flow

### Configure Babel

For Introscope to work correctly it needs Flow type annotaions to be stripped, as we normally do to run code in node. To do so just put `syntax-flow` and `transform-flow-strip-types` plugins before `introscope/babel-plugin`:

```js
{
    "plugins": [
        "syntax-flow",
        "transform-flow-strip-types",
        "introscope/babel-plugin"
    ]
}
```

Same should work for TypeScript once Babel 7 comes out.

### Type safe tests

Firstly, if you just want to shut up Flow and it's ok for you to have `any` type in tests, then just export `introscope` from the tested module like this:

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

-   `enable = true | false`: per file enable / disable transpilation; if `enable` equals `false` Introscope will only parse magic comments and stop, so it's quite a good tool for performance optimisation on super large files;
-   `removeImports = true | false`: instucts introscope to remove all import diretives though keeping the local scope variables for the imports so a test can mock them;
-   `ignore = [id1, id2, id3...]`: a list of IDs (functions, variables, imports) introscope should not touch; this means if there was a local constant variable with name `foo` and the magic comment has `ignore: ['foo']` than Introscope will not transform this variable to a scope property and the test could not change or mock the value; this is default for such globals like `Date`, `Math`, `Array` as testers normally do not care of those, but can be overritten with `-` prefix: `// @introscope "ignore": ["-Date"]`, this will remove `Date` from ignore list and make it avalable for mocking/spying.

## Babel plugin options

-   `disable = true | false`: disables plugin completely, useful in complex `.babelrc.js` configurations to make sure Introscope does not alter a build for some very specific environment;

## FAQ

### Is performance good?

Yes. The babel plugin does use only one additional traverse. All the variables look up logic is done by Babel parser for free at compile time.

### Why adding [jest runner](https://github.com/peter-leonov/introscope/blob/master/testRunner.js)?

Because by manual transpiling code in a unit test we break a lot of things:

1.  Jest will not add the introscoped file to watch mode
2.  Jest automatically instruments code for coverage report
3.  Jest can be configured to look for modules in non standard way
4.  Jest can be configured with additional Babel plugins
5.  Flow will not know where to get types from
6.  Jump to file will not work in editors

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

### Learn from these masters:

https://github.com/babel/babel/blob/6.x/packages/babel-plugin-transform-es2015-modules-commonjs/src/index.js
https://github.com/speedskater/babel-plugin-rewire/blob/master/src/babel-plugin-rewire.js

## Prior art

-   Built-in per file mocking in [Jest](https://facebook.github.io/jest/docs/en/manual-mocks.html).
-   File based per module mocking for node modules: [rewire](https://github.com/jhnns/rewire).
-   Babel plugin which does closely as Introscope by changing the module variables in-place instead of creating a factory function: [babel-plugin-rewire](https://github.com/speedskater/babel-plugin-rewire).
-   Mock modules in RequireJS: [requirejs-mock](https://github.com/ValeriiVasin/requirejs-mock).

## Changelog

**1.4.2**

-   Require stripping Flow types for stability
-   Support JSX

**1.4.1**

-   Add a full support spying on globals;
-   Test dynamic scopes with getters and setters for even more crazy testing superpowers;
-   Add `global` to default ignores for less surprises.

**1.4.0**

-   Add default action to Action Logger and set it to `KEEP` by default. This helps to just spy on default functions and values by default, and go crazy with setting default to mock only if needed.

-   Fix Flow object property being treated by Babel as an identifier reference leading to parasite global variables.

**1.3.1**

Removed `effects` export with a wrapper object to reduce module namespace pollution.

**1.3.1**

Refactor Spies and auto Mocks in Effects Logger.

**1.2.2**

Add license.

**1.2.1**

Fix the AST Exporer example.

**1.2.0**

Add more default ignores and systax to remove ignores.

**1.1.0**

Added [Effects Logger](#effectslogger) to automate module side effects tracking.
