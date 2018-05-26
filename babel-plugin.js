const toPairs = obj => {
    const pairs = [];
    for (const key in obj) {
        pairs.push([key, obj[key]]);
    }
    return pairs;
};

const byType = type => node => node.type == type;
const not = fn => (...args) => !fn(...args);

const isInFlow = path =>
    path && (path.isFlow() || !!path.findParent(path => path.isFlow()));

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const STANDARD_BUILTINS = [
    'Infinity',
    'NaN',
    'undefined',
    'null',
    'eval',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'escape',
    'unescape',
    'Object',
    'Function',
    'Boolean',
    'Symbol',
    'Error',
    'EvalError',
    'InternalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
    'Number',
    'Math',
    'Date',
    'String',
    'RegExp',
    'Array',
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'SIMD',
    'ArrayBuffer',
    'SharedArrayBuffer',
    'Atomics',
    'DataView',
    'JSON',
    'Promise',
    'Generator',
    'GeneratorFunction',
    'AsyncFunction',
    'Reflect',
    'Proxy',
    'Intl',
    'WebAssembly',
    'arguments',
    'Buffer',
    'console',
];

const mergeIntoOptions = (options, opts) => {
    opts = Object.assign({}, opts);
    const ignore = opts.ignore;
    if (ignore) {
        delete opts.ignore;
        ignore.forEach(v => {
            if (v[0] == '-') {
                options.ignore.delete(v.substr(1));
            } else {
                options.ignore.add(v);
            }
        });
    }
    Object.assign(options, opts);
};

function processProgram({ types: t }, programPath, programOpts) {
    const options = {
        enable: false,
        ignore: new Set(STANDARD_BUILTINS),
        instrumentImports: 'query',
        removeImports: false,
        exportName: 'introscope',
    };

    mergeIntoOptions(options, programOpts);

    const scopeId = programPath.scope.generateUidIdentifier('scope');

    const scopeSet = (left, right) =>
        t.assignmentExpression('=', t.memberExpression(scopeId, left), right);

    const unwrapOrRemoveExports = path => {
        path.get('body').forEach(path => {
            if (path.isExportDefaultDeclaration()) {
                path.replaceWith(
                    t.expressionStatement(
                        scopeSet(
                            t.identifier('default'),
                            path.get('declaration').node,
                        ),
                    ),
                );
            } else if (path.isExportNamedDeclaration()) {
                path.node.declaration
                    ? path.replaceWith(path.get('declaration').node)
                    : path.remove();
            } else if (path.isExportAllDeclaration()) {
                path.remove();
            }
        });
    };

    const identifiersToObjectProperties = identifiers =>
        identifiers.map(identifier =>
            t.objectProperty(identifier, identifier, undefined, true),
        );

    const wrapInFunction = (globalIds, body) =>
        t.functionExpression(
            null,
            [t.assignmentPattern(scopeId, t.objectExpression([]))],
            t.blockStatement(
                []
                    .concat(
                        globalIds.length
                            ? t.variableDeclaration(
                                  'var',
                                  globalIds.map(id => t.variableDeclarator(id)),
                              )
                            : [],
                    )
                    .concat(body)
                    .concat([t.returnStatement(scopeId)]),
            ),
        );

    const moduleExports = right =>
        t.exportNamedDeclaration(
            t.variableDeclaration('const', [
                t.variableDeclarator(t.identifier(options.exportName), right),
            ]),
            [],
        );

    const variableDeclaratorToScope = (path, identifier) => {
        const idPath = path.get('id');
        if (idPath.isObjectPattern() || idPath.isArrayPattern()) {
            path.insertAfter(
                t.variableDeclarator(
                    path.scope.generateUidIdentifier('temp'),
                    scopeSet(t.clone(identifier), t.clone(identifier)),
                ),
            );
        } else {
            const init = path.get('init');
            if (!init.node) return;
            // Q: Why not replace the parent VariableDeclaration node?
            // A: To not die debugging variable declaration order in a `for` loop if one of the binding should be ignored dew to introscope configuration (expected future feature). And it's simplier to implement :)
            init.replaceWith(scopeSet(path.get('id').node, init.node));
        }
    };

    const classDeclarationToScope = path => {
        const classExpression = t.clone(path.node);
        classExpression.type = 'ClassExpression';
        path.replaceWith(
            t.expressionStatement(
                scopeSet(path.get('id').node, classExpression),
            ),
        );
    };

    const functionDeclarationToScope = path => {
        const program = path.findParent(path => path.isProgram());
        program.unshiftContainer(
            'body',
            t.expressionStatement(
                scopeSet(path.get('id').node, path.get('id').node),
            ),
        );
    };

    const declarationToScope = (path, identifier) => {
        if (isInFlow(path)) {
            // ignore types
        } else if (path.isNodeType('VariableDeclarator')) {
            variableDeclaratorToScope(path, identifier);
        } else if (path.isNodeType('ClassDeclaration')) {
            classDeclarationToScope(path);
        } else if (path.isNodeType('FunctionDeclaration')) {
            functionDeclarationToScope(path);
        } else if (
            (path.isNodeType('ImportDefaultSpecifier') ||
                path.isNodeType('ImportSpecifier') ||
                path.isNodeType('ImportNamespaceSpecifier')) &&
            path.parentPath.isImportDeclaration()
        ) {
            if (
                path.node.importKind == 'type' ||
                path.parentPath.node.importKind == 'type'
            ) {
                return;
            }

            if (options.removeImports === true) {
                if (path.parentPath.node.source.value == 'introscope') {
                    return path.get('local').node;
                } else {
                    // ignore other than introscope imports
                }
            } else {
                return path.get('local').node;
            }
        } else {
            console.warn(
                'Cannot apply declarationToScope() to an anknown node.type: ' +
                    path.node.type +
                    '. Please, report to https://github.com/peter-leonov/introscope/issues/new',
            );
            // console.error(path.buildCodeFrameError());
        }
    };

    const replaceReferenceWithScope = path => {
        // do not touch flow types at all
        if (isInFlow(path)) return;
        // ExportNamedDeclaration gets properly processed by replaceMutationWithScope()
        if (path.node.type == 'ExportNamedDeclaration') return;
        // ExportSpecifier gets removed by unwrapOrRemoveExports()
        if (path.parent.type == 'ExportSpecifier') return;
        if (path.findParent(path => path.isObjectPattern())) return;

        const scoped = t.memberExpression(scopeId, path.node);
        if (path.parent && path.parent.type == 'CallExpression') {
            path.replaceWith(
                t.sequenceExpression([t.numericLiteral(0), scoped]),
            );
        } else {
            path.replaceWith(scoped);
        }
    };

    const replaceMutationWithScope = path => {
        if (isInFlow(path)) return;
        if (path.node.type == 'AssignmentExpression') {
            const left = path.get('left');
            left.replaceWith(t.memberExpression(scopeId, left.node));
        }
    };

    const bindingToScope = binding => {
        if (!binding) return;
        if (isInFlow(binding.path)) return;
        binding.referencePaths.forEach(replaceReferenceWithScope);
        binding.constantViolations.forEach(replaceMutationWithScope);
        return declarationToScope(binding.path, binding.identifier);
    };

    const bindingsToScope = bindings =>
        toPairs(bindings)
            .filter(([name, _]) => !options.ignore.has(name))
            .map(([_, binding]) => binding)
            .map(bindingToScope)
            .filter(Boolean);

    const parseConfig = path => {
        const comments =
            path.parent.comments ||
            path.parent.tokens.filter(byType('CommentLine'));
        comments.map(node => node.value).forEach(comment => {
            const [_, configJSON] = comment.split(/^\s*@introscope\s+/);
            if (configJSON) {
                let config = {};
                try {
                    config = JSON.parse(`{${configJSON}}`);
                } catch (ex) {
                    console.error('Error parsing Introscope config:', comment);
                }
                mergeIntoOptions(options, config);
            }
        });
    };

    const program = path => {
        parseConfig(path);
        if (!options.enable) {
            return false;
        }

        const globalIds = toPairs(path.scope.globals)
            .filter(([name, _]) => !options.ignore.has(name))
            .map(([_, identifier]) => identifier);
        const programGlobalNames = Object.keys(path.scope.globals);

        const localImportIds = bindingsToScope(path.scope.bindings);

        // unwrapOrRemoveExports() should go after bindingsToScope() as the latter treats `export var/let/const` as a reference and uses node.parent to distinguish
        unwrapOrRemoveExports(path);

        // reverse()-ing to preserve order after unshift()-ing
        localImportIds
            .reverse()
            .forEach(localId =>
                path.node.body.unshift(
                    t.expressionStatement(scopeSet(localId, localId)),
                ),
            );

        const programBody = path.node.body;
        if (options.removeImports === true) {
            const introscopeOnly = programBody
                .filter(byType('ImportDeclaration'))
                .filter(node => node.source.value == 'introscope');
            path.node.body = introscopeOnly;
        } else {
            const importsOnly = programBody.filter(byType('ImportDeclaration'));
            path.node.body = importsOnly;
        }
        const bodyWithoutImports = programBody.filter(
            not(byType('ImportDeclaration')),
        );

        path.pushContainer(
            'body',
            moduleExports(wrapInFunction(globalIds, bodyWithoutImports)),
        );

        // globals become locals after wrapInFunction()
        // TODO: make it more explicit in the code
        const globalBindings = {};
        path.traverse({
            Scope(path, state) {
                programGlobalNames.forEach(globalName => {
                    const binding = path.scope.getBinding(globalName);
                    globalBindings[globalName] = binding;
                });
            },
        });
        bindingsToScope(globalBindings);

        return true;
    };

    function test(path, statepath) {
        if (options.instrumentImports != 'query') return;

        const imports = path.node.body.filter(byType('ImportDeclaration'));
        imports
            .filter(node => node.specifiers.length == 1)
            .filter(
                node =>
                    node.specifiers[0].imported &&
                    node.specifiers[0].imported.name == 'introscope',
            )
            .forEach(node => {
                node.source.value += '?introscope';
            });
    }

    program(programPath) || test(programPath);
}

module.exports = function(babel) {
    return {
        visitor: {
            Program(path, state) {
                if (state.opts.disable) return;

                if (
                    typeof process == 'object' &&
                    process.env.NODE_ENV != 'test'
                ) {
                    return;
                }

                const opts = Object.assign({}, state.opts);

                processProgram(babel, path, opts);
            },
        },
    };
};
