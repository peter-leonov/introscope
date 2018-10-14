import { effectsLogger, RECORD } from 'introscope/logger';
import { introscope } from './tempfile';

const recordedScope = effectsLogger(introscope);

test('tempfile', () => {
    const { scope, recorder } = recordedScope({
        now: RECORD,
        rand: RECORD,
    });

    expect(scope.tempfile()).toMatchSnapshot();

    recorder.save();
});