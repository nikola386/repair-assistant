/**
 * Sanitizes a filename by removing path separators and special characters
 * @param fileName - Original filename
 * @returns Sanitized filename safe for storage
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.\./g, '_')
}

/**
 * Generates a unique filename with timestamp and random suffix
 * @param prefix - Directory prefix (e.g., 'profiles', 'stores', 'tickets')
 * @param identifier - Unique identifier (e.g., userId, storeId, ticketId)
 * @param originalFileName - Original filename for extension extraction
 * @param allowedExtensions - Array of allowed file extensions
 * @param storeId - Optional store ID to organize files in store-specific directories
 * @returns Generated filename
 */
export function generateUniqueFileName(
  prefix: string,
  identifier: string,
  originalFileName: string,
  allowedExtensions: readonly string[],
  storeId?: string
): string {
  const timestamp = Date.now()
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 9)
  
  const sanitizedFileName = sanitizeFileName(originalFileName)
  const fileExtension = sanitizedFileName.split('.').pop()?.toLowerCase() || 'bin'
  
  if (!allowedExtensions.includes(fileExtension as any)) {
    throw new Error(`Invalid file extension: ${fileExtension}`)
  }
  
  if (storeId) {
    return `${storeId}/${prefix}/${identifier}-${timestamp}-${random}.${fileExtension}`
  }
  
  return `${prefix}/${identifier}-${timestamp}-${random}.${fileExtension}`
}

/**
 * Extracts file extension from filename
 * @param fileName - The filename
 * @returns File extension in lowercase, or 'bin' if not found
 */
export function getFileExtension(fileName: string): string {
  const sanitized = sanitizeFileName(fileName)
  const parts = sanitized.split('.')
  // If there's no dot or only one part (no extension), return 'bin'
  if (parts.length <= 1) {
    return 'bin'
  }
  return parts.pop()?.toLowerCase() || 'bin'
}

/**
 * Compresses and converts an image file to JPG format
 * Only processes image files (not PDFs or other file types)
 * @param file - The file to compress and convert
 * @returns Promise resolving to a compressed JPG File, or the original file if not an image
 */
export async function compressAndConvertToJpg(file: File): Promise<File> {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!imageTypes.includes(file.type)) {
    return file
  }

  try {
    const sharp = (await import('sharp')).default
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toBuffer()

    const compressedFile = new File(
      [new Uint8Array(compressedBuffer)],
      file.name.replace(/\.[^/.]+$/, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }
    )

    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)
    return file
  }
}

