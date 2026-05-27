import { useState, useEffect } from 'react';

export type Preferences = {
  subscribedCities: string[];
  subscribedTypes: string[];
  notificationsEnabled: boolean;
  radarNeighborhoods: string[];
};

const DEFAULT_PREFS: Preferences = {
  subscribedCities: [], // Empty means all, or user can select specific
  subscribedTypes: [], // Empty means all
  notificationsEnabled: false,
  radarNeighborhoods: [],
};

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<Preferences>(() => {
    const saved = localStorage.getItem('sentinelle_prefs');
    return saved ? JSON.parse(saved) : DEFAULT_PREFS;
  });

  const setPreferences = (newPrefs: Partial<Preferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('sentinelle_prefs', JSON.stringify(updated));
      return updated;
    });
  };

  return { preferences, setPreferences };
}
