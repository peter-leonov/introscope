
const x = hoistedFunction()
function hoistedFunction (v) {
    return v + 1
}
// =>
const x = hoistedFunction()
var _hoistedFunction
function hoistedFunction () {
    if (!_hoistedFunction)
        _hoistedFunction = __wrap(function hoistedFunction (v) {
            return v + 1
        })
    return _hoistedFunction.apply(this, arguments)
}

// __wrap lives in test code space
function __wrap(id, thunk) {
    __exports[id] = thunk;
    return __mocks[id]() || thunk()
}


// the value changes during namespace evaluation
let x = 0
x++
let y = () => x + 1 // 1
// =>
let x = __wrap(() => 0, {name: 'x', type: 'let'})
x++
let y = () => x + 1 // 1
// provide wrap from tester
// mock imports with __wrap too
const map = __wrap(({x,y,z}) => 0, {x,y,z}, {name: 'x', type: 'let'})


let random = Math.random()
const testMe = () => {
    if (random > 0.5) return 1;
    random = 6
}



let val
let testee = () => val
val = 7

const recur = () => recur

const i = 0
const impure = () => i++
const v1 = impure()
const v2 = impure()

const getData = _scope.getData || (() => [x, 2, 3])
const sum = (acc, x) => acc + x
const sumData = _scope => {
    return (({ sum }) => getData.reduce(sum))({
        getData,
        sum,
        sumData,
        ..._scope
    })
}

var allTheScope = { a, b, c }

import introscope from 'introscope'
//const introscope = <V>(v: V) => (scope: {}): V => v
export var sumDataIntroscope = introscope(getData)
// =>
export var sumDataIntroscope = userScope =>
(({ a, b, c }) => getData.reduce(sum))({
    ...allTheScope,
    ...userScope
})
// or
export { introscope } from 'introscope'
// introscope/index.js
// @flow
//export const introscope = (cb/*: any*/)/*:any*/ => true

// and then: closure(testPlan({sum: undefined}))(fsdfsdfadfasf)

// @introscope ignore: ['map', 'react', '*'] env: 'test'
// @introscope pure: true -- makes all functions exported independently



// in a test

// @introscope-import
import foo from 'foo'
// =>
const __introscope_module = process.env.__introscope_module
process.env.__introscope_module = 'foo'
import foo from 'foo'
process.env.__introscope_module = __introscope_module
