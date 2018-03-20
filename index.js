// @flow

/*::
// $FlowFixMe
type AnyScope = { [string]: any };
declare function introscope(scope: AnyScope): AnyScope => AnyScope;

declare function scope<Scope: {}>(scope: Scope): ($Shape<Scope>) => Scope;
*/

function introscope(scope) {
    return scope;
}

function scope(scope) {
    return introscope;
}

module.exports = {
    introscope,
    scope
};
