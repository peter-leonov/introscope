import { post, trackEvent } from './lib';
import { showLoadingSpinner, hideLoadingSpinner, showErrorMessage } from './ui';

export const register = async ({ email, password, terms }) => {
    trackEvent('register');
    showLoadingSpinner();

    let error = false;

    if (email === '') {
        showErrorMessage('EMAIL_EMPTY');
        error = true;
    }
    else if (!email.includes('@')) {
        showErrorMessage('EMAIL_WRONG');
        error = true;
    }

    if (password === '') {
        showErrorMessage('PASSWORD_EMPTY');
        error = true;
    }
    else if (password.length < 6) {
        showErrorMessage('PASSWORD_SHORT');
        error = true;
    }

    if (error) {
        showErrorMessage('WRONG_INPUT');
        trackEvent('register.error');
        // FIX: hide spinner
        // hideLoadingSpinner();
        return;
    }

    if (!terms) {
        showErrorMessage('TERMS_EMPY');
        trackEvent('register.terms');
    } else {
        trackEvent('register.success');
        await post('/register', { email, password });
    }

    hideLoadingSpinner();
};

// @introscope "enable": true
