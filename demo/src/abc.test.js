import { effectsLogger, SPY } from 'introscope/logger';
import { introscope } from './abc';

const logger = effectsLogger(introscope);

test('generates a kinda uniq name', () => {
    const { scope, effects } = logger({
        a: SPY,
        b: SPY,
        c: SPY,
    });

    expect(scope.f());

    expect(effects()).toMatchSnapshot();
});
