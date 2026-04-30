export type HintSettings = {
  translationEnabled: boolean;
  pronunciationEnabled: boolean;
  backgroundEnabled: boolean;
};

const STORAGE_KEY = 'rss-puzzle:hints';

const DEFAULT_SETTINGS: HintSettings = {
  translationEnabled: true,
  pronunciationEnabled: true,
  backgroundEnabled: true,
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function loadHintSettings(): HintSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return { ...DEFAULT_SETTINGS };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };

    const obj = parsed as Record<string, unknown>;

    return {
      translationEnabled: isBoolean(obj.translationEnabled)
        ? obj.translationEnabled
        : DEFAULT_SETTINGS.translationEnabled,
      pronunciationEnabled: isBoolean(obj.pronunciationEnabled)
        ? obj.pronunciationEnabled
        : DEFAULT_SETTINGS.pronunciationEnabled,
      backgroundEnabled: isBoolean(obj.backgroundEnabled)
        ? obj.backgroundEnabled
        : DEFAULT_SETTINGS.backgroundEnabled,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveHintSettings(next: Partial<HintSettings>): void {
  const current = loadHintSettings();
  const merged: HintSettings = { ...current, ...next };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function resetHintSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
