import { renderMessage } from './message.js';

export function renderConversation(container, messages = []) {
  container.innerHTML = '';

  messages.forEach(message => {
    renderMessage(
      container,
      message.text,
      message.role
    );
  });
}