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

// ------------------------------------------------------

const KEEP = {};
const SPY = {};

const introPlan = scopeFactory => (
    plan,
    { logName = 'log', log = [], serialize = v => v } = {}
) => {
    const scope = scopeFactory();

    for (const id in scope) {
        if (plan[id] === KEEP) {
            continue;
        }

        if (plan[id] === SPY) {
            scope[id] = proxySpy(log, serialize, id, scope[id]);
            continue;
        }

        if (typeof scope[id] == 'function') {
            if (id in plan && typeof plan[id] != 'function') {
                console.warn(
                    `TestPlan: Spying on a function "${id}" with a non-function mock "${typeof plan[
                        id
                    ]}"`
                );
            }
            scope[id] = proxySpy(log, serialize, id, plan[id] || function() {});
            continue;
        }

        if (typeof scope[id] == 'object' && scope[id] !== null) {
            if (id in plan && typeof plan[id] != 'object') {
                console.warn(
                    `TestPlan: Spying on an object "${id}" with a non-object mock "${typeof plan[
                        id
                    ]}"`
                );
            }
            scope[id] = proxySpy(log, serialize, id, plan[id] || function() {});
            continue;
        }

        // all primitive values stay as they were
    }

    if (logName) scope[logName] = () => log;

    return scope;
};

// ------------------------------------------------------

const introscope = () => {
    const scope = {};

    scope.var1 = 1;
    scope.func1 = () => scope.var1;
    scope.func2 = sum => sum;
    scope.testee = num => {
        const a = (0, scope.func1)();
        (0, scope.func2)(a + num);
    };

    return scope;
};

const plan = introPlan(introscope);

describe('foo', () => {
    it('testee', () => {
        const { log, testee } = plan({
            func1: SPY,
            testee: KEEP
        });

        testee(2);

        expect(log()).toMatchSnapshot();
    });
});
