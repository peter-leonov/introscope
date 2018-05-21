const { isSpy, getSpyTarget } = require('./proxySpy');

const spySnapshotSerializer = {
    test(val) {
        return isSpy(val);
    },
    serialize(val, config, indentation, depth, refs, printer) {
        return printer(
            getSpyTarget(val),
            config,
            indentation,
            depth,
            refs,
            printer,
        );
    },
};
module.exports = {
    spySnapshotSerializer,
};
