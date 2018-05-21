const { proxySpy } = require('./proxySpy');
const { spySnapshotSerializer } = require('./spySnapshotSerializer');

global.expect.addSnapshotSerializer(spySnapshotSerializer);

const newSpy = v => proxySpy(() => {}, 'spy', v);

describe('spySnapshotSerializer', () => {
    it('naked spy', () => {
        expect(newSpy([])).toMatchSnapshot();
    });

    it('spied arrays', () => {
        expect([
            newSpy([1, 2, 3]),
            newSpy([4, 5, 6]),
            newSpy([7, 8, 9]),
        ]).toMatchSnapshot();
    });

    it('spied objects', () => {
        expect({
            a: newSpy({ a: 'a' }),
            b: newSpy({ b: 'b' }),
            c: newSpy({ c: 'c' }),
        }).toMatchSnapshot();
    });

    it('spied function', () => {
        expect({
            fun: newSpy(() => {}),
        }).toMatchSnapshot();
    });

    it('spied primitives', () => {
        expect([
            newSpy(true),
            newSpy(1),
            newSpy('foo'),
            newSpy(Symbol('bar')),
        ]).toMatchSnapshot();
    });

    it('keeps other objects', () => {
        expect(['str', 5, [1, 2, 3], () => {}]).toMatchSnapshot();
    });
});
