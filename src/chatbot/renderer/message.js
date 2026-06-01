export function renderMessage(container, text, role = 'bot') {
  const bubble = document.createElement('div');

  bubble.className = `message ${role}`;
  bubble.textContent = text;

  container.appendChild(bubble);
}