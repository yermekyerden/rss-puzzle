export type LevelData = {
  id: string;
  name: string;
  imageSrc: string;
  cutSrc: string;
  author: string;
  year: string;
};

export type WordItem = {
  audioExample: string;
  textExample: string;
  textExampleTranslate: string;
  id: number;
  word: string;
  wordTranslate: string;
};

export type RoundItem = {
  levelData: LevelData;
  words: WordItem[];
};

export type LevelFile = {
  rounds: RoundItem[];
  roundsCount: number;
};

const DATASET_ROOT = 'rss-puzzle-data/';

function withBaseUrl(relativePath: string): string {
  const basePathnameRaw = new URL(import.meta.env.BASE_URL, window.location.href).pathname;
  const basePathname = basePathnameRaw.endsWith('/') ? basePathnameRaw : `${basePathnameRaw}/`;

  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

  return `${basePathname}${normalizedPath}`;
}

export function resolveDatasetAssetPath(assetPathFromJson: string): string {
  return withBaseUrl(`${DATASET_ROOT}${assetPathFromJson}`);
}

export function resolveDatasetImagePath(imagePathFromJson: string): string {
  const normalized = imagePathFromJson.startsWith('images/')
    ? imagePathFromJson
    : `images/${imagePathFromJson}`;

  return resolveDatasetAssetPath(normalized);
}

const levelCache = new Map<number, Promise<LevelFile>>();

export function loadLevel(level: number): Promise<LevelFile> {
  if (!levelCache.has(level)) {
    const url = withBaseUrl(`${DATASET_ROOT}data/wordCollectionLevel${level}.json`);

    const request = fetch(url).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load level ${level}: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as LevelFile;
    });

    levelCache.set(level, request);
  }

  return levelCache.get(level)!;
}

export async function loadRound(level: number, roundIndex: number): Promise<RoundItem> {
  const levelFile = await loadLevel(level);
  const round = levelFile.rounds[roundIndex];

  if (round === undefined) {
    throw new Error(`Round ${roundIndex} not found in level ${level}.`);
  }

  return round;
}
