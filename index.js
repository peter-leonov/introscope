// @flow

/*::
// $FlowFixMe
declare function introscope(scope: any): any

declare function scope<Scope>(scope: Scope): $Shape<Scope> => Scope
*/

export function introscope(scope) {
    return scope;
}

export function scope(scope) {
    return introscope;
}
