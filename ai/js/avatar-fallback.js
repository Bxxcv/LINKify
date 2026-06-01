document.addEventListener('DOMContentLoaded', () => {
  const avatar = document.querySelector('.avatar-img');
  if (!avatar) return;
  avatar.addEventListener('error', () => {
    avatar.style.display = 'none';
    if (avatar.parentElement) avatar.parentElement.textContent = 'L';
  }, { once: true });
});
