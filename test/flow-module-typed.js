// @flow
const privateVariable = 'privateValue';
export const publicVariable = 'publicValue';

import { scope } from '../index';
export const introscope = scope({
    privateVariable,
    publicVariable
});
