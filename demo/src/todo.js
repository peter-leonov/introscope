import { trackEvent, post } from './lib';
import { showLoadingSpinner, hideLoadingSpinner, showErrorMessage } from './ui';

// a tiny DSL
const areFieldsValid = form => form.title !== '';
const selectFormFields = state => state.fields;

export const updateTodo = async (state, id) => {
    trackEvent('todo.save', id);
    showLoadingSpinner();
    const fields = selectFormFields(state);
    if (areFieldsValid(fields)) {
        await post(`/todo/${id}`, fields);
        trackEvent('todo.save.success', id);
    } else {
        trackEvent('todo.save.failure', id);
        showErrorMessage('BAD_FORM');
    }
    hideLoadingSpinner();
};
