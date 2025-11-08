import { db } from './db'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from './constants'
import type { Settings } from '@prisma/client'

export type { Settings }
export interface UpdateSettingsInput {
  primaryColor?: string
  secondaryColor?: string
  language?: string
  defaultWarrantyPeriodDays?: number
}

export class SettingsStorage {
  async findByStoreId(storeId: string): Promise<Settings | null> {
    return db.settings.findUnique({
      where: { storeId },
    })
  }

  async createOrUpdate(storeId: string, data: UpdateSettingsInput): Promise<Settings> {
    return db.settings.upsert({
      where: { storeId },
      update: {
        primaryColor: data.primaryColor ?? undefined,
        secondaryColor: data.secondaryColor ?? undefined,
        language: data.language ?? undefined,
        defaultWarrantyPeriodDays: data.defaultWarrantyPeriodDays ?? undefined,
      },
      create: {
        storeId,
        primaryColor: data.primaryColor ?? DEFAULT_PRIMARY_COLOR,
        secondaryColor: data.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
        language: data.language ?? 'en',
        defaultWarrantyPeriodDays: data.defaultWarrantyPeriodDays ?? 30,
      },
    })
  }

  async updateColors(storeId: string, primaryColor?: string, secondaryColor?: string): Promise<Settings> {
    const updateData: UpdateSettingsInput = {}
    
    if (primaryColor !== undefined) {
      updateData.primaryColor = primaryColor
    }
    
    if (secondaryColor !== undefined) {
      updateData.secondaryColor = secondaryColor
    }

    return this.createOrUpdate(storeId, updateData)
  }

  async updateLanguage(storeId: string, language: string): Promise<Settings> {
    return this.createOrUpdate(storeId, { language })
  }
}

export const settingsStorage = new SettingsStorage()

