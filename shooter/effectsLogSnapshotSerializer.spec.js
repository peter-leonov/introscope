const { newShooterLog } = require('.');
const {
    effectsLogSnapshotSerializer,
} = require('./effectsLogSnapshotSerializer');

global.expect.addSnapshotSerializer(effectsLogSnapshotSerializer);

describe('spySnapshotSerializer', () => {
    const log = newShooterLog();
    log.push(
        ['call', 'function1', [1, 2, 3]],
        ['apply', 'function2', { a: 1 }, [1, 2, 3]],
        ['get', 'object1', 'property1'],
        ['set', 'object2', 'property2', [1, 2, 3]],
    );

    it('naked log', () => {
        expect(log).toMatchSnapshot();
    });

    it('list of logs', () => {
        expect([log, log, log]).toMatchSnapshot();
    });

    it('object of logs', () => {
        expect({
            a: log,
            b: log,
            c: log,
        }).toMatchSnapshot();
    });

    it('keeps other objects', () => {
        expect(['str', 5, [1, 2, 3], [{ a: 1 }]]).toMatchSnapshot();
    });
});
