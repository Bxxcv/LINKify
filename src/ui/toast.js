export function showToast(message = '', type = 'default') {
  const toast = document.createElement('div');

  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.remove();
  }, 3000);
}