import { uploadFile, deleteFile, isBlobUrl } from '@/lib/storage'
import { put, del, head } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'

jest.mock('@vercel/blob')
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
}))

const mockPut = put as jest.MockedFunction<typeof put>
const mockDel = del as jest.MockedFunction<typeof del>
const mockHead = head as jest.MockedFunction<typeof head>
const mockFs = fs as jest.Mocked<typeof fs>

describe('storage', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('uploadFile', () => {
    it('should upload to blob storage when available', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.jpg' } as any)

      const result = await uploadFile('test.jpg', mockFile)

      expect(result).toBe('https://blob.vercel-storage.com/test.jpg')
      expect(mockPut).toHaveBeenCalled()
    })

    it('should fallback to local storage when blob fails', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
      // Create a proper File mock with arrayBuffer method
      const arrayBufferMock = jest.fn().mockResolvedValue(new ArrayBuffer(8))
      const mockFile = Object.create(File.prototype)
      mockFile.arrayBuffer = arrayBufferMock
      // Make it pass instanceof File check
      Object.defineProperty(mockFile, Symbol.toStringTag, { value: 'File' })
      mockPut.mockRejectedValue(new Error('Blob error'))
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await uploadFile('test.jpg', mockFile as File)

      expect(result).toBe('/uploads/test.jpg')
      expect(mockFs.writeFile).toHaveBeenCalled()
    })

    it('should use local storage when blob token not available', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN
      // Create a proper File mock with arrayBuffer method
      const arrayBufferMock = jest.fn().mockResolvedValue(new ArrayBuffer(8))
      const mockFile = Object.create(File.prototype)
      mockFile.arrayBuffer = arrayBufferMock
      // Make it pass instanceof File check
      Object.defineProperty(mockFile, Symbol.toStringTag, { value: 'File' })
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await uploadFile('test.jpg', mockFile as File)

      expect(result).toBe('/uploads/test.jpg')
      expect(mockPut).not.toHaveBeenCalled()
      expect(mockFs.writeFile).toHaveBeenCalled()
    })

    it('should handle Buffer input', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN
      const buffer = Buffer.from('test data')
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)

      const result = await uploadFile('test.jpg', buffer)

      expect(result).toBe('/uploads/test.jpg')
      expect(mockFs.writeFile).toHaveBeenCalled()
    })
  })

  describe('deleteFile', () => {
    it('should delete from blob storage when URL is blob URL', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
      mockDel.mockResolvedValue(undefined)

      await deleteFile('https://blob.vercel-storage.com/test.jpg')

      expect(mockDel).toHaveBeenCalledWith('https://blob.vercel-storage.com/test.jpg')
    })

    it('should delete from local storage when URL is local', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN
      mockFs.unlink.mockResolvedValue(undefined)

      await deleteFile('/uploads/test.jpg')

      expect(mockFs.unlink).toHaveBeenCalled()
      expect(mockDel).not.toHaveBeenCalled()
    })
  })

  describe('isBlobUrl', () => {
    it('should return true for blob URLs', () => {
      const url = 'https://blob.vercel-storage.com/test.jpg'
      expect(isBlobUrl(url)).toBe(true)
    })

    it('should return false for local URLs', () => {
      const url = '/uploads/test.jpg'
      expect(isBlobUrl(url)).toBe(false)
    })
  })
})

