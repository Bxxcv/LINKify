/**
 * LINKify Chatbot — chat.js
 * UI Controller: render messages, quick replies, typing, dll
 */

'use strict';

// ── DOM REFS ──────────────────────────────────────────────────────
const chatBody    = document.getElementById('chat-body');
const chatInput   = document.getElementById('chat-input');
const btnSend     = document.getElementById('btn-send');
const qrWrap      = document.getElementById('quick-replies-wrap');
const qrContainer = document.getElementById('quick-replies');
const headerStatus = document.getElementById('header-status');
const btnBack     = document.getElementById('btn-back');

// ── STATE ─────────────────────────────────────────────────────────
let isBotTyping   = false;
let msgHistory    = [];        // { role, text, time }
let lastSender    = null;
let groupCount    = 0;

// ── TIME UTILS ────────────────────────────────────────────────────
function getTimeStr() {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function getTodayStr() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── SCROLL ────────────────────────────────────────────────────────
function scrollToBottom(smooth = true) {
  requestAnimationFrame(() => {
    chatBody.scrollTo({
      top: chatBody.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
  });
}

// ── RENDER AVATAR ─────────────────────────────────────────────────
function makeBotAvatar(hidden = false) {
  const el = document.createElement('div');
  el.className = 'msg-avatar' + (hidden ? ' hidden' : '');
  const img = document.createElement('img');
  img.src = '../logo-linkify.png';
  img.alt = 'Bot';
  img.onerror = () => { el.textContent = 'L'; el.removeChild(img); };
  el.appendChild(img);
  return el;
}

function makeUserAvatar(hidden = false) {
  const el = document.createElement('div');
  el.className = 'msg-avatar' + (hidden ? ' hidden' : '');
  el.style.background = '#3B4458';
  el.textContent = 'K';
  return el;
}

// ── MARKDOWN-LITE RENDERER ────────────────────────────────────────
function renderMarkdown(text) {
  return text
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code `text`
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.10);padding:1px 5px;border-radius:4px;font-size:12.5px;font-family:monospace;">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

// ── RENDER CARD ───────────────────────────────────────────────────
function renderCard(card) {
  const el = document.createElement('div');
  el.className = 'bubble-card';
  el.innerHTML = `
    <div class="bubble-card-title">${escHtml(card.title)}</div>
    <div class="bubble-card-body">${escHtml(card.body)}</div>
    <a href="${card.link}" target="_blank" rel="noopener noreferrer" class="bubble-card-link">
      ${escHtml(card.linkText)}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  `;
  return el;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── APPEND MESSAGE ────────────────────────────────────────────────
function appendMessage({ role, text, time, card = null, isFirst = false, isLast = true }) {
  const isBot  = role === 'bot';
  const isUser = role === 'user';

  const row = document.createElement('div');
  row.className = [
    'msg-row',
    isUser ? 'user' : '',
    isFirst ? 'first-in-group' : '',
    isLast  ? 'last-in-group' : '',
  ].filter(Boolean).join(' ');

  // Avatar
  const showAvatar = isBot && isLast;
  if (isBot) row.appendChild(makeBotAvatar(!showAvatar));

  // Bubble wrap
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';

  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (isBot ? 'bot' : 'user');
  bubble.innerHTML = renderMarkdown(text);

  if (card) bubble.appendChild(renderCard(card));
  wrap.appendChild(bubble);

  // Timestamp (only on last in group)
  if (isLast) {
    const timeEl = document.createElement('div');
    timeEl.className = 'msg-time';
    timeEl.textContent = time || getTimeStr();
    wrap.appendChild(timeEl);
  }

  row.appendChild(wrap);
  if (isUser) row.appendChild(makeUserAvatar(true));

  chatBody.appendChild(row);
  return row;
}

// ── SHOW / HIDE TYPING ────────────────────────────────────────────
let typingEl = null;

function showTyping() {
  if (typingEl) return;
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typing-row';

  const av = makeBotAvatar();
  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  row.appendChild(av);
  row.appendChild(bubble);
  chatBody.appendChild(row);
  typingEl = row;
  scrollToBottom();
}

function hideTyping() {
  if (typingEl) {
    typingEl.remove();
    typingEl = null;
  }
}

// ── RENDER QUICK REPLIES ──────────────────────────────────────────
function renderQuickReplies(chips) {
  qrContainer.innerHTML = '';
  if (!chips || chips.length === 0) {
    qrWrap.classList.remove('has-chips');
    return;
  }
  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qr-chip';
    btn.textContent = chip;
    btn.addEventListener('click', () => handleSend(chip));
    qrContainer.appendChild(btn);
  });
  qrWrap.classList.add('has-chips');
}

// ── DATE DIVIDER ──────────────────────────────────────────────────
function appendDateDivider(label) {
  const el = document.createElement('div');
  el.className = 'date-divider';
  el.innerHTML = `<span>${label}</span>`;
  chatBody.appendChild(el);
}

// ── HANDLE SEND ───────────────────────────────────────────────────
async function handleSend(text) {
  const msg = (text || chatInput.value).trim();
  if (!msg || isBotTyping) return;

  chatInput.value = '';
  adjustTextarea();
  btnSend.disabled = true;
  renderQuickReplies([]);

  // Append user message
  const userTime = getTimeStr();
  appendMessage({ role: 'user', text: msg, time: userTime, isFirst: true, isLast: true });
  msgHistory.push({ role: 'user', text: msg, time: userTime });
  scrollToBottom();

  // Typing delay (natural feel)
  isBotTyping = true;
  const delay = 600 + Math.min(msg.length * 18, 1400) + Math.random() * 400;

  await new Promise(r => setTimeout(r, 280));
  showTyping();

  await new Promise(r => setTimeout(r, delay));
  hideTyping();

  // Get response
  const resp = BotEngine.getBotResponse(msg);

  // Split multi-paragraph into separate bubbles for feel
  const parts = splitIntoParts(resp.answer);

  for (let i = 0; i < parts.length; i++) {
    const isFirst = i === 0;
    const isLast  = i === parts.length - 1;

    if (i > 0) await new Promise(r => setTimeout(r, 220 + Math.random() * 180));

    appendMessage({
      role: 'bot',
      text: parts[i],
      time: getTimeStr(),
      card: isLast ? (resp.card || null) : null,
      isFirst,
      isLast,
    });
    scrollToBottom();
  }

  msgHistory.push({ role: 'bot', text: resp.answer });
  isBotTyping = false;

  // Show quick replies after slight delay
  if (resp.quickReplies && resp.quickReplies.length > 0) {
    await new Promise(r => setTimeout(r, 320));
    renderQuickReplies(resp.quickReplies);
    scrollToBottom();
  }
}

/**
 * Split long answer into 2–3 natural bubbles
 * Avoid splitting code blocks or short messages
 */
function splitIntoParts(text) {
  // Short text — don't split
  if (text.length < 280) return [text];

  // Split on double newline (paragraph break)
  const paras = text.split(/\n\n+/);
  if (paras.length < 2) return [text];

  // Group into max 2–3 parts
  if (paras.length <= 3) return paras;

  // For longer text: first para alone, rest together
  return [paras[0], paras.slice(1).join('\n\n')];
}

// ── TEXTAREA AUTO RESIZE ──────────────────────────────────────────
function adjustTextarea() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 110) + 'px';
}

// ── EVENT LISTENERS ───────────────────────────────────────────────

chatInput.addEventListener('input', () => {
  adjustTextarea();
  btnSend.disabled = chatInput.value.trim().length === 0;
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!btnSend.disabled) handleSend();
  }
});

btnSend.addEventListener('click', () => handleSend());

btnBack.addEventListener('click', () => {
  if (window.history.length > 1) {
    history.back();
  } else {
    window.location.href = '../landing.html';
  }
});

// ── INIT ──────────────────────────────────────────────────────────
function init() {
  // Date divider
  appendDateDivider('Hari ini, ' + getTodayStr());

  // Welcome message
  setTimeout(() => {
    appendMessage({
      role: 'bot',
      text: 'Halo! 👋 Selamat datang di **Bot Asisten LINKify**.\n\nAku siap bantu kamu seputar LINKify. Silakan pilih topik di bawah atau langsung ketik pertanyaanmu!',
      time: getTimeStr(),
      isFirst: true,
      isLast: true,
    });
    scrollToBottom(false);

    // Initial chips
    setTimeout(() => {
      renderQuickReplies(BotEngine.getInitialChips());
    }, 350);

  }, 600);
}

// Start
document.addEventListener('DOMContentLoaded', init);
