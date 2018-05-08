const { isEffectsShooterLog } = require('.');

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

module.exports = {
    effectsLogSnapshotSerializer,
};
