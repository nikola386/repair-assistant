import { showAlert } from '@/lib/alerts'
import toast from 'react-hot-toast'

jest.mock('react-hot-toast')

const mockToast = toast as jest.Mocked<typeof toast>

describe('alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('showAlert.error', () => {
    it('should call toast.error with message', () => {
      showAlert.error('Error message')
      expect(mockToast.error).toHaveBeenCalledWith('Error message')
    })
  })

  describe('showAlert.success', () => {
    it('should call toast.success with message', () => {
      showAlert.success('Success message')
      expect(mockToast.success).toHaveBeenCalledWith('Success message')
    })
  })

  describe('showAlert.info', () => {
    it('should call toast with info icon', () => {
      showAlert.info('Info message')
      expect(mockToast).toHaveBeenCalledWith('Info message', { icon: 'ℹ️' })
    })
  })

  describe('showAlert.warning', () => {
    it('should call toast with warning icon', () => {
      showAlert.warning('Warning message')
      expect(mockToast).toHaveBeenCalledWith('Warning message', { icon: '⚠️' })
    })
  })
})

