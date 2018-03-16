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

function transform(filename, options, fileSource) {
    let instrument = false;

    // in original code here is the second layer of caching
    if (!options.isCoreModule) {
        instrument = shouldInstrument(filename, options, this._config);
    }

    // here we fight the third layer of caching
    const originalCache = this._config.cache;
    // jest will not read from the cache
    this._config.cache = false;
    const original_getCacheKey = this._getCacheKey;
    // jest will not write to the cache
    this._getCacheKey = () => 'introscope-anti-cache';
    const transformed = this._transformAndBuildScript(
        filename,
        options,
        instrument,
        fileSource
    );
    this._getCacheKey = original_getCacheKey;
    this._config.cache = originalCache;
    return transformed;
}

function introscopeRequire(from, moduleName) {
    // dirty copy paste from here:
    //   https://github.com/facebook/jest/blob/23eec748db0de7b6b5fcda28cc51c48ddae16545/packages/jest-runtime/src/index.js#L270
    const modulePath = this._resolveModule(from.filename, moduleName);

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
    const transformOriginal = wrapOnce(
        'transform',
        this._scriptTransformer,
        inner => transform
    );
    this._execModule(localModule, undefined, moduleRegistry, from);
    this._scriptTransformer.transform = transformOriginal;
    localModule.loaded = true;
    return moduleRegistry[modulePath].exports;
}

wrap(
    '_createRequireImplementation',
    Runtime.prototype,
    inner =>
        function(from, options) {
            const moduleRequire = inner.apply(this, arguments);
            moduleRequire.introscope = introscopeRequire.bind(this, from);
            // console.log(method, moduleName);
            return moduleRequire;
        }
);

module.exports = require('jest-jasmine2');
