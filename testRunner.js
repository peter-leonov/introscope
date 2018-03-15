const Runtime = require('jest-runtime');

const shouldInstrument = require('jest-runtime/build/should_instrument')
    .default;

// wrapper : real => (...args) => mixed
const wrap = (method, obj, wrapper) => {
    obj[method] = wrapper(obj[method]);
};

wrap('_createRequireImplementation', Runtime.prototype, inner => function(from, options) {
    const moduleRequire = inner.apply(this, arguments);
    moduleRequire.introscope = moduleName => {
        // dirty copy paste from here:
        //   https://github.com/facebook/jest/blob/23eec748db0de7b6b5fcda28cc51c48ddae16545/packages/jest-runtime/src/index.js#L270
        const modulePath = this._resolveModule(from.filename, moduleName);

        const localModule = {
            children: [],
            exports: {},
            filename: modulePath,
            id: modulePath,
            loaded: false
        };
        global.introscopePath = modulePath;
        const moduleRegistry = {
            [modulePath]: localModule
        };
        const transform = this._scriptTransformer.transform;
        this._scriptTransformer.transform = function(
            filename,
            options,
            fileSource
        ) {
            this.transform = transform;

            let instrument = false;

            if (!options.isCoreModule) {
                instrument = shouldInstrument(filename, options, this._config);
            }

            return this._transformAndBuildScript(
                filename,
                options,
                instrument,
                fileSource
            );
        };
        this._execModule(localModule, undefined, moduleRegistry, from);
        this._scriptTransformer.transform = transform;
        localModule.loaded = true;
        return moduleRegistry[modulePath].exports;
    };
    // console.log(method, moduleName);
    return moduleRequire;
};

module.exports = require('jest-jasmine2');
