import { introscope } from './inc'

test('inc() adds 1', async () => {
    const { inc } = introscope();
    expect(inc(1)).toBe(2);
});
