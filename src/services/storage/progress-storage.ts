const STORAGE_KEY = 'rss-puzzle:progress';

export type LastCompleted = {
  level: number;
  roundIndex: number;
};

export type ProgressState = {
  completedRoundsByLevel: Record<string, number[]>;
  lastCompleted: LastCompleted | null;
};

const DEFAULT_STATE: ProgressState = {
  completedRoundsByLevel: {},
  lastCompleted: null,
};

function toLevelKey(level: number): string {
  return String(level);
}

function uniqueSorted(numbers: number[]): number[] {
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

export function loadProgressState(): ProgressState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return { ...DEFAULT_STATE, completedRoundsByLevel: {} };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null)
      return { ...DEFAULT_STATE, completedRoundsByLevel: {} };

    const obj = parsed as Record<string, unknown>;

    const completedRoundsByLevelRaw = obj.completedRoundsByLevel;
    const lastCompletedRaw = obj.lastCompleted;

    const completedRoundsByLevel: Record<string, number[]> = {};

    if (typeof completedRoundsByLevelRaw === 'object' && completedRoundsByLevelRaw !== null) {
      const levelsObj = completedRoundsByLevelRaw as Record<string, unknown>;

      Object.entries(levelsObj).forEach(([levelKey, value]) => {
        if (!Array.isArray(value)) return;

        const roundIndexes = value
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0)
          .map((v) => Math.floor(v));

        completedRoundsByLevel[levelKey] = uniqueSorted(roundIndexes);
      });
    }

    let lastCompleted: LastCompleted | null = null;
    if (typeof lastCompletedRaw === 'object' && lastCompletedRaw !== null) {
      const lastObj = lastCompletedRaw as Record<string, unknown>;
      const { level } = lastObj;
      const { roundIndex } = lastObj;

      if (
        typeof level === 'number' &&
        Number.isFinite(level) &&
        typeof roundIndex === 'number' &&
        Number.isFinite(roundIndex)
      ) {
        lastCompleted = { level: Math.floor(level), roundIndex: Math.floor(roundIndex) };
      }
    }

    return {
      completedRoundsByLevel,
      lastCompleted,
    };
  } catch {
    return { ...DEFAULT_STATE, completedRoundsByLevel: {} };
  }
}

function saveProgressState(state: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCompletedRoundsForLevel(state: ProgressState, level: number): number[] {
  return state.completedRoundsByLevel[toLevelKey(level)] ?? [];
}

export function isRoundCompleted(state: ProgressState, level: number, roundIndex: number): boolean {
  return getCompletedRoundsForLevel(state, level).includes(roundIndex);
}

export function markRoundCompleted(level: number, roundIndex: number): void {
  const current = loadProgressState();
  const key = toLevelKey(level);

  const existing = current.completedRoundsByLevel[key] ?? [];
  const nextForLevel = uniqueSorted([...existing, roundIndex]);

  const next: ProgressState = {
    completedRoundsByLevel: {
      ...current.completedRoundsByLevel,
      [key]: nextForLevel,
    },
    lastCompleted: { level, roundIndex },
  };

  saveProgressState(next);
}
