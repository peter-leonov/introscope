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

                        const recorder = logger.recorder || {};

                        if (recorder.playback) {
                            if (recorder.results.length === 0) {
                                throw new Error(
                                    `not enough stored results for mock with name "${id}"`,
                                );
                            } else {
                                const result = recorder.results.shift();
                                if (result[0] !== id) {
                                    throw new Error(
                                        `mismatching call order, wrong call with name "${
                                            result[0]
                                        }" for mock with name "${id}"`,
                                    );
                                }
                                return deep('call', result[1]);
                            }
                        }

                        const result = Reflect.apply(...arguments);
                        if (recorder.recording) {
                            recorder.results.push([id, result]);
                        }

                        return deep('call', result);
                    } else {
                        logger(['apply', id, serialize(that), serialize(args)]);

                        const recorder = logger.recorder || {};

                        if (recorder.playback) {
                            if (recorder.results.length === 0) {
                                throw new Error(
                                    `not enough stored results for mock with name "${id}"`,
                                );
                            } else {
                                const result = recorder.results.shift();
                                if (result[0] !== id) {
                                    throw new Error(
                                        `mismatching call order, wrong call with name "${
                                            result[0]
                                        }" for mock with name "${id}"`,
                                    );
                                }
                                return deep('apply', result[1]);
                            }
                        }

                        const result = Reflect.apply(...arguments);
                        if (recorder.recording) {
                            recorder.results.push([id, result]);
                        }

                        return deep('apply', result);
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
