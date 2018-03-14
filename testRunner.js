const Runtime = require('jest-runtime');

const method = '_createRequireImplementation';

Runtime.prototype[method + '_real'] = Runtime.prototype[method];
Runtime.prototype[method] = function(from, options) {
    const moduleRequire = this[method + '_real'].apply(this, arguments);
    moduleRequire.myRequire = moduleName => {
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

        const moduleRegistry = {
            [modulePath]: localModule
        };
        this._execModule(localModule, undefined, moduleRegistry, from);
        localModule.loaded = true;
        return moduleRegistry[modulePath].exports;
    };
    // console.log(method, moduleName);
    return moduleRequire;
};

module.exports = require('jest-jasmine2');
