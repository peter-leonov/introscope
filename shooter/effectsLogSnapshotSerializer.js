const { isEffectsShooterLog } = require('.');

const effectsLogSnapshotSerializer = {
    test(val) {
        return isEffectsShooterLog(val);
    },
    serialize(lines, config, indentation, depth, refs, printer) {
        if (++depth > config.maxDepth) {
            return `EffectsLog [${lines.length}]`;
        }

        const nl = config.spacingOuter;
        const i0 = indentation;
        const i1 = i0 + config.indent;
        const i2 = i1 + config.indent;
        const i3 = i2 + config.indent;

        const print = v =>
            printer(
                v,
                config,
                indentation + config.indent + config.indent,
                depth,
                refs,
            );

        const ARGS_SEPARATOR = ',';
        const printArgs = args =>
            args
                .map(print)
                .map(line => i3 + line + ARGS_SEPARATOR + config.spacingOuter)
                .join('');

        const printLine = line => {
            const [type] = line;
            switch (type) {
                case 'call':
                    {
                        const [, id, args] = line;
                        return (
                            [i1 + id + '(' + nl] +
                            printArgs(args) +
                            [i1 + ')' + nl]
                        );
                    }
                    break;
                case 'method':
                    {
                        const [, id, that, args] = line;
                        return `${id}.apply(${nl}${i1}${print(that)}${print(
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

        return (
            ['EffectsLog [' + nl] + lines.map(printLine).join('') + [i0 + ']']
        );
    },
};

module.exports = {
    effectsLogSnapshotSerializer,
};
