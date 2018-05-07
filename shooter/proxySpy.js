const { cloneDeepWith } = require('lodash');

const spiesRegistry = new WeakMap();

const putToRegistry = (id, spy) => {
    spiesRegistry.set(spy, id);
    return spy;
};

const getSpyName = spy => spiesRegistry.get(spy);

const isSerializedSpy = Symbol('isSerializedSpy');

const serializeWithSpies = v =>
    cloneDeepWith(v, function(value) {
        const spyName = getSpyName(value);
        if (spyName !== undefined) {
            return { [isSerializedSpy]: true, spyName };
        }
    });

const spySnapshotSerializer = {
    test: val => val[isSerializedSpy],
    print: val => `[Spy ${val.spyName}]`
};

if (global.expect && global.expect.addSnapshotSerializer) {
    global.expect.addSnapshotSerializer(spySnapshotSerializer);
}

const proxySpyFactory = ({ serialize }) => (log, id, v) =>
    putToRegistry(
        id,
        new Proxy(v, {
            apply(_, that, args) {
                if (that === undefined) {
                    log(['call', id, serialize(args)]);
                } else {
                    log(['method', id, serialize(that), serialize(args)]);
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
            }
        })
    );

const proxySpy = proxySpyFactory({ serialize: serializeWithSpies });

module.exports = {
    serializeWithSpies,
    spySnapshotSerializer,
    proxySpyFactory,
    proxySpy,
    getSpyName
};
