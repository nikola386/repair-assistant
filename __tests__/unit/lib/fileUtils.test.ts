import { sanitizeFileName, generateUniqueFileName, getFileExtension } from '@/lib/fileUtils'

describe('fileUtils', () => {
  describe('sanitizeFileName', () => {
    it('should sanitize filename by removing special characters', () => {
      expect(sanitizeFileName('test file (1).jpg')).toBe('test_file__1_.jpg')
      expect(sanitizeFileName('file@name#123.png')).toBe('file_name_123.png')
    })

    it('should replace path separators', () => {
      expect(sanitizeFileName('../../file.jpg')).toBe('____file.jpg')
      expect(sanitizeFileName('path/to/file.jpg')).toBe('path_to_file.jpg')
    })

    it('should preserve valid characters', () => {
      expect(sanitizeFileName('valid-file123.jpg')).toBe('valid-file123.jpg')
      expect(sanitizeFileName('File.Name.jpg')).toBe('File.Name.jpg')
    })
  })

  describe('generateUniqueFileName', () => {
    const allowedExtensions = ['jpg', 'png', 'pdf'] as const

    it('should generate unique filename with correct format', () => {
      const fileName = generateUniqueFileName('profiles', 'user-1', 'photo.jpg', allowedExtensions)
      
      expect(fileName).toContain('profiles')
      expect(fileName).toContain('user-1')
      expect(fileName).toMatch(/\.jpg$/)
    })

    it('should include storeId in path when provided', () => {
      const fileName = generateUniqueFileName('profiles', 'user-1', 'photo.jpg', allowedExtensions, 'store-1')
      
      expect(fileName).toContain('store-1')
      expect(fileName).toContain('profiles')
    })

    it('should throw error for invalid extension', () => {
      expect(() => {
        generateUniqueFileName('profiles', 'user-1', 'file.exe', allowedExtensions)
      }).toThrow('Invalid file extension')
    })

    it('should throw error for files without extension when bin is not allowed', () => {
      expect(() => {
        generateUniqueFileName('profiles', 'user-1', 'file', allowedExtensions)
      }).toThrow('Invalid file extension')
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(getFileExtension('file.jpg')).toBe('jpg')
      expect(getFileExtension('file.PNG')).toBe('png')
      expect(getFileExtension('file.name.pdf')).toBe('pdf')
    })

    it('should return lowercase extension', () => {
      expect(getFileExtension('file.JPG')).toBe('jpg')
      expect(getFileExtension('file.PDF')).toBe('pdf')
    })

    it('should return "bin" for files without extension', () => {
      expect(getFileExtension('file')).toBe('bin')
      expect(getFileExtension('')).toBe('bin')
    })
  })
})

