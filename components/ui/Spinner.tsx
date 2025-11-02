'use client'

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function Spinner({ size = 'medium', className = '' }: SpinnerProps) {
  const sizeClasses = {
    small: 'spinner--small',
    medium: 'spinner--medium',
    large: 'spinner--large',
  }

  return (
    <div className={`spinner ${sizeClasses[size]} ${className}`} role="status" aria-label="Loading">
      <div className="spinner__circle"></div>
    </div>
  )
}

