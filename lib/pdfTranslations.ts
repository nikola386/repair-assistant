// Utility to load translations for PDF reports (server-side)
import { Language, isValidLanguage } from './languages'
import en from '../locales/en.json'
import bg from '../locales/bg.json'
import de from '../locales/de.json'

// Merge common translations with PDF-specific translations
function mergeTranslations(locale: typeof en): typeof en.reports.pdf {
  const pdf = locale.reports.pdf
  const common = locale.common
  
  return {
    ...pdf,
    // Override with common translations where they exist
    name: common.fields.name,
    email: common.fields.email,
    phone: common.fields.phone,
    date: common.fields.date,
    status: common.fields.status,
    priority: common.fields.priority,
    total: common.labels.total,
    customerInformation: common.info.customerInformation,
    deviceInformation: common.info.deviceInformation,
    importantDates: common.info.importantDates,
    dateReceived: common.dates.dateReceived,
    estimatedCompletion: common.dates.estimatedCompletion,
    completedOn: common.dates.completedOn,
    // Status and priority values
    pending: common.status.pending,
    inProgress: common.status.in_progress,
    waitingParts: common.status.waiting_parts,
    completed: common.status.completed,
    cancelled: common.status.cancelled,
    low: common.priority.low,
    medium: common.priority.medium,
    high: common.priority.high,
    urgent: common.priority.urgent,
  }
}

const translationsMap = {
  en: mergeTranslations(en),
  bg: mergeTranslations(bg),
  de: mergeTranslations(de),
}

export type PdfTranslations = ReturnType<typeof mergeTranslations>

export function getPdfTranslations(language: string): PdfTranslations {
  const lang = isValidLanguage(language) ? language : 'en'
  return translationsMap[lang] || translationsMap.en
}

