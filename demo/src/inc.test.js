import { introscope } from './inc'

test('inc', () => {
    const scope = introscope();
    expect(scope.inc(1)).toBe(2);
});
