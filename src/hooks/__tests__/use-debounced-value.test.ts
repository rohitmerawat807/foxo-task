import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '../use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('only emits the last value once typing pauses', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: '' } },
    );

    for (const value of ['p', 'ph', 'pho', 'phon', 'phone']) {
      await rerender({ value });
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(result.current).toBe('');
    }

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('phone');
  });
});
