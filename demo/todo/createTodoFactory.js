import { trackEvent, post } from './lib';

const showLoadingSpinner = () => { /* bla-bla */ };
const hideLoadingSpinner = () => { /* bla-bla */ };

const checkForm = fields => !!fields.title;

export const createTodoFactory = async (
    _checkForm: typeof checkForm,
    _showLoadingSpinner: typeof showLoadingSpinner,
    _post: typeof post,
    _hideLoadingSpinner: typeof hideLoadingSpinner,
) => (fields) => {
    _showLoadingSpinner();
    _trackEvent('createTodo');
    if (_checkForm(fields)) await _post('/todo/1', fields);
    _hideLoadingSpinner();
};
export const createTodo = createTodoFactory(
    checkForm,
    showLoadingSpinner,
    post,
    hideLoadingSpinner,
);







