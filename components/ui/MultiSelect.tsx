'use client'

import { useState, useRef, useEffect } from 'react'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  allLabel?: string
  id?: string
  className?: string
}

export default function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select...',
  allLabel = 'All',
  id,
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = (value: string) => {
    if (value === 'all') {
      // Toggle "All" - clear all selections (empty = all)
      onChange([])
    } else {
      // Toggle individual option
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value]
      onChange(newValues)
    }
  }

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return allLabel
    }
    if (selectedValues.length === 1) {
      const option = options.find((opt) => opt.value === selectedValues[0])
      return option ? option.label : selectedValues[0]
    }
    return `${selectedValues.length} selected`
  }

  // "All" is selected when no specific values are selected (empty array)
  const allSelected = selectedValues.length === 0

  return (
    <div className={`multi-select ${className}`} style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="multi-select__button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="multi-select__button-text">{getDisplayText()}</span>
        <svg
          className={`multi-select__chevron ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="multi-select__dropdown"
          role="listbox"
        >
          <div
            className={`multi-select__option ${allSelected ? 'selected' : ''}`}
            role="option"
            aria-selected={allSelected}
            onClick={() => handleToggle('all')}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {}} // Handled by parent onClick
              className="multi-select__checkbox"
              tabIndex={-1}
            />
            <span className="multi-select__option-label">{allLabel}</span>
          </div>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value)
            return (
              <div
                key={option.value}
                className={`multi-select__option ${isSelected ? 'selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleToggle(option.value)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // Handled by parent onClick
                  className="multi-select__checkbox"
                  tabIndex={-1}
                />
                <span className="multi-select__option-label">{option.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

