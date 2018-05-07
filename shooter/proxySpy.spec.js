const {
    proxySpy,
    getSpyName,
    serializeWithSpies,
    spySnapshotSerializer
} = require('./proxySpy');

expect.addSnapshotSerializer(spySnapshotSerializer);

describe('serializeWithSpies', () => {
    const newSpy = name => proxySpy(() => {}, name, {});

    it('stringifies spies', () => {
        expect(serializeWithSpies(newSpy('A'))).toMatchSnapshot();
        expect(
            serializeWithSpies([newSpy('B'), newSpy('C')])
        ).toMatchSnapshot();
    });

    it('is ok with circular structures', () => {
        let single = {};
        single.obj1 = single;
        single.obj2 = single;
        expect(serializeWithSpies(single)).toMatchSnapshot();

        let obj1 = {};
        obj1.obj1 = obj1;
        let obj2 = {};
        obj2.obj2 = obj2;
        let multiple = {
            obj1,
            obj2
        };
        expect(serializeWithSpies(multiple)).toMatchSnapshot();
    });
});

describe('proxySpy', () => {
    const newMock = (v, log = []) => [
        log,
        proxySpy(
            (...args) => log.push(...args),
            'mockName',
            v || function() {} // function has all the Proxy methods available
        )
    ];

    it('apply/call', () => {
        const [log, mock] = newMock();
        mock(1, 2, 3);
        expect(log).toMatchSnapshot();
    });

    it('apply/method', () => {
        const [log, mock] = newMock();
        const obj = { method1: mock };
        obj.method1(1, 2, 3);
        expect(log).toMatchSnapshot();
    });

    it('get', () => {
        const [log, mock] = newMock();
        mock.property1;
        expect(log).toMatchSnapshot();
    });

    it('set', () => {
        const [log, mock] = newMock();
        mock.property1 = 1;
        expect(log).toMatchSnapshot();
    });
});
