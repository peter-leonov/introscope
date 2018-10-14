const { readFileSync, writeFileSync } = require('fs');

expect.extend({
    __getExpectContext(_, cb) {
        cb(this);
        return {
            pass: true,
            message: '',
        };
    },
});

class Recorder {
    constructor(resultsFile, mode) {
        this.resultsFile = resultsFile;

        if (mode == 'playback') {
            try {
                const results = JSON.parse(readFileSync(this.resultsFile));
                this.playback = true;
                this.results = results;
            } catch (_) {}
            return;
        }

        if (mode == 'record') {
            this.recording = true;
            this.results = [];
            return;
        }
    }

    save() {
        if (!this.recording) return;

        writeFileSync(this.resultsFile, JSON.stringify(this.results, null, 2));
    }
}

const getRecorder = () => {
    let context;
    expect(null).__getExpectContext(c => (context = c));

    const filename = context.snapshotState._snapshotPath.replace(
        /snap$/,
        'record',
    );
    const mode =
        context.snapshotState._updateSnapshot === 'all' ? 'record' : 'playback';

    return new Recorder(filename, mode);
};

module.exports = {
    getRecorder,
};
