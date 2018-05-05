const proxySpy = (log, serialize, id, v) =>
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
    });

const plan = ({ log = [], serialize = v => v } = {}) =>
    new Proxy(() => log, {
        get(_, prop) {
            return v =>
                proxySpy(
                    (...args) => log.push(...args),
                    serialize,
                    prop,
                    v || function() {}
                );
        }
    });

module.exports = {
    proxySpy,
    plan
};
