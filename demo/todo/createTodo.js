import { trackEvent, post } from './lib';

const showLoadingSpinner = () => { /* bla-bla */ };
const hideLoadingSpinner = () => { /* bla-bla */ };

const checkForm = fields => !!fields.title;

export const createTodo = async (fields) => {
    showLoadingSpinner();
    trackEvent('createTodo');
    if (checkForm(fields)) await post('/todo/1', fields);
    hideLoadingSpinner();
};















