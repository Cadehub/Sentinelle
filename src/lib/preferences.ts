import { useState } from "react";
import { getRegionFromCity } from "./regions";

export type Preferences = {
  subscribedRegions: string[];
  subscribedTypes: string[];
  notificationsEnabled: boolean;
  radarNeighborhoods: string[];
  dangerRadius: number;
  interactedAlerts: string[];
  language: string;
};

const DEFAULT_PREFS: Preferences = {
  subscribedRegions: [],
  subscribedTypes: [],
  notificationsEnabled: false,
  radarNeighborhoods: [],
  dangerRadius: 5,
  interactedAlerts: [],
  language: "fr",
};

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<Preferences>(() => {
    const saved = localStorage.getItem("sentinelle_prefs");
    if (!saved) return DEFAULT_PREFS;
    try {
      const parsed = JSON.parse(saved) as Partial<Preferences> & { subscribedCities?: string[] };
      const merged: Preferences = { ...DEFAULT_PREFS, ...parsed } as Preferences;

      if ((!Array.isArray(merged.subscribedRegions) || merged.subscribedRegions.length === 0) && Array.isArray(parsed.subscribedCities) && parsed.subscribedCities.length > 0) {
        merged.subscribedRegions = Array.from(
          new Set(parsed.subscribedCities.map(getRegionFromCity).filter((r) => r !== "Autre"))
        );
      }

      localStorage.setItem("sentinelle_prefs", JSON.stringify(merged));
      return merged;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const setPreferences = (newPrefs: Partial<Preferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem("sentinelle_prefs", JSON.stringify(updated));
      return updated;
    });
  };

  return { preferences, setPreferences };
}
