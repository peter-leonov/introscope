import { effectsLogger, SPY } from 'introscope/logger';
import { getRecorder } from './recorder';
import { introscope } from './tempfile';

const logger = effectsLogger(introscope);

test('tempfile', () => {
    const recorder = getRecorder();

    const { scope, effects } = logger(
        {
            now: SPY,
            rand: SPY,
        },
        { recorder },
    );

    expect(scope.tempfile()).toMatchSnapshot();

    expect(effects()).toMatchSnapshot();
    recorder.save();
});
