import { renderMessage } from './message.js';

export function renderConversation(container, messages = []) {
  container.replaceChildren();

  messages.forEach(message => {
    renderMessage(
      container,
      message.text,
      message.role
    );
  });
}