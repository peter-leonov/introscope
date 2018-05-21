const { cloneDeepWith } = require('lodash');

const spiesRegistry = new WeakMap();

const putToRegistry = (id, spy) => {
    spiesRegistry.set(spy, id);
    return spy;
};

const getSpyName = spy => spiesRegistry.get(spy);

const serializedSpiesRegistry = new WeakMap();

const isSerializedSpy = sspy => serializedSpiesRegistry.has(sspy);

const newSerializedSpy = spyName => {
    const sspy = { spyName };
    serializedSpiesRegistry.set(sspy, spyName);
    return sspy;
};

const serializeWithSpies = v =>
    cloneDeepWith(v, function(value) {
        const spyName = getSpyName(value);
        if (spyName !== undefined) {
            return newSerializedSpy(spyName);
        }
    });

const proxySpyFactory = ({ serialize }) => (log, id, v) =>
    putToRegistry(
        id,
        new Proxy(v, {
            apply(_, that, args) {
                if (that === undefined) {
                    log(['call', id, serialize(args)]);
                } else {
                    log(['apply', id, serialize(that), serialize(args)]);
                }
                return Reflect.apply(...arguments);
            },
            get(_, prop) {
                log(['get', id, prop]);
                return Reflect.get(...arguments);
            },
            set(_, prop, value) {
                log(['set', id, prop, serialize(value)]);
                return Reflect.set(...arguments);
            },
        }),
    );

const proxySpy = proxySpyFactory({ serialize: serializeWithSpies });

module.exports = {
    serializeWithSpies,
    isSerializedSpy,
    proxySpyFactory,
    proxySpy,
    getSpyName,
    newSerializedSpy,
};
