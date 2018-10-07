import { effectsLogger, SPY } from 'introscope/logger';
import { introscope } from './abc';

const logger = effectsLogger(introscope);

test('f calls a then b then c', () => {
    const { scope, effects } = logger({
        a: SPY,
        b: SPY,
        c: SPY,
    });

    expect(scope.f());

    expect(effects()).toMatchSnapshot();
});
