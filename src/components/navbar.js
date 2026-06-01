export function createNavbar(items = []) {
  const nav = document.createElement('nav');
  nav.className = 'navbar';

  items.forEach(item => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;

    nav.appendChild(link);
  });

  return nav;
}