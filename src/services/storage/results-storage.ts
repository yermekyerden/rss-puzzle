export type SentenceOutcome = 'known' | 'dontKnow';

export type SentenceResult = {
  sentenceIndex: number;
  sentence: string;
  translation: string;
  audioSrc: string | null;
  outcome: SentenceOutcome;
};

export type RoundResults = {
  level: number;
  roundIndex: number;
  completedAtIso: string;
  artwork: {
    author: string;
    title: string;
    year: string;
    imageUrl: string;
  };
  sentences: SentenceResult[];
};

const STORAGE_KEY = 'rss-puzzle:lastRoundResults';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOutcome(value: unknown): value is SentenceOutcome {
  return value === 'known' || value === 'dontKnow';
}

function isSentenceResult(value: unknown): value is SentenceResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.sentenceIndex === 'number' &&
    isString(obj.sentence) &&
    isString(obj.translation) &&
    isNullableString(obj.audioSrc) &&
    isOutcome(obj.outcome)
  );
}

function isRoundResults(value: unknown): value is RoundResults {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  const { artwork } = obj;
  if (typeof artwork !== 'object' || artwork === null) return false;
  const artworkObj = artwork as Record<string, unknown>;

  const { sentences } = obj;
  if (!Array.isArray(sentences)) return false;

  return (
    typeof obj.level === 'number' &&
    typeof obj.roundIndex === 'number' &&
    isString(obj.completedAtIso) &&
    isString(artworkObj.author) &&
    isString(artworkObj.title) &&
    isString(artworkObj.year) &&
    isString(artworkObj.imageUrl) &&
    sentences.every(isSentenceResult)
  );
}

export function saveLastRoundResults(results: RoundResults): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function loadLastRoundResults(): RoundResults | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isRoundResults(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLastRoundResults(): void {
  localStorage.removeItem(STORAGE_KEY);
}
