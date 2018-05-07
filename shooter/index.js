const { proxySpy } = require('./proxySpy');
const { serialize } = require('jest-serializer');

const isEffectsShooterLog = Symbol('isEffectsShooterLog');

const newShooterLog = () => {
    const log = [];
    log[isEffectsShooterLog] = true;
    return log;
};

const effectsLogSnapshotSerializer = {
    test(val) {
        return val && val[isEffectsShooterLog];
    },
    serialize(val, config, indentation, depth, refs, printer) {
        if (++depth > config.maxDepth) {
            return `EffectsLog [${val.length}]`;
        }

        const comma = ',' + config.spacingInner;
        const nl = config.spacingOuter + indentation + config.indent;

        const print = v =>
            printer(
                v,
                config,
                indentation + config.indent + config.indent,
                depth,
                refs,
            );

        // const ARGS_SEPARATOR = ',' + config.spacingInner;
        // const printArgs = args =>
        //     args
        //         .map(print)
        //         .join(ARGS_SEPARATOR);

        const printLine = line => {
            const [type] = line;
            switch (type) {
                case 'call':
                    {
                        const [, id, args] = line;
                        return `${id}(${nl}${print(args)})`;
                    }
                    break;
                case 'method':
                    {
                        const [, id, that, args] = line;
                        return `${id}.apply(${nl}${print(that)}${comma}${print(
                            args,
                        )})`;
                    }
                    break;
                case 'get':
                    {
                        const [, id, prop] = line;
                        return `${id}[${print(prop)}]`;
                    }
                    break;
                case 'set':
                    {
                        const [, id, prop, arg] = line;
                        return `${id}[${print(prop)}] = ${print(arg)}`;
                    }
                    break;
            }
        };

        return 'EffectsLog [' + nl + val.map(printLine).join(nl) + nl + ']';
    },
};

if (global.expect && global.expect.addSnapshotSerializer) {
    global.expect.addSnapshotSerializer(effectsLogSnapshotSerializer);
}

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
    effectsLogSnapshotSerializer,
};
