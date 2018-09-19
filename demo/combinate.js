const onlyKeys = (src, keys) => {
    const res = {};
    keys.forEach(key => {
        res[key] = src[key];
    });
    return res;
};

const flatten = aa => aa.reduce((acc, a) => acc.concat(a), []);

const permute = obj => {
    const keys = Object.keys(obj);
    if (keys.length === 0) return [{}];

    const key = keys.pop();
    const variants = obj[key];

    const combinations = permute(onlyKeys(obj, keys));
    return flatten(
        variants.map(variant =>
            combinations.map(combination => ({
                ...combination,
                [key]: variant,
            })),
        ),
    );
};

const split = combination =>
    Object.entries(combination).reduce(
        ([names, values], [key, [name, value]]) => [
            { ...names, [key]: name },
            { ...values, [key]: value },
        ],
        [{}, {}],
    );

const makeName = names =>
    Object.entries(names)
        .map(([key, name]) => `${key}: ${name}`)
        .join(', ');

export const combinate = (cases, cb) =>
    permute(cases).forEach(combination => {
        const [names, values] = split(combination);
        const name = makeName(names);
        cb(name, values);
    });
