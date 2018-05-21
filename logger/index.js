const { proxySpy } = require('./proxySpy');

const EffectsLoggerLogSymbol = Symbol('isEffectsLoggerLog');

export const newLog = () => {
    const log = [];
    log[EffectsLoggerLogSymbol] = true;
    return log;
};

// from https://github.com/peter-leonov/test-plan
export const functionMocker = (log = newLog()) =>
    new Proxy(() => log, {
        get(_, prop) {
            return v =>
                proxySpy(
                    (...args) => log.push(...args),
                    prop,
                    v || function() {},
                );
        },
    });

const isEffectsLoggerLog = val => val && val[EffectsLoggerLogSymbol];

const KEEP = {};
const SPY = {};
const WRAP = {};

const effectsLogger = scopeFactory => (
    plan,
    { effectsName = 'effects', log = newLog() } = {},
) => {
    // to not polute the log with scope creation
    let moduleLoggerEnabled = false;
    const moduleLogger = ([type, ...args]) =>
        moduleLoggerEnabled && type != 'get' && log.push([type, ...args]);
    const scope = scopeFactory(
        proxySpy(moduleLogger, 'module', Object.create(null)),
    );

    const logger = (...args) => log.push(...args);
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
            scope[id] = proxySpy(
                logger,
                id,
                plan[id] || (Array.isArray(scope[id]) ? [] : {}),
            );
            continue;
        }

        // all primitive values stay as they were
    }

    for (const id in plan) {
        if (typeof scope[id] == 'undefined') {
            if (
                typeof plan[id] == 'function' ||
                (typeof plan[id] == 'object' && plan[id] !== null)
            ) {
                scope[id] = proxySpy(logger, id, plan[id] || function() {});
            } else {
                // all primitive values stay as they are
                scope[id] = plan[id];
            }
        }
    }

    if (effectsName) {
        if (effectsName in scope)
            throw new Error(
                `EffectsLogger: effects id "${effectsName}" is already defined in the scope. Please, provide another effects log name in the effectsLogger() config parameter.`,
            );
        const effects = () => log;
        effects.fn = functionMocker(log);
        scope[effectsName] = effects;
    }

    moduleLoggerEnabled = true;
    return scope;
};

module.exports = {
    SPY,
    KEEP,
    effectsLogger,
    isEffectsLoggerLog,
    newLog,
};

// auto enable serializers in Jest
require('./jest');
