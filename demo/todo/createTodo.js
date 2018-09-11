import { showLoadingSpinner, trackEvent, post, hideLoadingSpinner } from './lib';

const checkForm = fields => !!fields.title;

export const createTodo = async (fields) => {
    showLoadingSpinner();
    trackEvent('createTodo');
    if (checkForm(fields)) await post('/todo/1', fields);
    hideLoadingSpinner();
};















