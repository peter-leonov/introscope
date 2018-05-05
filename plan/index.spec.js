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

const { introPlan, SPY, KEEP } = require('.');
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
