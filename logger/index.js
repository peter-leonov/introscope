const { proxySpy } = require('./proxySpy');
const { serialize } = require('jest-serializer');

const EffectsLoggerLogSymbol = Symbol('isEffectsLoggerLog');

const newLog = () => {
    const log = [];
    log[EffectsLoggerLogSymbol] = true;
    return log;
};

const isEffectsLoggerLog = val => val && val[EffectsLoggerLogSymbol];

const KEEP = {};
const SPY = {};
const WRAP = {};

const effectsLogger = scopeFactory => (
    plan,
    { logName = 'effects', log = [] } = {},
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
            scope[id] = proxySpy(logger, id, plan[id] || function() {});
            continue;
        }

        // all primitive values stay as they were
    }

    if (logName) {
        if (logName in scope)
            throw new Error(
                `EffectsLogger: effects symbol "${logName}" is already defined in the scope. Please, provide another effects log name in the effectsLogger() config parameter.`,
            );
        scope[logName] = () => log;
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
