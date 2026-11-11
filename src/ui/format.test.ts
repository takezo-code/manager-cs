import { expect, it } from 'vitest';
import { fmtSatisfaction } from './format';

it('satisfação aparece arredondada', () => {
  expect(fmtSatisfaction(70.60000000000001)).toBe('71');
  expect(fmtSatisfaction(45)).toBe('45');
});
