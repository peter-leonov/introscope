const { proxySpy, getSpyName, serializeWithSpies } = require('./proxySpy');
const { newLog } = require('.');
require('./jest');

describe('serializeWithSpies', () => {
    const newSpy = name => proxySpy(() => {}, name, {});

    it('stringifies spies', () => {
        expect(serializeWithSpies(newSpy('A'))).toMatchSnapshot();
        expect(
            serializeWithSpies([newSpy('B'), newSpy('C')]),
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
            obj2,
        };
        expect(serializeWithSpies(multiple)).toMatchSnapshot();
    });
});

describe('proxySpy', () => {
    const mockLogger = () => {
        // object oriented programming? have never heard of it :D
        const log = newLog();
        let enabled = true;
        log.disable = () => (enabled = false);
        const logger = (...args) => enabled && log.push(...args);

        return { log, logger };
    };
    const newMock = (v, conf, name) => {
        const { log, logger } = mockLogger();

        return {
            log,
            logger,
            mock: proxySpy(
                logger,
                name || (v && v.name) || 'mockName',
                v || function() {}, // function has all the Proxy methods available
                conf,
            ),
        };
    };
    describe('methods', () => {
        it('apply/call', () => {
            const { log, mock } = newMock();
            mock(1, 2, 3);
            log.disable();
            expect(log).toMatchSnapshot();
        });

        it('apply/method', () => {
            const { log, mock } = newMock();
            const obj = { method1: mock };
            obj.method1(1, 2, 3);
            log.disable();
            expect(log).toMatchSnapshot();
        });

        it('get', () => {
            const { log, mock } = newMock();
            mock.property1;
            log.disable();
            expect(log).toMatchSnapshot();
        });

        it('set', () => {
            const { log, mock } = newMock();
            mock.property1 = 1;
            log.disable();
            expect(log).toMatchSnapshot();
        });
    });

    describe('etc', () => {
        it('returns same spies for same object + id', () => {
            const obj = {};

            const same1 = proxySpy(() => {}, 'same', obj);
            const same2 = proxySpy(() => {}, 'same', obj);
            const other1 = proxySpy(() => {}, 'other', obj);
            const other2 = proxySpy(() => {}, 'same', {});

            expect(same1).toBe(same2);
            expect(same1).not.toBe(other1);
            expect(other1).not.toBe(other2);
        });
    });

    describe('deep', () => {
        it('returns spied values', () => {
            const { log, mock } = newMock({ foo: () => {} }, { deep: true });
            // gets loged as property get
            const foo = mock.foo;
            // gets logged as call
            foo();
            // same spies for the same objects / keys
            expect(log).toMatchSnapshot();
        });

        it('supports Symbols', () => {
            const foo = Symbol('foo');
            const { log, mock } = newMock({ [foo]: {} }, { deep: true });
            mock[foo][Symbol('bar')];
            expect(log).toMatchSnapshot();
        });
    });

    describe('record', () => {
        it('returns recorded values', () => {
            const { logger: loggerA, mock: a } = newMock(function a() {
                return 'a';
            });
            loggerA.results = ['A1', 'A2'];

            const { logger: loggerB, mock: b } = newMock(function b() {
                return 'b';
            });
            loggerB.results = ['B1'];

            expect(a()).toBe('A1');
            expect(b()).toBe('B1');
            expect(a()).toBe('A2');
            expect(() => a()).toThrow('results');
            expect(() => b()).toThrow('results');
            expect(() => a()).toThrow('results');
            expect(() => b()).toThrow('results');
        });
    });
});
