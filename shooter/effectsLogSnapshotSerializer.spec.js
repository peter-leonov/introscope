const { newShooterLog } = require('.');
const {
    effectsLogSnapshotSerializer,
} = require('./effectsLogSnapshotSerializer');

global.expect.addSnapshotSerializer(effectsLogSnapshotSerializer);

describe('spySnapshotSerializer', () => {
    const log = newShooterLog();
    log.push(['call', 'function1', [1, 2, 3]]);

    it('naked list', () => {
        expect(log).toMatchSnapshot();
    });

    // it('list of lists', () => {
    //     expect([
    //         newSerializedSpy('A'),
    //         newSerializedSpy('B'),
    //         newSerializedSpy('C'),
    //     ]).toMatchSnapshot();
    // });

    // it('object of lists', () => {
    //     expect({
    //         a: newSerializedSpy('A'),
    //         b: newSerializedSpy('B'),
    //         c: newSerializedSpy('C'),
    //     }).toMatchSnapshot();
    // });

    it('keeps other objects', () => {
        expect(['str', 5, [1, 2, 3], [{ a: 1 }]]).toMatchSnapshot();
    });
});
