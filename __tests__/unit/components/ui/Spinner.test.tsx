import { render, screen } from '@testing-library/react'
import Spinner from '@/components/ui/Spinner'

describe('Spinner', () => {
  it('should render with default size', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status', { name: 'Loading' })
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('spinner', 'spinner--medium')
  })

  it('should render with small size', () => {
    render(<Spinner size="small" />)
    const spinner = screen.getByRole('status', { name: 'Loading' })
    expect(spinner).toHaveClass('spinner--small')
  })

  it('should render with large size', () => {
    render(<Spinner size="large" />)
    const spinner = screen.getByRole('status', { name: 'Loading' })
    expect(spinner).toHaveClass('spinner--large')
  })

  it('should apply custom className', () => {
    render(<Spinner className="custom-class" />)
    const spinner = screen.getByRole('status', { name: 'Loading' })
    expect(spinner).toHaveClass('custom-class')
  })
})

