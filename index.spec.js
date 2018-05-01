const spyOnFunction = (story, id, fn) =>
    new Proxy(fn, {
        apply(_, that, args) {
            story.push(['call', id, that, args]);
            return Reflect.apply(...arguments);
        },
    });

const KEEP = {};

const testPlan = scopeFactory => plan => {
    const story = [];

    const scope = scopeFactory();

    const res = {};
    for (const id in scope) {
        if (plan[id] === KEEP) {
            res[id] = scope[id];
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
            scope[id] = spyOnFunction(story, id, plan[id] || function() {});
        }
    }

    scope.story = () => story;
    return scope;
};

// ------------------------------------------------------

const introscope = () => {
    const scope = {};

    scope.var1 = 1;
    scope.func1 = () => scope.var1;
    scope.func2 = sum => global.dropDatabase(sum);
    scope.testee = num => {
        const a = (0, scope.func1)();
        (0, scope.func2)(a + num);
    };

    return scope;
};

const plan = testPlan(introscope);

describe('foo', () => {
    it('testee', () => {
        const { story, testee } = plan({
            func1: () => 1,
            testee: KEEP,
        });

        testee(2);

        expect(story()).toMatchSnapshot();
    });
});
