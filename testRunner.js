/**
 * This horrible hack does two things:
 * 1. enables babel plugin by appending "enable": true to content
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

// wrapper : real => (...args) => mixed
const wrap = (method, obj, wrapper) => {
    const inner = obj[method];
    // if (inner.__wrapped_by_introscope)
    //     return
    const wrapped = wrapper(inner);
    // wrapped.__wrapped_by_introscope = inner
    obj[method] = wrapped;
    return inner;
};

// to be monkey patched
const fs = require('graceful-fs');
const Runtime = require('jest-runtime');
const Resolver = require('jest-resolve');

const removeQuery = path => {
    if (typeof path != 'string') return path;
    return path.replace(/\?.*$/, '');
};

wrap(
    'statSync',
    fs,
    inner =>
        function() {
            arguments[0] = removeQuery(arguments[0]);
            return inner.apply(this, arguments);
        }
);

wrap(
    'findNodeModule',
    Resolver,
    inner =>
        function(path) {
            const [clearPath, query] = path.split('?');

            if (!query) {
                return inner.apply(this, arguments);
            } else {
                arguments[0] = clearPath;
                return inner.apply(this, arguments) + '?' + query;
            }
        }
);

wrap(
    'requireModule',
    Runtime.prototype,
    inner =>
        function(from, moduleName) {
            if (
                typeof moduleName == 'string' &&
                moduleName.endsWith('?introscope.js')
            ) {
                const modulePath = this._resolveModule(from, moduleName);

                this._cacheFS[modulePath] =
                    fs.readFileSync(removeQuery(modulePath), 'utf8') +
                    '\n\n// @introscope-config "enable": true';

                const transformer = this._scriptTransformer._getTransformer(
                    modulePath
                );
                wrap(
                    'process',
                    transformer,
                    inner =>
                        function() {
                            // filename
                            arguments[1] = removeQuery(arguments[1]);
                            return inner.apply(this, arguments);
                        }
                );
            }
            return inner.apply(this, arguments);
        }
);

module.exports = require('jest-jasmine2');
