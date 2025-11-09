import {
  validateFileType,
  validateFileSize,
  validateFileExtension,
  validateFileContent,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/fileValidation'

describe('fileValidation', () => {
  describe('validateFileType', () => {
    it('should return true for allowed image types', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      expect(validateFileType(file, ALLOWED_IMAGE_TYPES)).toBe(true)
    })

    it('should return false for disallowed types', () => {
      const file = new File([''], 'test.exe', { type: 'application/x-msdownload' })
      expect(validateFileType(file, ALLOWED_IMAGE_TYPES)).toBe(false)
    })
  })

  describe('validateFileSize', () => {
    it('should return true for files within size limit', () => {
      const file = new File(['x'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' })
      expect(validateFileSize(file, MAX_FILE_SIZE)).toBe(true)
    })

    it('should return false for files exceeding size limit', () => {
      const largeFile = new File(['x'.repeat(MAX_FILE_SIZE + 1)], 'test.jpg', { type: 'image/jpeg' })
      expect(validateFileSize(largeFile, MAX_FILE_SIZE)).toBe(false)
    })

    it('should use custom max size when provided', () => {
      const file = new File(['x'.repeat(5000)], 'test.jpg', { type: 'image/jpeg' })
      expect(validateFileSize(file, 10000)).toBe(true)
      expect(validateFileSize(file, 1000)).toBe(false)
    })
  })

  describe('validateFileExtension', () => {
    it('should return true for allowed extensions', () => {
      expect(validateFileExtension('file.jpg', ['jpg', 'png'])).toBe(true)
      expect(validateFileExtension('file.PNG', ['jpg', 'png'])).toBe(true)
    })

    it('should return false for disallowed extensions', () => {
      expect(validateFileExtension('file.exe', ['jpg', 'png'])).toBe(false)
      expect(validateFileExtension('file', ['jpg', 'png'])).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(validateFileExtension('file.JPG', ['jpg', 'png'])).toBe(true)
      expect(validateFileExtension('file.Png', ['jpg', 'png'])).toBe(true)
    })
  })

  describe('validateFileContent', () => {
    it('should validate JPEG file content', async () => {
      // JPEG magic bytes: FF D8 FF
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10])
      const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' })
      // Mock arrayBuffer method for Node.js environment
      file.arrayBuffer = jest.fn().mockResolvedValue(jpegBytes.buffer)
      
      const result = await validateFileContent(file, 'image/jpeg')
      expect(result).toBe(true)
    })

    it('should validate PNG file content', async () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
      const file = new File([pngBytes], 'test.png', { type: 'image/png' })
      // Mock arrayBuffer method for Node.js environment
      file.arrayBuffer = jest.fn().mockResolvedValue(pngBytes.buffer)
      
      const result = await validateFileContent(file, 'image/png')
      expect(result).toBe(true)
    })

    it('should validate PDF file content', async () => {
      // PDF magic bytes: 25 50 44 46 (%PDF)
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
      const file = new File([pdfBytes], 'test.pdf', { type: 'application/pdf' })
      // Mock arrayBuffer method for Node.js environment
      file.arrayBuffer = jest.fn().mockResolvedValue(pdfBytes.buffer)
      
      const result = await validateFileContent(file, 'application/pdf')
      expect(result).toBe(true)
    })

    it('should return false for mismatched content', async () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF])
      const file = new File([jpegBytes], 'test.png', { type: 'image/png' })
      // Mock arrayBuffer method for Node.js environment
      file.arrayBuffer = jest.fn().mockResolvedValue(jpegBytes.buffer)
      
      const result = await validateFileContent(file, 'image/png')
      expect(result).toBe(false)
    })

    it('should return false for unknown MIME type', async () => {
      const file = new File([''], 'test.xyz', { type: 'application/xyz' })
      // Mock arrayBuffer method for Node.js environment
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0))
      
      const result = await validateFileContent(file, 'application/xyz')
      expect(result).toBe(false)
    })
  })
})

