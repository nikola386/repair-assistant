/**
 * Magic bytes (file signatures) for file type validation
 * These are the actual byte sequences at the beginning of files
 */
export const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/jpg': [[0xFF, 0xD8, 0xFF]], // Same as jpeg
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, WEBP follows
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
}

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

/**
 * Allowed file MIME types (images + PDF)
 */
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const

/**
 * Allowed file extensions for images
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const

/**
 * Allowed file extensions for files (images + PDF)
 */
export const ALLOWED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'] as const

/**
 * Maximum file size constants (in bytes)
 */
export const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * Validate file content using magic bytes to prevent file spoofing
 * @param file - The file to validate
 * @param expectedMimeType - The expected MIME type
 * @returns true if file content matches expected type, false otherwise
 */
export async function validateFileContent(
  file: File,
  expectedMimeType: string
): Promise<boolean> {
  const signatures = MAGIC_BYTES[expectedMimeType]
  if (!signatures) {
    return false
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  return signatures.some(signature => {
    if (bytes.length < signature.length) {
      return false
    }
    return signature.every((byte, index) => bytes[index] === byte)
  })
}

/**
 * Validates file type against allowed types
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if file type is allowed, false otherwise
 */
export function validateFileType(
  file: File,
  allowedTypes: readonly string[]
): boolean {
  return allowedTypes.includes(file.type)
}

/**
 * Validates file size
 * @param file - The file to validate
 * @param maxSize - Maximum file size in bytes
 * @returns true if file size is within limit, false otherwise
 */
export function validateFileSize(file: File, maxSize: number = MAX_FILE_SIZE): boolean {
  return file.size <= maxSize
}

/**
 * Validates file extension
 * @param fileName - The file name
 * @param allowedExtensions - Array of allowed extensions (without dot)
 * @returns true if extension is allowed, false otherwise
 */
export function validateFileExtension(
  fileName: string,
  allowedExtensions: readonly string[]
): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (!extension) {
    return false
  }
  return allowedExtensions.includes(extension as any)
}

