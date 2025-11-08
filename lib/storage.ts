import { put, del } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Storage abstraction that falls back to local storage if BLOB_READ_WRITE_TOKEN is not available
 */

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

/**
 * Check if blob storage is available
 */
function isBlobStorageAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

/**
 * Ensure uploads directory exists (for local storage)
 */
async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating uploads directory:', error)
    throw error
  }
}

/**
 * Upload a file to storage (blob or local)
 * @param fileName - The filename/path for the file
 * @param file - The file to upload
 * @param options - Upload options
 * @returns Promise resolving to the file URL
 */
export async function uploadFile(
  fileName: string,
  file: File | Buffer,
  options?: {
    contentType?: string
    access?: 'public' | 'private'
  }
): Promise<string> {
  if (isBlobStorageAvailable()) {
    try {
      let fileData: File | ArrayBuffer | Uint8Array
      if (file instanceof File) {
        fileData = file
      } else if (Buffer.isBuffer(file)) {
        fileData = new Uint8Array(file)
      } else {
        fileData = file
      }
      
      const putOptions = {
        access: (options?.access || 'public') as 'public' | 'private',
        contentType: options?.contentType,
      }
      const blob = await put(fileName, fileData as any, putOptions as any)
      return blob.url
    } catch (error) {
      console.error('Error uploading to blob storage, falling back to local storage:', error)
    }
  }
  
  await ensureUploadsDir()
  
  const filePath = path.join(UPLOADS_DIR, fileName)
  const dirPath = path.dirname(filePath)
  
  await fs.mkdir(dirPath, { recursive: true })
  
  const buffer = file instanceof File 
    ? Buffer.from(await file.arrayBuffer())
    : file
  
  await fs.writeFile(filePath, buffer)
  
  return `/uploads/${fileName}`
}

/**
 * Delete a file from storage (blob or local)
 * @param url - The file URL to delete
 */
export async function deleteFile(url: string): Promise<void> {
  if (url.startsWith('https://')) {
    if (isBlobStorageAvailable()) {
      try {
        await del(url)
      } catch (error) {
        console.error('Error deleting blob file:', error)
      }
    }
  } else if (url.startsWith('/uploads/')) {
    try {
      const fileName = url.replace('/uploads/', '')
      const filePath = path.join(UPLOADS_DIR, fileName)
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error deleting local file:', error)
      }
    }
  }
}

/**
 * Check if a URL is from blob storage
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('https://')
}

