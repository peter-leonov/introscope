const { isEffectsShooterLog } = require('.');

const effectsLogSnapshotSerializer = {
    test(val) {
        return isEffectsShooterLog(val);
    },
    serialize(lines, config, indentation, depth, refs, printer) {
        if (++depth > config.maxDepth) {
            return `EffectsLog [${lines.length}]`;
        }

        const nl = config.spacingInner;
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

        const printArgs = (i, args) =>
            args
                .map(print)
                .map(line => i + line + ',' + config.spacingOuter)
                .join('');

        const printLine = line => {
            const [type] = line;
            switch (type) {
                case 'call':
                    {
                        const [, id, args] = line;
                        return (
                            [i1 + id + '(' + nl] +
                            printArgs(i2, args) +
                            [i1 + '),' + nl]
                        );
                    }
                    break;
                case 'apply':
                    {
                        const [, id, that, args] = line;
                        return (
                            [i1 + id + '.apply(' + nl] +
                            [i2 + print(that) + ',' + nl] +
                            [i2 + '[' + nl] +
                            printArgs(i3, args) +
                            [i2 + ']' + nl] +
                            [i1 + '),' + nl]
                        );
                    }
                    break;
                case 'get':
                    {
                        const [, id, prop] = line;
                        return String([i1 + id + '.' + prop + ',' + nl]);
                    }
                    break;
                case 'set':
                    {
                        const [, id, prop, v] = line;
                        return (
                            [i1 + id + '.' + prop + ' =' + nl] +
                            [i2 + print(v) + ',' + nl]
                        );
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
