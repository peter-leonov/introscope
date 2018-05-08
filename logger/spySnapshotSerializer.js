const { isSerializedSpy } = require('./proxySpy');

const spySnapshotSerializer = {
    test: val => val && val[isSerializedSpy],
    print: val => `[Spy ${val.spyName}]`,
};
module.exports = {
    spySnapshotSerializer,
};
