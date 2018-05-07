const { proxySpy, getSpyName } = require('./proxySpy');

const newMock = (v, log = []) => [
    log,
    proxySpy(
        (...args) => log.push(...args),
        'mockName',
        v || function() {} // function has all the Proxy methods available
    )
];

describe('proxySpy', () => {
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
});
