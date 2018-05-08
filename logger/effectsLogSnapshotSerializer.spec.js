const { newLog } = require('.');
const {
    effectsLogSnapshotSerializer,
} = require('./effectsLogSnapshotSerializer');

global.expect.addSnapshotSerializer(effectsLogSnapshotSerializer);

describe('spySnapshotSerializer', () => {
    const log = newLog();
    log.push(
        ['call', 'function1', [1, 2, 3]],
        ['call', 'function1', []],
        ['call', 'function1', [null]],
        ['apply', 'function2', { a: 1 }, [1, 2, 3]],
        ['apply', 'function2', null, []],
        ['apply', 'function2', [1, 2, 3], ['str']],
        ['get', 'object1', 'property1'],
        ['get', 'object1', 'non keyword property'],
        ['get', 'object1', '101_dalmatians'],
        ['get', 'object1', Symbol('foo')],
        ['set', 'object2', 'property2', [1, 2, 3]],
        ['set', 'object2', 'property2', Symbol('bar')],
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
