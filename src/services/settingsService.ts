
export const STORAGE_KEYS = {
  telefun: 'telefun_app_settings_v1',
  ketik: 'ketik_app_settings_v2',
  pdkt: 'emotion_app_settings_email_v2',
};

export async function loadSettings<T>(
  module: 'telefun' | 'ketik' | 'pdkt',
  userId: string,
  fallback: T
): Promise<T> {
  // 1. Try server first
  try {
    const res = await fetch(`/api/settings/${module}/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        // Cache to localStorage
        localStorage.setItem(STORAGE_KEYS[module], JSON.stringify(data));
        return { ...fallback, ...data };
      }
    }
  } catch (e) {
    console.warn(`[SettingsService] Server unavailable or error, using localStorage for ${module}:`, e);
  }

  // 2. Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[module]);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...fallback, ...parsed };
    }
  } catch (e) {
    console.warn(`[SettingsService] localStorage parse error for ${module}:`, e);
  }

  return fallback;
}

export async function saveSettings<T>(
  module: 'telefun' | 'ketik' | 'pdkt',
  userId: string,
  settings: T
): Promise<void> {
  // Always save to localStorage immediately (cache)
  localStorage.setItem(STORAGE_KEYS[module], JSON.stringify(settings));

  // Try to save to server
  try {
    const response = await fetch(`/api/settings/${module}/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }
  } catch (e) {
    console.warn(`[SettingsService] Failed to save to server for ${module}:`, e);
  }
}
