import { effectsLogger, SPY } from 'introscope/logger';
import { introscope } from './abc';

const loggedScope = effectsLogger(introscope);

test('abc', () => {
    const { scope, effects } = loggedScope({
        a: SPY,
        b: SPY,
        c: SPY,
    });

    scope.abc();

    expect(effects()).toMatchSnapshot();
});
