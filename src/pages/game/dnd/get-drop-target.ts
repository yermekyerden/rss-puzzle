import type { DragSource, DropTarget } from './types';
import { BOARD_DATA_ATTR, WORD_ID_DATA_ATTR } from './dom-attrs';

function isDragSource(value: string | null): value is DragSource {
  return value === 'source' || value === 'result';
}

export default function getDropTargetAtPoint(x: number, y: number): DropTarget | null {
  const element = document.elementFromPoint(x, y);

  if (element === null) return null;

  const boardElement = element.closest<HTMLElement>(`[${BOARD_DATA_ATTR}]`);
  const boardKind = boardElement?.getAttribute(BOARD_DATA_ATTR) ?? null;

  if (!isDragSource(boardKind)) return null;

  const cardElement = element.closest<HTMLElement>(`[${WORD_ID_DATA_ATTR}]`);
  const beforeWordId = cardElement?.getAttribute(WORD_ID_DATA_ATTR) ?? null;

  return { to: boardKind, beforeWordId };
}
