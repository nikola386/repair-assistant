'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface Step {
  number: number
  title: string
  description?: string
}

interface StepsProps {
  steps: Step[]
  currentStep: number
}

export default function Steps({ steps, currentStep }: StepsProps) {
  const { t } = useLanguage()

  return (
    <div className="steps-container">
      <div className="steps-list">
        {steps.map((step, index) => {
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number
          const isLast = index === steps.length - 1

          return (
            <div key={step.number} className="step-item">
              <div className="step-content">
                <div
                  className={`step-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  {isCompleted ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <div className="step-info">
                  <div className={`step-title ${isActive ? 'active' : ''}`}>
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="step-description">{step.description}</div>
                  )}
                </div>
              </div>
              {!isLast && (
                <div
                  className={`step-connector ${isCompleted ? 'completed' : ''}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

