export type DragSource = 'source' | 'result';

export type DragPayload = {
  wordId: string;
  from: DragSource;
};

export type DropTarget = {
  to: DragSource;
  beforeWordId: string | null;
};

export type DragPoint = {
  clientX: number;
  clientY: number;
};
