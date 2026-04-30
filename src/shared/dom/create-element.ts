type CreateElementOptions = {
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
};

export default function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: CreateElementOptions,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (options?.className) element.className = options.className;

  if (options?.textContent) element.textContent = options.textContent;

  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}
