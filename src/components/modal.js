export class Modal {
  constructor(content = '') {
    this.content = content;
  }

  render() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.textContent = this.content;

    overlay.appendChild(modal);

    overlay.addEventListener('click', () => {
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }
}