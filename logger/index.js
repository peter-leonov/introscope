const { proxySpy } = require('./proxySpy');
const { getRecorder } = require('./recorder');

const effectsLoggerLogRegistry = new WeakMap();
const isEffectsLoggerLog = log => effectsLoggerLogRegistry.has(log);

const newLog = () => {
    const log = [];
    effectsLoggerLogRegistry.set(log, true);
    return log;
};

// from https://github.com/peter-leonov/test-plan
const functionMocker = (log = newLog()) =>
    new Proxy(() => log, {
        get(_, prop) {
            return v =>
                proxySpy(
                    (...args) => log.push(...args),
                    undefined,
                    prop,
                    v || function() {},
                );
        },
    });

const namedFunction = name => {
    const fn = function() {};
    Object.defineProperty(fn, 'name', { value: name });
    return fn;
};

const KEEP = {};
const MOCK = {};
const SPY = {};
const RECORD = {};

const effectsLogger = scopeFactory => (
    plan,
    { log = newLog(), defaultAction = KEEP, recorder = getRecorder() } = {},
) => {
    // to not polute the log with scope creation
    let moduleLoggerEnabled = false;
    let loggerEnabled = false;

    const logger = (...args) => loggerEnabled && log.push(...args);
    const moduleLogger = ([type, ...args]) =>
        moduleLoggerEnabled && type != 'get' && log.push([type, ...args]);

    const scope = scopeFactory(
        proxySpy(moduleLogger, undefined, 'module', Object.create(null)),
    );

    for (const id in scope) {
        const action = id in plan ? plan[id] : defaultAction;

        if (action === KEEP) {
            continue;
        }

        if (action === SPY) {
            scope[id] = proxySpy(logger, undefined, id, scope[id]);
            continue;
        }

        if (action === RECORD) {
            scope[id] = proxySpy(logger, recorder, id, scope[id]);
            continue;
        }

        // see the code below
        if (plan[id] === MOCK) {
            delete plan[id];
        }

        if (typeof scope[id] == 'function') {
            if (id in plan && typeof plan[id] != 'function') {
                console.warn(
                    `EffectsLogger: Mocking a function "${id}" with a non-function mock "${typeof plan[
                        id
                    ]}"`,
                );
            }
            scope[id] = proxySpy(
                logger,
                undefined,
                id,
                plan[id] || namedFunction(`${id}AutoMock`),
            );
            continue;
        }

        if (typeof scope[id] == 'object' && scope[id] !== null) {
            if (id in plan && typeof plan[id] != 'object') {
                console.warn(
                    `EffectsLogger: Mocking an object "${id}" with a non-object mock "${typeof plan[
                        id
                    ]}"`,
                );
            }
            scope[id] = proxySpy(
                logger,
                undefined,
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
                scope[id] = proxySpy(logger, undefined, id, plan[id]);
            } else {
                // all primitive values stay as they are
                scope[id] = plan[id];
            }
        }
    }

    const effects = () => {
        // to stop loggin after call to effects()
        // to prevent noise from Jest serializer iteration
        loggerEnabled = false;
        moduleLoggerEnabled = false;

        return log;
    };

    loggerEnabled = true;
    moduleLoggerEnabled = true;
    return { scope, effects, m: functionMocker(log) };
};

module.exports = {
    SPY,
    KEEP,
    MOCK,
    RECORD,
    effectsLogger,
    isEffectsLoggerLog,
    newLog,
    functionMocker,
};

// auto enable serializers in Jest
require('./jest');
