(function () {
  'use strict';

  // ─── Config ─────────────────────────────────────────────────────────────────
  var WEBHOOK_URL = 'https://axiagency.app.n8n.cloud/webhook/axi-website-chat';
  var SESSION_KEY = 'axi_chat_session_id';
  var HISTORY_KEY = 'axi_chat_history';
  var REQUEST_TIMEOUT_MS = 30000;

  // ─── i18n labels ────────────────────────────────────────────────────────────
  var lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  var labels = {
    uz: {
      header: 'AXI Agent',
      subheader: 'Odatda darhol javob beradi',
      placeholder: 'Xabar yozing...',
      welcome: 'Assalomu alaykum! Men AXI agentiman. Biznesingiz haqida gapirib bering — qanday yordam bera olishimni ko\'rib chiqamiz.',
      send: 'Yuborish',
      error: 'Ulanishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
      timeout: 'Javob juda uzoq kutilmoqda. Qayta urinib ko\'ring.',
    },
    ru: {
      header: 'AXI Agent',
      subheader: 'Обычно отвечает мгновенно',
      placeholder: 'Напишите сообщение...',
      welcome: 'Добрый день! Я агент AXI. Расскажите о своём бизнесе — посмотрим, чем можем помочь.',
      send: 'Отправить',
      error: 'Ошибка соединения. Попробуйте ещё раз.',
      timeout: 'Ответ занял слишком много времени. Попробуйте ещё раз.',
    },
    en: {
      header: 'AXI Agent',
      subheader: 'Typically replies instantly',
      placeholder: 'Type a message...',
      welcome: "Hi! I'm AXI's AI agent. Tell me about your business and let's see how we can help.",
      send: 'Send',
      error: 'Connection error. Please try again.',
      timeout: 'Response is taking too long. Please try again.',
    },
  };
  var t = labels[lang] || labels.en;

  // ─── Session ─────────────────────────────────────────────────────────────────
  function getSessionId() {
    var id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'web-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {}
  }

  // ─── CSS ─────────────────────────────────────────────────────────────────────
  var css = [
    '#axi-chat-root *{box-sizing:border-box;margin:0;padding:0;}',
    '#axi-chat-toggle{',
    '  position:fixed;bottom:24px;right:24px;z-index:9999;',
    '  width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;',
    '  background:#2563eb;color:#fff;',
    '  box-shadow:0 0 20px rgba(56,189,248,0.35),0 4px 16px rgba(0,0,0,0.5);',
    '  display:flex;align-items:center;justify-content:center;',
    '  transition:transform 0.2s ease,box-shadow 0.2s ease;',
    '  outline:none;',
    '}',
    '#axi-chat-toggle:hover{transform:scale(1.08);box-shadow:0 0 28px rgba(56,189,248,0.55),0 6px 20px rgba(0,0,0,0.5);}',
    '#axi-chat-toggle svg{width:24px;height:24px;pointer-events:none;}',
    '#axi-chat-panel{',
    '  position:fixed;bottom:92px;right:24px;z-index:9998;',
    '  width:360px;',
    '  background:#0f0f0f;',
    '  border:1px solid rgba(255,255,255,0.08);',
    '  border-radius:20px;',
    '  box-shadow:0 24px 64px rgba(0,0,0,0.7),0 0 40px rgba(56,189,248,0.06);',
    '  display:flex;flex-direction:column;',
    '  overflow:hidden;',
    '  max-height:520px;',
    '  opacity:0;transform:translateY(14px);pointer-events:none;',
    '  transition:opacity 0.25s cubic-bezier(0.16,1,0.3,1),transform 0.25s cubic-bezier(0.16,1,0.3,1);',
    '}',
    '#axi-chat-panel.axi-open{opacity:1;transform:translateY(0);pointer-events:all;}',
    '#axi-chat-header{',
    '  padding:14px 16px;',
    '  border-bottom:1px solid rgba(255,255,255,0.06);',
    '  display:flex;align-items:center;gap:10px;',
    '  flex-shrink:0;',
    '}',
    '.axi-dot{',
    '  width:10px;height:10px;border-radius:50%;',
    '  background:rgba(56,189,248,1);',
    '  box-shadow:0 0 8px rgba(56,189,248,0.8);',
    '  animation:axi-pulse 2s ease-in-out infinite;',
    '  flex-shrink:0;',
    '}',
    '@keyframes axi-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(0.85);}}',
    '.axi-header-text{flex:1;min-width:0;}',
    '.axi-header-title{font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#f9fafb;letter-spacing:-0.01em;}',
    '.axi-header-sub{font-family:Inter,sans-serif;font-size:11px;color:rgba(156,163,175,0.8);margin-top:1px;}',
    '#axi-chat-close{',
    '  background:none;border:none;cursor:pointer;color:rgba(156,163,175,0.7);',
    '  padding:4px;border-radius:6px;display:flex;align-items:center;',
    '  transition:color 0.15s;',
    '}',
    '#axi-chat-close:hover{color:#f9fafb;}',
    '#axi-chat-close svg{width:18px;height:18px;}',
    '#axi-chat-messages{',
    '  flex:1;overflow-y:auto;padding:16px;',
    '  display:flex;flex-direction:column;gap:10px;',
    '  scroll-behavior:smooth;',
    '}',
    '#axi-chat-messages::-webkit-scrollbar{width:4px;}',
    '#axi-chat-messages::-webkit-scrollbar-track{background:transparent;}',
    '#axi-chat-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}',
    '.axi-msg{display:flex;flex-direction:column;max-width:84%;}',
    '.axi-msg.axi-user{align-self:flex-end;align-items:flex-end;}',
    '.axi-msg.axi-bot{align-self:flex-start;align-items:flex-start;}',
    '.axi-bubble{',
    '  font-family:Inter,sans-serif;font-size:14px;line-height:1.5;',
    '  padding:10px 14px;border-radius:16px;word-break:break-word;',
    '}',
    '.axi-user .axi-bubble{',
    '  background:#2563eb;color:#fff;',
    '  border-radius:16px 16px 4px 16px;',
    '}',
    '.axi-bot .axi-bubble{',
    '  background:#181818;color:#f3f4f6;',
    '  border:1px solid rgba(255,255,255,0.06);',
    '  border-radius:16px 16px 16px 4px;',
    '}',
    '.axi-time{font-family:Inter,sans-serif;font-size:10px;color:rgba(107,114,128,0.8);margin-top:4px;}',
    '.axi-typing{display:flex;align-items:center;gap:5px;padding:12px 14px;}',
    '.axi-typing span{',
    '  width:7px;height:7px;border-radius:50%;background:rgba(156,163,175,0.6);',
    '  animation:axi-bounce 1.1s ease-in-out infinite;',
    '}',
    '.axi-typing span:nth-child(2){animation-delay:0.18s;}',
    '.axi-typing span:nth-child(3){animation-delay:0.36s;}',
    '@keyframes axi-bounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-6px);}}',
    '#axi-chat-input-area{',
    '  padding:12px;',
    '  border-top:1px solid rgba(255,255,255,0.06);',
    '  display:flex;align-items:flex-end;gap:8px;',
    '  flex-shrink:0;',
    '}',
    '#axi-chat-textarea{',
    '  flex:1;background:#181818;border:1px solid rgba(255,255,255,0.08);',
    '  border-radius:12px;color:#f9fafb;',
    '  font-family:Inter,sans-serif;font-size:14px;line-height:1.5;',
    '  padding:10px 14px;resize:none;outline:none;',
    '  min-height:42px;max-height:100px;overflow-y:auto;',
    '  transition:border-color 0.2s;',
    '}',
    '#axi-chat-textarea:focus{border-color:rgba(56,189,248,0.4);}',
    '#axi-chat-textarea::placeholder{color:rgba(107,114,128,0.7);}',
    '#axi-chat-send{',
    '  width:38px;height:38px;border-radius:10px;border:none;cursor:pointer;',
    '  background:#2563eb;color:#fff;',
    '  display:flex;align-items:center;justify-content:center;',
    '  transition:opacity 0.2s,background 0.2s;',
    '  flex-shrink:0;',
    '}',
    '#axi-chat-send:disabled{opacity:0.35;cursor:not-allowed;}',
    '#axi-chat-send:not(:disabled):hover{background:#1d4ed8;}',
    '#axi-chat-send svg{width:16px;height:16px;}',
    '@media(max-width:420px){',
    '  #axi-chat-panel{width:calc(100vw - 16px);right:8px;bottom:80px;border-radius:16px;}',
    '  #axi-chat-toggle{bottom:16px;right:16px;}',
    '}',
  ].join('');

  // ─── SVG icons ───────────────────────────────────────────────────────────────
  var iconChat = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var iconClose = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var iconSend = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  // ─── State ───────────────────────────────────────────────────────────────────
  var isOpen = false;
  var isLoading = false;
  var history = [];
  var elements = {};

  // ─── DOM helpers ─────────────────────────────────────────────────────────────
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'innerHTML') node.innerHTML = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) children.forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function formatTime(ts) {
    var d = new Date(ts);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  // ─── Message rendering ───────────────────────────────────────────────────────
  function renderMessage(role, text, ts) {
    var wrap = el('div', { className: 'axi-msg axi-' + role });
    var bubble = el('div', { className: 'axi-bubble', textContent: text });
    var time = el('div', { className: 'axi-time', textContent: formatTime(ts || Date.now()) });
    wrap.appendChild(bubble);
    wrap.appendChild(time);
    return wrap;
  }

  function appendMessage(role, text, ts) {
    var msg = renderMessage(role, text, ts || Date.now());
    elements.messages.appendChild(msg);
    scrollToBottom();
    return msg;
  }

  function showTyping() {
    var wrap = el('div', { className: 'axi-msg axi-bot' });
    var bubble = el('div', { className: 'axi-bubble' });
    var dots = el('div', { className: 'axi-typing' });
    [1, 2, 3].forEach(function () { dots.appendChild(el('span')); });
    bubble.appendChild(dots);
    wrap.appendChild(bubble);
    elements.messages.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function setLoading(state) {
    isLoading = state;
    elements.send.disabled = state;
    elements.textarea.disabled = state;
    if (state) {
      elements.textarea.style.opacity = '0.5';
    } else {
      elements.textarea.style.opacity = '1';
      elements.textarea.focus();
    }
  }

  // ─── API call ────────────────────────────────────────────────────────────────
  function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    var sessionId = getSessionId();
    var ts = Date.now();

    // Persist and render user message
    history.push({ role: 'user', text: text, ts: ts });
    saveHistory(history);
    appendMessage('user', text, ts);
    elements.textarea.value = '';
    autoResizeTextarea();

    setLoading(true);
    var typingEl = showTyping();

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

    var fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: sessionId }),
    };
    if (controller) fetchOptions.signal = controller.signal;

    fetch(WEBHOOK_URL, fetchOptions)
      .then(function (res) {
        if (timeoutId) clearTimeout(timeoutId);
        return res.json();
      })
      .then(function (data) {
        var reply = (data && data.reply) ? data.reply : t.error;
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        var botTs = Date.now();
        history.push({ role: 'bot', text: reply, ts: botTs });
        saveHistory(history);
        appendMessage('bot', reply, botTs);
        setLoading(false);
      })
      .catch(function (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        var msg = (err && err.name === 'AbortError') ? t.timeout : t.error;
        appendMessage('bot', msg, Date.now());
        setLoading(false);
      });
  }

  // ─── Textarea auto-resize ────────────────────────────────────────────────────
  function autoResizeTextarea() {
    var ta = elements.textarea;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
  }

  // ─── Panel toggle ─────────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    elements.panel.classList.add('axi-open');
    elements.toggle.innerHTML = iconClose;
    elements.textarea.focus();
    scrollToBottom();
  }

  function closePanel() {
    isOpen = false;
    elements.panel.classList.remove('axi-open');
    elements.toggle.innerHTML = iconChat;
  }

  // ─── Build DOM ───────────────────────────────────────────────────────────────
  function build() {
    // Inject styles
    var style = el('style', { innerHTML: css });
    document.head.appendChild(style);

    // Root
    var root = el('div', { id: 'axi-chat-root' });

    // Toggle button
    var toggle = el('button', { id: 'axi-chat-toggle', 'aria-label': 'Open AXI chat', innerHTML: iconChat });
    toggle.addEventListener('click', function () {
      isOpen ? closePanel() : openPanel();
    });

    // Panel
    var panel = el('div', { id: 'axi-chat-panel', role: 'dialog', 'aria-label': 'AXI Chat' });

    // Header
    var dot = el('div', { className: 'axi-dot' });
    var headerText = el('div', { className: 'axi-header-text' }, [
      el('div', { className: 'axi-header-title', textContent: t.header }),
      el('div', { className: 'axi-header-sub', textContent: t.subheader }),
    ]);
    var closeBtn = el('button', { id: 'axi-chat-close', 'aria-label': 'Close chat', innerHTML: iconClose });
    closeBtn.addEventListener('click', closePanel);
    var header = el('div', { id: 'axi-chat-header' }, [dot, headerText, closeBtn]);

    // Messages area
    var messages = el('div', { id: 'axi-chat-messages', 'aria-live': 'polite' });

    // Input area
    var textarea = el('textarea', {
      id: 'axi-chat-textarea',
      placeholder: t.placeholder,
      rows: '1',
      'aria-label': 'Message input',
    });
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(textarea.value);
      }
    });
    textarea.addEventListener('input', autoResizeTextarea);

    var sendBtn = el('button', { id: 'axi-chat-send', 'aria-label': t.send, innerHTML: iconSend });
    sendBtn.addEventListener('click', function () {
      sendMessage(textarea.value);
    });

    var inputArea = el('div', { id: 'axi-chat-input-area' }, [textarea, sendBtn]);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputArea);

    root.appendChild(toggle);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Store refs
    elements = { root: root, toggle: toggle, panel: panel, messages: messages, textarea: textarea, send: sendBtn };

    // Render welcome + history
    history = loadHistory();
    if (history.length === 0) {
      var welcomeTs = Date.now();
      history.push({ role: 'bot', text: t.welcome, ts: welcomeTs });
      saveHistory(history);
    }
    history.forEach(function (msg) {
      appendMessage(msg.role, msg.text, msg.ts);
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
