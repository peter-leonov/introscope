import { introscope } from './inc'

test('inc', () => {
    const scope = introscope();
    scope.ONE = 100;
    expect(scope.inc(1)).toBe(101);
});
