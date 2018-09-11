import { introscope } from './createTodo'

test('createTodo() with good fields', async () => {
    const scope = introscope();
    // mock side effects
    scope.showLoadingSpinner = jest.fn();
    scope.trackEvent = jest.fn();
    scope.hideLoadingSpinner = jest.fn();
    // simulate testing scenario
    scope.post = jest.fn(async () => {});
    scope.checkForm = jest.fn(() => true);
    await scope.createTodo('fields');
    // verify the key side effects
    expect(scope.checkForm).toBeCalledWith('fields');
    expect(scope.post).toBeCalled();
});







