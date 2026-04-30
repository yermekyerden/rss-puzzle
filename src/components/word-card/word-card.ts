import createElement from '../../shared/dom/create-element';
import { WORD_ID_DATA_ATTR } from '../../pages/game/dnd/dom-attrs';

export type WordCardVariant = 'neutral' | 'correct' | 'wrong';

export type WordCardBackground = {
  imageUrl: string;
  columns: number;
  rows: number;
  col: number;
  row: number;
};

export type WordCardParams = {
  id: string;
  text: string;
  variant?: WordCardVariant;
  background?: WordCardBackground;
  onClick: (id: string) => void;
  onPointerDown?: (id: string, event: PointerEvent) => void;
};

function resolveWordCardClassName(variant: WordCardVariant): string {
  if (variant === 'correct') return 'word-card word-card--correct';
  if (variant === 'wrong') return 'word-card word-card--wrong';

  return 'word-card';
}

function applyBackgroundSegment(element: HTMLElement, background: WordCardBackground): void {
  const safeColumns = Math.max(1, background.columns);
  const safeRows = Math.max(1, background.rows);

  const posX = safeColumns === 1 ? 50 : (background.col * 100) / (safeColumns - 1);
  const posY = safeRows === 1 ? 50 : (background.row * 100) / (safeRows - 1);

  element.classList.add('word-card--has-bg');

  element.style.setProperty('--word-card-bg-image', `url("${background.imageUrl}")`);
  element.style.setProperty('--word-card-bg-size', `${safeColumns * 100}% ${safeRows * 100}%`);
  element.style.setProperty('--word-card-bg-position', `${posX}% ${posY}%`);
}

export default function createWordCard(params: WordCardParams): HTMLButtonElement {
  const { id, text, variant: rawVariant, background, onClick, onPointerDown } = params;

  const variant: WordCardVariant = rawVariant ?? 'neutral';

  const card = createElement('button', {
    className: resolveWordCardClassName(variant),
    textContent: text,
    attributes: {
      type: 'button',
      [WORD_ID_DATA_ATTR]: id,
    },
  });

  card.style.touchAction = 'none';

  if (background !== undefined) {
    applyBackgroundSegment(card, background);
  }

  card.addEventListener('click', () => {
    onClick(id);
  });

  if (onPointerDown) {
    card.addEventListener('pointerdown', (event) => {
      onPointerDown(id, event);
    });
  }

  return card;
}
