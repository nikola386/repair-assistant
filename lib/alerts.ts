import toast from 'react-hot-toast'

/**
 * Utility functions for displaying alerts using react-hot-toast
 */
export const showAlert = {
  /**
   * Show an error alert
   */
  error: (message: string) => {
    toast.error(message)
  },

  /**
   * Show a success alert
   */
  success: (message: string) => {
    toast.success(message)
  },

  /**
   * Show an info alert
   */
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
    })
  },

  /**
   * Show a warning alert
   */
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
    })
  },
}

