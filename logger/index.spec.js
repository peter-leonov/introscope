require('./jest');

const introscope = (scope = {}) => {
    scope.log = (...args) => console.log(...args);
    scope.count = 0;
    scope.newTodo = (id, title) => {
        (0, scope.log)('new todo created', id);
        return {
            id,
            title,
        };
    };
    scope.addTodo = title => (0, scope.newTodo)(++scope.count, title);

    return scope;
};

import { effectsLogger, SPY, KEEP, MOCK } from '.';
import { getSpyTarget } from './proxySpy';

const effectsScope = effectsLogger(introscope);

describe('todos', () => {
    it('addTodo', () => {
        const {
            scope: { addTodo },
            effects,
        } = effectsScope({
            log: MOCK,
            newTodo: SPY,
            addTodo: KEEP,
        });

        addTodo('start using Introscope :)');

        expect(effects()).toMatchSnapshot();
    });
});

describe('effectsLogger', () => {
    it('adds new props to scope', () => {
        const { scope } = effectsLogger(() => ({
            a: 0,
        }))({
            b: 2,
        });

        expect(scope).toMatchSnapshot();
    });

    it('does not mock primitives', () => {
        const { scope } = effectsLogger(() => ({
            undefined: undefined,
            null: null,
            boolean: true,
            number: 1,
            string: 'foo',
            symbol: Symbol('bar'),
        }))({});

        expect(scope).toMatchSnapshot();
    });

    it('has working functionMocker as effects.fn', () => {
        const { m } = effectsLogger(() => ({}))({});

        expect(m.foo()).toMatchSnapshot();
    });

    describe('actions', () => {
        it('KEEP', () => {
            const foo = {};
            const { scope } = effectsLogger(() => ({
                foo,
            }))({
                foo: KEEP,
            });

            expect(scope.foo).toBe(foo);
        });

        it('MOCK function', () => {
            const foo = () => {};
            const { scope } = effectsLogger(() => ({
                foo,
            }))({
                foo: MOCK,
            });

            expect(typeof scope.foo).toBe('function');
            expect(scope.foo.name).toBe('autoMock');
        });

        it('MOCK object', () => {
            const foo = {};
            const { scope } = effectsLogger(() => ({
                foo,
            }))({
                foo: MOCK,
            });

            expect(typeof scope.foo).toBe('object');
        });

        it('MOCK array', () => {
            const foo = [];
            const { scope } = effectsLogger(() => ({
                foo,
            }))({
                foo: MOCK,
            });

            expect(typeof scope.foo).toBe('object');
            expect(Array.isArray(scope.foo)).toBe(true);
        });

        it('SPY on scope value', () => {
            const foo = () => {};
            const { scope } = effectsLogger(() => ({
                foo,
            }))({
                foo: SPY,
            });

            expect(typeof scope.foo).toBe('function');
            expect(getSpyTarget(scope.foo)).toBe(foo);
        });

        it('any other value means SPY on that value', () => {
            const mock = {};
            const { scope } = effectsLogger(() => ({
                foo: [],
            }))({
                foo: mock,
            });

            expect(typeof scope.foo).toBe('object');
            expect(getSpyTarget(scope.foo)).toBe(mock);
        });

        it('default action is KEEP', () => {
            const foo = [];
            const { scope } = effectsLogger(() => ({
                foo,
            }))({
                // nothing
            });

            expect(scope.foo).toBe(foo);
        });
    });
});

import { functionMocker } from '.';

describe('functionMocker', () => {
    it('mocks', () => {
        const m = functionMocker();
        expect(m.foo()).toMatchSnapshot();
        expect(m.bar()).toMatchSnapshot();
    });

    it('logs', () => {
        const m = functionMocker();
        m.baz()(123);
        expect(m()).toMatchSnapshot();
    });

    it('calls and passes args', () => {
        const m = functionMocker();
        m.baz(m.forBaz())(1, 2, 3);
        expect(m()).toMatchSnapshot();
    });

    it('returns value', () => {
        const m = functionMocker();
        expect(m.baz(() => 'returned value')()).toMatchSnapshot();
    });

    it('keeps order', () => {
        const m = functionMocker();
        m.fn1()();
        m.fn2()();
        m.fn3()();
        expect(m()).toMatchSnapshot();
    });

    it('ignores never called mocks', () => {
        const m = functionMocker();
        m.fn1()();
        m.fn2();
        m.fn3()();
        expect(m()).toMatchSnapshot();
    });
});
