export function setLoading(button, isLoading, label = 'Memproses...') {
  if (!button) return;
  button.disabled = Boolean(isLoading);
  button.dataset.loading = isLoading ? 'true' : 'false';

  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent.trim();
  }

  button.replaceChildren();

  if (isLoading) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    button.append(spinner, ` ${label}`);
    return;
  }

  button.textContent = button.dataset.originalText || 'Simpan';
}
