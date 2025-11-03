/**
 * Regex pattern for validating hex color codes
 * Matches both 3-digit (#RGB) and 6-digit (#RRGGBB) formats
 */
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

/**
 * Validates if a string is a valid hex color code
 * @param color - Color string to validate
 * @returns true if valid hex color, false otherwise
 */
export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color)
}

/**
 * Validates hex color and returns error message if invalid
 * @param color - Color string to validate
 * @param fieldName - Optional field name for error message
 * @returns Error message if invalid, null if valid
 */
export function validateHexColor(color: string, fieldName: string = 'Color'): string | null {
  if (!isValidHexColor(color)) {
    return `Invalid ${fieldName.toLowerCase()} format. Please use hex format (e.g., #FFD700)`
  }
  return null
}

