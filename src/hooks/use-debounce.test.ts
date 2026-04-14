import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebounce } from './use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call fn immediately', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 500))

    result.current('arg1')
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls fn after delay elapses', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 500))

    result.current('arg1')
    act(() => { vi.advanceTimersByTime(500) })
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('arg1')
  })

  it('resets timer on each call (debounce behavior)', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 500))

    result.current('call1')
    act(() => { vi.advanceTimersByTime(300) })
    result.current('call2')
    act(() => { vi.advanceTimersByTime(300) })
    // Only 600ms elapsed since second call (300+300), but 300ms since second trigger
    // fn should NOT have fired yet
    expect(fn).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(200) })
    // Now 500ms since last call — should fire exactly once with last args
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('call2')
  })

  it('fires only once even with many rapid calls', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 2000))

    // Simulate 10 rapid calls (like rapid node moves)
    for (let i = 0; i < 10; i++) {
      result.current(`update-${i}`)
      act(() => { vi.advanceTimersByTime(100) })
    }
    // 1000ms elapsed, timer not yet done
    expect(fn).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(2000) })
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('update-9')
  })

  it('calls fn again after a second call past the delay', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 500))

    result.current('first')
    act(() => { vi.advanceTimersByTime(500) })
    expect(fn).toHaveBeenCalledOnce()

    result.current('second')
    act(() => { vi.advanceTimersByTime(500) })
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('second')
  })

  it('passes multiple arguments correctly', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 100))

    result.current('a', 'b', 'c')
    act(() => { vi.advanceTimersByTime(100) })
    expect(fn).toHaveBeenCalledWith('a', 'b', 'c')
  })

  it('uses the latest fn reference (stale closure safety)', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    let currentFn = fn1

    const { result, rerender } = renderHook(() => useDebounce(currentFn, 500))

    result.current('arg')
    // Update fn reference before timer fires
    currentFn = fn2
    rerender()

    act(() => { vi.advanceTimersByTime(500) })

    // Should call the latest fn (fn2), not the stale fn1
    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledWith('arg')
  })
})
