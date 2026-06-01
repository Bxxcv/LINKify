/**
 * Lightweight chatbot memory.
 * Menyimpan konteks percakapan di memory runtime, bukan data sensitif.
 */
(function () {
  'use strict';

  var state = {
    lastIntent: null,
    lastScore: 0,
    turns: 0
  };

  function remember(intentId, score) {
    state.lastIntent = intentId || null;
    state.lastScore = Number(score || 0);
    state.turns += 1;
  }

  function getState() {
    return {
      lastIntent: state.lastIntent,
      lastScore: state.lastScore,
      turns: state.turns
    };
  }

  function reset() {
    state.lastIntent = null;
    state.lastScore = 0;
    state.turns = 0;
  }

  window.LINKifyBotMemory = {
    remember: remember,
    getState: getState,
    reset: reset
  };
})();
