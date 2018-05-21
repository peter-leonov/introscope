const { cloneDeepWith } = require('lodash');

const spiesRegistry = new WeakMap();

const putToRegistry = (spy, target) => {
    spiesRegistry.set(spy, target);
    return spy;
};

const isSpy = spy => spiesRegistry.has(spy);
const getSpyTarget = spy => spiesRegistry.get(spy);

const serializeWithSpies = v =>
    cloneDeepWith(v, value => (isSpy(value) ? getSpyTarget(value) : value));

const isSpialbe = v =>
    typeof v == 'function' || (typeof v == 'object' && v !== null);

const proxySpyFactory = ({ serialize }) => (log, id, v) =>
    isSpialbe(v)
        ? putToRegistry(
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
              v,
          )
        : v;

const proxySpy = proxySpyFactory({ serialize: serializeWithSpies });

module.exports = {
    serializeWithSpies,
    isSpy,
    getSpyTarget,
    proxySpyFactory,
    proxySpy,
};
