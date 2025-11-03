import { Font } from '@react-pdf/renderer'

// Register fonts that support Cyrillic characters
// Using Roboto from Google Fonts which has excellent Cyrillic support
const registerPdfFonts = async () => {
  // First, try URL-based registration (simpler, works in most environments)
  try {
    await Font.register({
      family: 'Roboto',
      fonts: [
        {
          src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
          fontWeight: 'normal' as const,
        },
        {
          src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf',
          fontWeight: 'bold' as const,
        },
      ],
    })
    console.log('Successfully registered Roboto font via URL for Cyrillic support')
    return true
  } catch (urlError: any) {
    console.warn('URL-based font registration failed, trying buffer approach:', urlError?.message || urlError)
    
    // Fallback: Download fonts and register as buffers
    try {
      const normalFontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf'
      const boldFontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf'
      
      const normalResponse = await fetch(normalFontUrl)
      const boldResponse = await fetch(boldFontUrl)
      
      if (!normalResponse.ok || !boldResponse.ok) {
        throw new Error('Failed to fetch font files')
      }
      
      const normalBuffer = await normalResponse.arrayBuffer()
      const boldBuffer = await boldResponse.arrayBuffer()
      
      // Convert to Buffer for @react-pdf/renderer
      const normalBuf = Buffer.from(normalBuffer)
      const boldBuf = Buffer.from(boldBuffer)
      
      // Try registering with Buffer
      await Font.register({
        family: 'Roboto',
        fonts: [
          {
            src: normalBuf,
            fontWeight: 'normal' as const,
          },
          {
            src: boldBuf,
            fontWeight: 'bold' as const,
          },
        ],
      })
      
      console.log('Successfully registered Roboto font via buffer for Cyrillic support')
      return true
    } catch (bufferError: any) {
      console.error('Both URL and buffer font registration failed:', bufferError?.message || bufferError)
      return false
    }
  }
}

// Font registration state
let fontsRegistered = false
let registrationSuccess = false

// Export font family constants
// Times-Roman has much better Unicode/Cyrillic support than Helvetica
export const PDF_FONT_FAMILY_FALLBACK = 'Times-Roman'

// Use Times-Roman as the default safe font that supports Cyrillic better than Helvetica
// If Roboto registration succeeds, we can use it, but Times-Roman should already fix the issue
export const PDF_FONT_FAMILY = 'Times-Roman'

export const ensurePdfFontsRegistered = async () => {
  if (fontsRegistered) {
    if (registrationSuccess) {
      console.log('Fonts already registered successfully')
    } else {
      console.warn('Previous font registration failed, using Times-Roman fallback')
    }
    return registrationSuccess
  }
  
  console.log('Registering PDF fonts for Cyrillic support...')
  try {
    registrationSuccess = await registerPdfFonts()
    fontsRegistered = true
    
    if (registrationSuccess) {
      console.log('✓ Roboto font registered successfully - optimal Cyrillic support')
      console.log('  Note: Components use Times-Roman by default (also supports Cyrillic)')
    } else {
      console.warn('✗ Roboto font registration failed')
      console.warn('  Using Times-Roman (better Cyrillic support than Helvetica)')
    }
    
    return registrationSuccess
  } catch (error: any) {
    console.error('Error registering PDF fonts:', error?.message || error)
    fontsRegistered = true
    registrationSuccess = false
    console.warn('Falling back to Times-Roman for PDF fonts')
    return false
  }
}

// Helper to check if Roboto is available (for future dynamic font selection)
export const isRobotoAvailable = () => {
  return registrationSuccess
}
