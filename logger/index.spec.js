const introscope = (scope = {}) => {
    scope.var1 = 1;
    scope.func1 = () => ++scope.var1;
    scope.func2 = sum => sum;
    scope.testee = num => {
        const a = (0, scope.func1)();
        (0, scope.func2)(a + num);
    };

    return scope;
};

import { effectsLogger, SPY, KEEP } from '.';
const scope = effectsLogger(introscope);

describe('foo', () => {
    it('testee', () => {
        const { log, testee } = scope({
            func1: SPY,
            testee: KEEP,
        });

        testee(2);

        expect(log()).toMatchSnapshot();
    });
});
