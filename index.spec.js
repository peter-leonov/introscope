const spyOn = (story, id, v) =>
    new Proxy(v, {
        apply(_, that, args) {
            story.push(['call', id, that, args]);
            return Reflect.apply(...arguments);
        },
        get(_, prop) {
            story.push(['get', id, prop]);
            return Reflect.get(...arguments);
        },
        set(_, prop, value) {
            story.push(['set', id, prop, value]);
            return Reflect.set(...arguments);
        },
    });

const KEEP = {};
const SPY = {};

const testPlan = scopeFactory => (plan, { logName = 'log', log = [] } = {}) => {
    const scope = scopeFactory();

    for (const id in scope) {
        if (plan[id] === KEEP) {
            continue;
        }

        if (plan[id] === SPY) {
            scope[id] = spyOn(scope[id]);
            continue;
        }

        if (typeof scope[id] == 'function') {
            if (id in plan && typeof plan[id] != 'function') {
                console.warn(
                    `TestPlan: Spying on a function "${id}" with a non-function mock "${typeof plan[
                        id
                    ]}"`,
                );
            }
            scope[id] = spyOn(log, id, plan[id] || function() {});
            continue;
        }

        if (typeof scope[id] == 'object' && scope[id] !== null) {
            if (id in plan && typeof plan[id] != 'object') {
                console.warn(
                    `TestPlan: Spying on an object "${id}" with a non-object mock "${typeof plan[
                        id
                    ]}"`,
                );
            }
            scope[id] = spyOn(log, id, plan[id] || function() {});
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
    scope.func2 = sum => sum;
    scope.testee = num => {
        const a = scope.var1;
        (0, scope.func2)(a + num);
    };

    return scope;
};

const plan = testPlan(introscope);

describe('foo', () => {
    it('testee', () => {
        const { log, testee } = plan({
            testee: KEEP,
        });

        testee(2);

        expect(log()).toMatchSnapshot();
    });
});
