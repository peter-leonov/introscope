const { isSerializedSpy, getSpyName } = require('./proxySpy');

const spySnapshotSerializer = {
    test: val => {
        if (val == null) return false;
        if (val[isSerializedSpy]) return true;
        if (getSpyName(val)) return true;
    },
    print: val => `[Spy ${getSpyName(val) || val.spyName}]`,
};
module.exports = {
    spySnapshotSerializer,
};
