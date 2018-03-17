// @flow

/*::
// $FlowFixMe
type AnyScope = {[string]: any}
declare function introscope(scope: AnyScope): AnyScope

declare function scope<Scope>(scope: Scope): $Shape<Scope> => Scope
*/

export function introscope(scope) {
    return scope;
}

export function scope(scope) {
    return introscope;
}
