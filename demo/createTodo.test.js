import { effectsLogger, KEEP, MOCK } from 'introscope/logger'
import { introscope } from './createTodo'

const logger = effectsLogger(introscope);

test('createTodo() with good fields', async () => {
    const { scope, effects } = logger({
        post: () => {},
        trackEvent: () => {},
        showLoadingSpinner: () => {},
        hideLoadingSpinner: () => {},
        showErrorMessage: () => {},
        selectFormFields: () => 'fields',
        // simulate testing scenario
        areFieldsValid: () => true,
    });
    await scope.updateTodo('state', 'id');
    // verify the key side effects
    expect(effects()).toMatchSnapshot();
});

test('createTodo() with bad fields', async () => {
    const { scope, effects } = logger({
        post: () => {},
        trackEvent: () => {},
        showLoadingSpinner: () => {},
        hideLoadingSpinner: () => {},
        showErrorMessage: () => {},
        selectFormFields: () => 'fields',
        // simulate testing scenario
        areFieldsValid: () => false,
    });
    await scope.updateTodo('state', 'id');
    // verify the key side effects
    expect(effects()).toMatchSnapshot();
});
