import x from "x"

// the value changes during namespace evaluation
let x = 0
x++

let val
let testee = () => val
val = 7

const recur = () => recur

// const getData = _scope.getData || (() => [x, 2, 3])
// const sum = (acc, x) = acc + x
// const sumData = (_scope) => {
//     return (({sum}) => getData.reduce(sum))({getData, sum, sumData, ..._scope})
// }

// and then: closure(testPlan({sum: undefined}))(fsdfsdfadfasf)

let allTheScope

const sumData = userScope => {
    return (({ a, b, c }) => getData.reduce(sum))({
        ...allTheScope,
        ...userScope
    })
}

allTheScope = { a, b, c }
