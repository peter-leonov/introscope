const { cloneDeepWith } = require('lodash');

const spiesCache = new WeakMap();
const addToCache = (v, id, spy) => {
    const spiesById = spiesCache.get(v);
    if (spiesById) {
        spiesById.set(id, spy);
    } else {
        const spiesById = new Map();
        spiesById.set(id, spy);
        spiesCache.set(v, spiesById);
    }
};
const getFromCache = (v, id) => {
    const spiesById = spiesCache.get(v);
    if (spiesById) {
        return spiesById.get(id);
    }

    return undefined;
};

const spiesRegistry = new WeakMap();

const putToRegistry = (v, id, spy) => {
    addToCache(v, id, spy);
    spiesRegistry.set(spy, v);
    return spy;
};

const isSpy = spy => spiesRegistry.has(spy);
const getSpyTarget = spy => spiesRegistry.get(spy);

const serializeWithSpies = v =>
    cloneDeepWith(v, value => (isSpy(value) ? getSpyTarget(value) : value));

const isSpyable = v =>
    typeof v == 'function' || (typeof v == 'object' && v !== null);

const proxySpyFactory = ({ serialize }) => {
    const proxySpy = (logger, id, v, conf = { deep: false }) => {
        if (!isSpyable(v)) return v;

        const cached = getFromCache(v, id);
        if (cached) return cached;

        // wrap in a new proxy with the same logger
        const deep = conf.deep
            ? (id2, v) => proxySpy(logger, `${id}.${String(id2)}`, v)
            : (_, v) => v;

        return putToRegistry(
            v,
            id,
            new Proxy(v, {
                apply(_, that, args) {
                    if (that === undefined) {
                        logger(['call', id, serialize(args)]);
                        return deep('call', Reflect.apply(...arguments));
                    } else {
                        logger(['apply', id, serialize(that), serialize(args)]);
                        return deep('apply', Reflect.apply(...arguments));
                    }
                },
                get(_, prop) {
                    logger(['get', id, prop]);
                    return deep(prop, Reflect.get(...arguments));
                },
                set(_, prop, value) {
                    logger(['set', String(id), prop, serialize(value)]);
                    return Reflect.set(...arguments);
                },
            }),
        );
    };
    return proxySpy;
};

const proxySpy = proxySpyFactory({ serialize: serializeWithSpies });

module.exports = {
    serializeWithSpies,
    isSpy,
    getSpyTarget,
    proxySpyFactory,
    proxySpy,
};
