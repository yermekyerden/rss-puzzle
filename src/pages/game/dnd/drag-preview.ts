import createElement from '../../../shared/dom/create-element';

export type Preview = {
  root: HTMLDivElement;
  label: HTMLDivElement;
};

export function moveDragPreview(preview: Preview, x: number, y: number): void {
  const { root } = preview;
  root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

export function showDragPreview(preview: Preview, text: string, x: number, y: number): void {
  const { root, label } = preview;

  label.textContent = text;
  root.style.display = 'block';

  moveDragPreview(preview, x, y);
}

export function hideDragPreview(preview: Preview): void {
  const { root } = preview;
  root.style.display = 'none';
}

export function createDragPreview(): Preview {
  const root = createElement('div', {
    className: 'drag-preview',
    attributes: { 'aria-hidden': 'true' },
  });

  const label = createElement('div', { className: 'drag-preview-label' });

  root.append(label);
  document.body.append(root);

  root.style.display = 'none';

  return { root, label };
}
