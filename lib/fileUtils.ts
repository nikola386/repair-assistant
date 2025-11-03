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
 * @returns Generated filename
 */
export function generateUniqueFileName(
  prefix: string,
  identifier: string,
  originalFileName: string,
  allowedExtensions: readonly string[]
): string {
  const timestamp = Date.now()
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 9)
  
  // Sanitize and extract extension
  const sanitizedFileName = sanitizeFileName(originalFileName)
  const fileExtension = sanitizedFileName.split('.').pop()?.toLowerCase() || 'bin'
  
  // Validate extension
  if (!allowedExtensions.includes(fileExtension as any)) {
    throw new Error(`Invalid file extension: ${fileExtension}`)
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
  return sanitized.split('.').pop()?.toLowerCase() || 'bin'
}

