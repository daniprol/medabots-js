export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
  const el = document.createElement(tag);
  el.className = className;

  if (text) {
    el.textContent = text;
  }

  return el;
}

export function button(text: string, onClick: () => void, className = 'button') {
  const b = element('button', className, text);
  b.type = 'button';
  b.addEventListener('click', onClick);

  return b;
}

export const teamName = (id: string | null) =>
  id === null ? 'DRAW' : id.replaceAll('-', ' ').toUpperCase();
