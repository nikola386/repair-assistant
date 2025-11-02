import { db } from './db'
import { userStorage } from './userStorage'

/**
 * Check if a user has completed onboarding
 * Onboarding is complete when:
 * 1. User has a store
 * 2. Store's onboarded flag is true
 */
export async function isOnboardingComplete(userId: string): Promise<boolean> {
  try {
    // Get user's store ID
    const storeId = await userStorage.getStoreId(userId)
    if (!storeId) {
      return false
    }

    // Get store to check onboarded flag
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { onboarded: true },
    })

    return store?.onboarded === true
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return false
  }
}

/**
 * Get onboarding status for a user
 * Returns detailed onboarding information
 */
export async function getOnboardingStatus(userId: string): Promise<{
  isComplete: boolean
  storeId: string | null
  storeOnboarded: boolean
}> {
  try {
    const storeId = await userStorage.getStoreId(userId)
    if (!storeId) {
      return {
        isComplete: false,
        storeId: null,
        storeOnboarded: false,
      }
    }

    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { onboarded: true },
    })

    const storeOnboarded = store?.onboarded === true

    return {
      isComplete: storeOnboarded,
      storeId,
      storeOnboarded: storeOnboarded || false,
    }
  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return {
      isComplete: false,
      storeId: null,
      storeOnboarded: false,
    }
  }
}

