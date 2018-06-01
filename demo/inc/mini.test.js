import { introscope } from './mini'

test('inc() adds 1', async () => {
    const { inc } = introscope();
    expect(inc(1)).toBe(2);
});
