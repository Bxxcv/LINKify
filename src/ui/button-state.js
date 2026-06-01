export function setButtonBusy(button, label = 'Menyimpan...') {
  if (!button) return;
  button.disabled = true;
  button.textContent = '';

  const spinner = document.createElement('span');
  spinner.className = 'spinner';

  const text = document.createTextNode(` ${label}`);
  button.append(spinner, text);
}

export function setButtonReady(button, label) {
  if (!button) return;
  button.disabled = false;
  button.textContent = label || '';
}
