import { httpGet } from './some-http-library';

const ensureOkStatus = response => {
    if (response.status !== 200) {
        throw 'Non OK status';
    }
    return response;
};

export const getTodos = () => httpGet('/todos').then(ensureOkStatus);

// @introscope-config "ignore": ["Error"]
