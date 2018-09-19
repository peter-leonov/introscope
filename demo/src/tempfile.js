const now = () => Date.now();

const rand = () => (Math.random() * 1e16).toFixed();

export const tempfile = () => `/var/tmp/file-${now()}-${rand()}`;
