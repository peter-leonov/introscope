import { effectsLogger, KEEP, MOCK } from 'introscope/logger'
import { introscope } from './createTodo'

const logger = effectsLogger(introscope, { action: MOCK });

test('createTodo() with good fields', async () => {
    const { scope, effects } = logger({
        createTodo: KEEP,
        // simulate testing scenario
        post: async () => {},
        checkForm: () => true,
        // other functions are mocked automatically
    });
    await scope.createTodo('fields');
    // verify the key side effects
    expect(effects()).toMatchSnapshot();
});







