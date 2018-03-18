// @flow
// @introscope-config "ignore": ["Error"]

import { httpGet } from './some-http-library';

const ensureOkStatus = response => {
    if (response.status !== 200) {
        throw new Error('Non OK status');
    }
    return response;
};

export const getTodos = () => httpGet('/todos').then(ensureOkStatus);

import { scope } from 'introscope';
export const introscope = scope({
    httpGet,
    ensureOkStatus,
    getTodos
});
