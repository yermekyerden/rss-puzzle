import type { SentenceWord } from '../types';
import type { DragSource } from './types';

export type DragState = {
  isDragging: boolean;
  wordId: string;
  fromBoard: DragSource;
  pointerId: number;
  initialPointerX: number;
  initialPointerY: number;
  offsetX: number;
  offsetY: number;
  draggedWord: SentenceWord;
};

export type DndState = {
  drag: DragState | null;
};
