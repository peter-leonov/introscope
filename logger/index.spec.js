const {
    effectsLogSnapshotSerializer,
} = require('./effectsLogSnapshotSerializer');

global.expect.addSnapshotSerializer(effectsLogSnapshotSerializer);

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

import { effectsLogger, SPY, KEEP } from '.';
const effectsScope = effectsLogger(introscope);

describe('todos', () => {
    it('addTodo', () => {
        const { effects, addTodo } = effectsScope({
            newTodo: SPY,
            addTodo: KEEP,
        });

        addTodo('start using Introscope :)');

        expect(effects()).toMatchSnapshot();
    });
});

describe('effectsLogger', () => {
    it('adds new props to scope', () => {
        const scope = effectsLogger(() => ({
            a: 0,
        }))({
            b: 2,
        });

        expect(scope).toMatchSnapshot();
    });
});
