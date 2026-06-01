export function appendInlineMarkdown(parent, text) {
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const el = document.createElement(match[2] ? 'strong' : match[3] ? 'code' : 'em');
    el.textContent = match[2] || match[3] || match[4] || '';
    parent.appendChild(el);

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

export function renderMarkdownFragment(text = '') {
  const frag = document.createDocumentFragment();
  String(text).split('\n').forEach((line, index) => {
    if (index > 0) frag.appendChild(document.createElement('br'));
    appendInlineMarkdown(frag, line);
  });
  return frag;
}
