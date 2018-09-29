import { readFileSync, writeFileSync } from 'fs';

expect.extend({
    toRecord(recorder) {
        const filename = this.snapshotState._snapshotPath.replace(
            /snap$/,
            'record',
        );
        recorder.load(filename);
        // console.log(this);
        return {
            pass: true,
            message: '',
        };
    },
});

class Recorder {
    constructor() {
        this.resultsFile = undefined;
        this.recording = false;
        this.playback = false;
    }

    load(resultsFile) {
        this.resultsFile = resultsFile;

        try {
            const results = JSON.parse(readFileSync(this.resultsFile));
            this.playback = true;
            this.results = results;
            return;
        } catch (_) {}

        this.recording = true;
        this.results = [];
    }

    save() {
        if (!this.recording) return;

        writeFileSync(this.resultsFile, JSON.stringify(this.results));
    }
}

export const getRecorder = () => {
    const recorder = new Recorder();
    expect(recorder).toRecord();
    return recorder;
};
