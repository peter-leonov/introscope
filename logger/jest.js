if (
    global.expect &&
    global.expect.addSnapshotSerializer &&
    !process.env.__EFFECTS_LOGGER__NO_JEST_INTERGATION
) {
    const { spySnapshotSerializer } = require('./spySnapshotSerializer');
    const {
        effectsLogSnapshotSerializer,
    } = require('./effectsLogSnapshotSerializer');

    global.expect.addSnapshotSerializer(spySnapshotSerializer);
    global.expect.addSnapshotSerializer(effectsLogSnapshotSerializer);
}
