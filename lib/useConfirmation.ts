import { useState, useCallback } from 'react'

interface ConfirmationOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean
  resolve?: (value: boolean) => void
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    message: '',
  })

  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          ...options,
          isOpen: true,
          resolve,
        })
      })
    },
    []
  )

  const handleConfirm = useCallback(() => {
    if (state.resolve) {
      state.resolve(true)
    }
    setState({
      isOpen: false,
      message: '',
    })
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    if (state.resolve) {
      state.resolve(false)
    }
    setState({
      isOpen: false,
      message: '',
    })
  }, [state.resolve])

  return {
    confirm,
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    variant: state.variant,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  }
}

