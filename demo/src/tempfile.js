const now = () => Date.now();
const rand = () => Math.random();

export const tempfile = () => `/var/tmp/${now()}-${rand()}`;