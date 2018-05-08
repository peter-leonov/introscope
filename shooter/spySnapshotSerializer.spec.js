const { newSerializedSpy } = require('./proxySpy');
const { spySnapshotSerializer } = require('./spySnapshotSerializer');

global.expect.addSnapshotSerializer(spySnapshotSerializer);

describe('spySnapshotSerializer', () => {
    it('naked spy', () => {
        expect(newSerializedSpy('A')).toMatchSnapshot();
    });

    it('list of spies', () => {
        expect([
            newSerializedSpy('A'),
            newSerializedSpy('B'),
            newSerializedSpy('C'),
        ]).toMatchSnapshot();
    });

    it('object of spies', () => {
        expect({
            a: newSerializedSpy('A'),
            b: newSerializedSpy('B'),
            c: newSerializedSpy('C'),
        }).toMatchSnapshot();
    });

    it('keeps other objects', () => {
        expect(['str', 5, [1, 2, 3], { spyName: 'NotASpy' }]).toMatchSnapshot();
    });
});
