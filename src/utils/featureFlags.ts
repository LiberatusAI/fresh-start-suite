/**
 * Feature flag utilities for gradual rollout of new features
 */

export const FeatureFlags = {
  /**
   * Controls whether to use the new value-first onboarding flow
   * vs the existing plan-selection-first flow
   */
  VALUE_FIRST_ONBOARDING: (import.meta.env.VITE_ENABLE_VALUE_FIRST_ONBOARDING || "") === 'true' || !import.meta.env.DEV,
} as const;

/**
 * Check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: keyof typeof FeatureFlags): boolean => {
  return FeatureFlags[flag];
};

/**
 * Get the appropriate signup flow based on feature flags
 */
export const getSignupFlow = (): 'value-first' | 'plan-first' => {
  return isFeatureEnabled('VALUE_FIRST_ONBOARDING') ? 'value-first' : 'plan-first';
};

/**
 * Development utilities for testing feature flags
 */
export const FeatureFlagUtils = {
  /**
   * Override feature flags for testing (development only)
   */
  override: (flag: keyof typeof FeatureFlags, value: boolean) => {
    if (import.meta.env.DEV) {
      // @ts-ignore - Runtime override for development
      FeatureFlags[flag] = value;
      console.log(`🚩 Feature flag ${flag} overridden to: ${value}`);
    } else {
      console.warn('Feature flag overrides are only available in development');
    }
  },

  /**
   * Log current feature flag states (development only)
   */
  debug: () => {
    if (import.meta.env.DEV) {
      console.log('🚩 Current feature flags:', FeatureFlags);
    }
  }
};