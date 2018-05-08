const { proxySpy } = require('./proxySpy');
const { serialize } = require('jest-serializer');

const effectsShooterLogSymbol = Symbol('isEffectsShooterLog');

const newShooterLog = () => {
    const log = [];
    log[effectsShooterLogSymbol] = true;
    return log;
};

const isEffectsShooterLog = val => val && val[effectsShooterLogSymbol];

const KEEP = {};
const SPY = {};

const effectsShooter = scopeFactory => (
    plan,
    { logName = 'log', log = [] } = {},
) => {
    const logger = (...args) => log.push(...args);
    const scope = scopeFactory();

    for (const id in scope) {
        if (plan[id] === KEEP) {
            continue;
        }

        if (plan[id] === SPY) {
            scope[id] = proxySpy(logger, id, scope[id]);
            continue;
        }

        if (typeof scope[id] == 'function') {
            if (id in plan && typeof plan[id] != 'function') {
                console.warn(
                    `TestPlan: Spying on a function "${id}" with a non-function mock "${typeof plan[
                        id
                    ]}"`,
                );
            }
            scope[id] = proxySpy(logger, id, plan[id] || function() {});
            continue;
        }

        if (typeof scope[id] == 'object' && scope[id] !== null) {
            if (id in plan && typeof plan[id] != 'object') {
                console.warn(
                    `TestPlan: Spying on an object "${id}" with a non-object mock "${typeof plan[
                        id
                    ]}"`,
                );
            }
            scope[id] = proxySpy(logger, id, plan[id] || function() {});
            continue;
        }

        // all primitive values stay as they were
    }

    if (logName) scope[logName] = () => log;

    return scope;
};

module.exports = {
    SPY,
    KEEP,
    effectsShooter,
    isEffectsShooterLog,
    newShooterLog,
};
