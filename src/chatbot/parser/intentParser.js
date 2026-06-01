import { fuzzyIncludes } from './fuzzy.js';

export function parseIntent(message, intents = []) {
  return intents.find(intent => {
    return fuzzyIncludes(message, intent.keywords);
  });
}