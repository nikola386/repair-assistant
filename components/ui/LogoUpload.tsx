'use client'

import { useLanguage } from '@/contexts/LanguageContext'

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(file)
    }
  }

  const handleRemove = () => {
    onChange(null)
    onRemove()
    // Reset file input
    const fileInput = document.getElementById(inputId) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  return (
    <>
      <label htmlFor={inputId} className={labelClassName || 'form-label'}>
        {displayLabel}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className={inputClassName || 'form-input'}
        disabled={disabled}
      />
      {preview && (
        <div className="settings-page__logo-preview-container">
          <img
            src={preview}
            alt="Logo preview"
            className="settings-page__logo-preview"
          />
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
      )}
    </>
  )
}
