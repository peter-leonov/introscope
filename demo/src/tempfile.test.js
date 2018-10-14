import { effectsLogger, RECORD } from 'introscope/logger';
import { introscope } from './tempfile';

const logger = effectsLogger(introscope);

test('tempfile', () => {
    const { scope, effects, recorder } = logger({
        now: RECORD,
        rand: RECORD,
    });

    expect(scope.tempfile()).toMatchSnapshot();

    expect(effects()).toMatchSnapshot();
    recorder.save();
});
