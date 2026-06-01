export function createCard({
  title = '',
  description = ''
}) {
  const card = document.createElement('div');
  card.className = 'card';

  const heading = document.createElement('h3');
  heading.textContent = title;

  const body = document.createElement('p');
  body.textContent = description;

  card.appendChild(heading);
  card.appendChild(body);

  return card;
}