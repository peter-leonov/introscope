const { proxySpy } = require('./plan');

const KEEP = {};
const SPY = {};

const effectsShooter = scopeFactory => (
    plan,
    { logName = 'log', log = [], serialize = v => v } = {}
) => {
    const logger = (...args) => log.push(...args);
    const scope = scopeFactory();

    for (const id in scope) {
        if (plan[id] === KEEP) {
            continue;
        }

        if (plan[id] === SPY) {
            scope[id] = proxySpy(logger, serialize, id, scope[id]);
            continue;
        }

        if (typeof scope[id] == 'function') {
            if (id in plan && typeof plan[id] != 'function') {
                console.warn(
                    `TestPlan: Spying on a function "${id}" with a non-function mock "${typeof plan[
                        id
                    ]}"`
                );
            }
            scope[id] = proxySpy(
                logger,
                serialize,
                id,
                plan[id] || function() {}
            );
            continue;
        }

        if (typeof scope[id] == 'object' && scope[id] !== null) {
            if (id in plan && typeof plan[id] != 'object') {
                console.warn(
                    `TestPlan: Spying on an object "${id}" with a non-object mock "${typeof plan[
                        id
                    ]}"`
                );
            }
            scope[id] = proxySpy(
                logger,
                serialize,
                id,
                plan[id] || function() {}
            );
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
    introPlan
};
