// @flow
import { introscope as introscopeAny } from './flow-module-any';
import { introscope as introscopeTyped } from './flow-module-typed';

console.log(introscopeAny({}).privateVariable);
console.log(introscopeAny({}).publicVariable);
// with any type Flow sees not error
console.log(introscopeAny({}).nonExistingProperty);

console.log(introscopeTyped({}).privateVariable);
console.log(introscopeTyped({}).publicVariable);
// $FlowError: in this case Flow errors out
console.log(introscopeTyped({}).nonExistingProperty);
