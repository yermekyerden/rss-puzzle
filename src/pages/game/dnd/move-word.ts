type Identifiable = { id: string };

export type MoveWordResult<TItem extends Identifiable> = {
  nextFrom: TItem[];
  nextTo: TItem[];
};

function findIndexById<TItem extends Identifiable>(items: TItem[], id: string): number {
  return items.findIndex((item) => item.id === id);
}

function insertBeforeId<TItem extends Identifiable>(
  items: TItem[],
  item: TItem,
  beforeId: string | null | undefined,
): TItem[] {
  if (beforeId === null || beforeId === undefined) return [...items, item];

  const index = findIndexById(items, beforeId);
  if (index < 0) return [...items, item];

  const next = [...items];
  next.splice(index, 0, item);
  return next;
}

export function moveBetweenLists<TItem extends Identifiable>(
  from: TItem[],
  to: TItem[],
  movedId: string,
  beforeId?: string | null,
): MoveWordResult<TItem> {
  const fromIndex = findIndexById(from, movedId);
  if (fromIndex < 0) return { nextFrom: from, nextTo: to };

  const movedItem = from[fromIndex];
  if (movedItem === undefined) return { nextFrom: from, nextTo: to };

  const nextFrom = from.filter((item) => item.id !== movedId);
  const nextTo = insertBeforeId(to, movedItem, beforeId);

  return { nextFrom, nextTo };
}

export function reorderInList<TItem extends Identifiable>(
  list: TItem[],
  movedId: string,
  beforeId?: string | null,
): TItem[] {
  if (beforeId === movedId) return list;

  const fromIndex = findIndexById(list, movedId);
  if (fromIndex < 0) return list;

  const movedItem = list[fromIndex];
  if (movedItem === undefined) return list;

  const removed = list.filter((item) => item.id !== movedId);
  return insertBeforeId(removed, movedItem, beforeId);
}
