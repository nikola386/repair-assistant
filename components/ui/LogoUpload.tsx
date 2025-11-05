'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { HiCamera, HiCloudUpload } from 'react-icons/hi'

interface LogoUploadProps {
  preview: string
  onChange: (file: File | null) => void
  onRemove: () => void
  disabled?: boolean
  label?: string
  inputId?: string
  labelClassName?: string
  inputClassName?: string
}

export default function LogoUpload({
  preview,
  onChange,
  onRemove,
  disabled = false,
  label,
  inputId = 'logo',
  labelClassName,
  inputClassName,
}: LogoUploadProps) {
  const { t } = useLanguage()
  const displayLabel = label || t.onboarding?.logo || 'Logo'
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(file)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    onRemove()
    // Reset file input
    const fileInput = document.getElementById(inputId) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onChange(file)
    }
  }

  return (
    <div className="settings-page__logo-upload-wrapper">
      <label htmlFor={inputId} className={labelClassName || 'form-label'}>
        {displayLabel}
      </label>
      
      <div
        className={`settings-page__logo-upload-area ${preview ? 'has-preview' : ''} ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <>
            <div className="settings-page__logo-preview-container">
              <img
                src={preview}
                alt="Logo preview"
                className="settings-page__logo-preview"
              />
              <div className={`settings-page__logo-overlay ${isHovered ? 'visible' : ''}`}>
                <label
                  htmlFor={inputId}
                  className="settings-page__logo-overlay-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HiCamera className="settings-page__logo-overlay-icon" />
                </label>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="settings-page__logo-remove-btn"
                aria-label={t.profile?.deleteImage || 'Remove logo'}
              >
                ×
              </button>
            </div>
          </>
        ) : (
          <label htmlFor={inputId} className="settings-page__logo-upload-label">
            <div className="settings-page__logo-upload-content">
              <HiCloudUpload className="settings-page__logo-upload-icon" />
              <div className="settings-page__logo-upload-text">
                <span className="settings-page__logo-upload-main-text">
                  Click to upload or drag and drop
                </span>
                <span className="settings-page__logo-upload-sub-text">
                  PNG, JPG, GIF up to 10MB
                </span>
              </div>
            </div>
          </label>
        )}
        
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="settings-page__logo-hidden-input"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
