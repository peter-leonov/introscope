/**
 * This horrible hack does two things:
 * 1. enables babel plugin via global variable to transpile
 * 2. prevents Jest from caching the introscope transpiled code
 *
 * Why not just transpile the file content manually in a test code?
 * Because it breaks a lot of things:
 * 1. Jest will not add the introscoped file to watch mode
 * 2. Jest automatically instruments code for coverage report
 * 3. Jest can be configured to look for modules in non standard way
 * 4. Jest can be configured with additional Babel plugins
 * 5. Flow will not know where to get types from
 * 6. Jump to file will not work in editors
 */

const fs = require('graceful-fs');

const Runtime = require('jest-runtime');

const shouldInstrument = require('jest-runtime/build/should_instrument')
    .default;

// wrapper : real => (...args) => mixed
const wrap = (method, obj, wrapper) => {
    const inner = obj[method];
    obj[method] = wrapper(obj[method]);
    return inner;
};

// wrapper : real => (...args) => mixed
const wrapOnce = (method, obj, wrapper) => {
    const inner = obj[method];
    const outer = wrapper(inner);
    obj[method] = function() {
        obj[method] = inner;
        return outer.apply(this, arguments);
    };
    return inner;
};

wrap(
    'statSync',
    fs,
    inner =>
        function() {
            arguments[0] = String(arguments[0]).replace(/\?.*$/, '');
            return inner.apply(this, arguments);
        }
);

function transform(filename, options, fileSource) {
    let instrument = false;

    // in original code here is the second layer of caching
    if (!options.isCoreModule) {
        instrument = shouldInstrument(filename, options, this._config);
    }

    // here we fight the third layer of caching
    // const originalCache = this._config.cache;
    // jest will not read from the cache
    // this._config.cache = false;
    // const original_getCacheKey = this._getCacheKey;
    // jest will not write to the normal cache
    // this._getCacheKey = () => 'introscope-anti-cache';

    const transformed = this._transformAndBuildScript(
        filename, //.replace(/\?.*$/, ''),
        options,
        instrument,
        fileSource
    );
    // this._getCacheKey = original_getCacheKey;
    // this._config.cache = originalCache;
    return transformed;
}

function introscopeRequire(from, moduleName) {
    // dirty patched copy paste from here:
    //   https://github.com/facebook/jest/blob/23eec748db0de7b6b5fcda28cc51c48ddae16545/packages/jest-runtime/src/index.js#L270
    const realmodulePath = this._resolveModule(
        from.filename,
        moduleName.replace(/\?.*$/, '')
    );
    const modulePath = realmodulePath + '?introscope.js';

    // It's enough to just set it to true
    // but better be sure we are not instrumenting
    // some core module.
    global.introscopePath = modulePath;

    // the first layer of caching
    const localModule = {
        children: [],
        exports: {},
        filename: modulePath,
        id: modulePath,
        loaded: false
    };

    const moduleRegistry = {
        [modulePath]: localModule
    };
    // const transformOriginal = wrapOnce(
    //     'transform',
    //     this._scriptTransformer,
    //     inner => transform
    // );
    this._cacheFS[modulePath] =
        fs.readFileSync(realmodulePath, 'utf8') +
        '\n\n// @introscope-config "enable": true';
    this._execModule(localModule, undefined, moduleRegistry, from);
    // this._scriptTransformer.transform = transformOriginal;
    localModule.loaded = true;
    return moduleRegistry[modulePath].exports;
}

wrap(
    '_createRequireImplementation',
    Runtime.prototype,
    inner =>
        function(from, options) {
            const moduleRequire = inner.apply(this, arguments);
            const moduleRequireIntroscope = introscopeRequire.bind(this, from);

            // route paths ending with `?introscope` to "our" loader
            return new Proxy(moduleRequire, {
                apply(target, thisArg, argumentsList) {
                    const path = argumentsList[0];
                    if (
                        typeof path == 'string' &&
                        path.endsWith('?introscope.js')
                    ) {
                        return moduleRequireIntroscope.apply(
                            thisArg,
                            argumentsList
                        );
                    } else {
                        return moduleRequire.apply(thisArg, argumentsList);
                    }
                }
            });
        }
);

module.exports = require('jest-jasmine2');
