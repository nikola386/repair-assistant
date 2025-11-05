'use client'

import React from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div
      className="confirmation-modal"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "confirmation-title" : undefined}
      aria-describedby="confirmation-message"
    >
      <div className="confirmation-modal__content">
        {title && (
          <div className="confirmation-modal__header">
            <h2 id="confirmation-title" className="confirmation-modal__title">
              {title}
            </h2>
            <button
              className="confirmation-modal__close"
              onClick={onCancel}
              aria-label="Close modal"
              type="button"
            >
              ×
            </button>
          </div>
        )}
        {!title && (
          <button
            className="confirmation-modal__close confirmation-modal__close--headerless"
            onClick={onCancel}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        )}
        <div className="confirmation-modal__body">
          <p id="confirmation-message" className="confirmation-modal__message">
            {message}
          </p>
        </div>
        <div className="confirmation-modal__footer">
          <button
            className="confirmation-modal__button confirmation-modal__button--cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-modal__button confirmation-modal__button--confirm confirmation-modal__button--confirm--${variant}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

