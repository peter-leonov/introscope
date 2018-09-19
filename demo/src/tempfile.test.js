import { readFileSync, writeFileSync } from 'fs';
import { introscope } from './tempfile';
import { effectsLogger, SPY } from 'introscope/logger';

const logger = effectsLogger(introscope);

const getRecorder = testName => {
    const resultsFile = `${__dirname}/${testName}.results.json`;

    try {
        const results = JSON.parse(readFileSync(resultsFile));
        return {
            save: () => {},
            playback: true,
            results,
        };
    } catch (_) {}

    return {
        recording: true,
        results: [],
        save() {
            writeFileSync(resultsFile, JSON.stringify(this.results));
        },
    };
};

test('generates a kinda uniq name', async () => {
    const recorder = getRecorder('tempfile');

    const { scope, effects } = logger(
        {
            now: SPY,
            rand: SPY,
        },
        { recorder },
    );

    expect(scope.tempfile()).toMatchSnapshot();

    recorder.save();
});
