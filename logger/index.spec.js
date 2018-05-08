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
const scope = effectsLogger(introscope);

describe('todos', () => {
    it('addTodo', () => {
        const { effects, addTodo } = scope({
            newTodo: SPY,
            addTodo: KEEP,
        });

        addTodo('start using Introscope :)');

        expect(effects()).toMatchSnapshot();
    });
});
