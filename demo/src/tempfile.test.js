import { introscope } from './tempfile';
import { effectsLogger, SPY } from 'introscope/logger';
import { getRecorder } from './recorder';

const logger = effectsLogger(introscope);

test('generates a kinda uniq name', async () => {
    // const recorder = getRecorder('tempfile');

    const { scope, effects } = logger(
        {
            now: SPY,
            rand: SPY,
        },
        // { recorder },
    );

    expect(scope.tempfile()).toMatchSnapshot();

    // recorder.save();
});
