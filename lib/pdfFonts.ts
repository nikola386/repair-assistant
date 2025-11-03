import { Font } from '@react-pdf/renderer'

const registerPdfFonts = async () => {
  try {
    await Font.register({
      family: 'Roboto',
      fonts: [
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
          fontWeight: 'normal' as const,
        },
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
          fontWeight: 'bold' as const,
        },
      ],
    })

    return true
  } catch (urlError: any) {
    console.warn('URL-based font registration failed, trying buffer approach:', urlError?.message || urlError)
    return false;
  }
}

let fontsRegistered = false
let registrationSuccess = false

export const ensurePdfFontsRegistered = async () => {
  if (fontsRegistered) {
    return registrationSuccess
  }
  
  try {
    registrationSuccess = await registerPdfFonts()
    fontsRegistered = true
    
    return registrationSuccess
  } catch (error: any) {
    console.error('Error registering PDF fonts:', error?.message || error)
    fontsRegistered = true
    registrationSuccess = false
    return false
  }
}

export const PDF_FONT_FAMILY = 'Roboto'