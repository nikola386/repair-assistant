import { renderHook, act } from '@testing-library/react'
import { useConfirmation } from '@/lib/useConfirmation'

describe('useConfirmation', () => {
  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useConfirmation())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.message).toBe('')
  })

  it('should open confirmation dialog when confirm is called', async () => {
    const { result } = renderHook(() => useConfirmation())

    let resolvedValue: boolean | undefined

    act(() => {
      result.current.confirm({
        message: 'Are you sure?',
        title: 'Confirm Action',
      }).then((value) => {
        resolvedValue = value
      })
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.message).toBe('Are you sure?')
    expect(result.current.title).toBe('Confirm Action')
  })

  it('should resolve with true when confirmed', async () => {
    const { result } = renderHook(() => useConfirmation())

    let resolvedValue: boolean | undefined

    act(() => {
      result.current.confirm({
        message: 'Are you sure?',
      }).then((value) => {
        resolvedValue = value
      })
    })

    act(() => {
      result.current.onConfirm()
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(resolvedValue).toBe(true)
    expect(result.current.isOpen).toBe(false)
  })

  it('should resolve with false when cancelled', async () => {
    const { result } = renderHook(() => useConfirmation())

    let resolvedValue: boolean | undefined

    act(() => {
      result.current.confirm({
        message: 'Are you sure?',
      }).then((value) => {
        resolvedValue = value
      })
    })

    act(() => {
      result.current.onCancel()
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(resolvedValue).toBe(false)
    expect(result.current.isOpen).toBe(false)
  })

  it('should use custom confirm and cancel text', () => {
    const { result } = renderHook(() => useConfirmation())

    act(() => {
      result.current.confirm({
        message: 'Are you sure?',
        confirmText: 'Yes, delete',
        cancelText: 'No, keep',
      })
    })

    expect(result.current.confirmText).toBe('Yes, delete')
    expect(result.current.cancelText).toBe('No, keep')
  })

  it('should support variant prop', () => {
    const { result } = renderHook(() => useConfirmation())

    act(() => {
      result.current.confirm({
        message: 'Are you sure?',
        variant: 'danger',
      })
    })

    expect(result.current.variant).toBe('danger')
  })
})

