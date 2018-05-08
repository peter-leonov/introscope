const { spySnapshotSerializer } = require('./spySnapshotSerializer');
const {
    effectsLogSnapshotSerializer,
} = require('./effectsLogSnapshotSerializer');

if (global.expect && global.expect.addSnapshotSerializer) {
    global.expect.addSnapshotSerializer(spySnapshotSerializer);
    global.expect.addSnapshotSerializer(effectsLogSnapshotSerializer);
}
