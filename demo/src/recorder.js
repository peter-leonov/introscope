import { readFileSync, writeFileSync } from 'fs';

export const getRecorder = testName => {
    const resultsFile = `${__dirname}/__snapshots__/${testName}.results.json`;

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
