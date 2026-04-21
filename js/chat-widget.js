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
      header: 'AXI AGENCY',
      subheader: 'Online',
      placeholder: 'Xabar yozing...',
      welcome: 'AXI AGENCY-ga xush kelibsiz! \uD83C\uDF1F Bugun sizga qanday yordam bera olamiz?',
      send: 'Yuborish',
      error: 'Ulanishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
      timeout: 'Javob juda uzoq kutilmoqda. Qayta urinib ko\'ring.',
    },
    ru: {
      header: 'AXI AGENCY',
      subheader: 'Online',
      placeholder: 'Напишите сообщение...',
      welcome: '\u041F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u043C \u0432\u0430\u0441 \u0432 \u00ABАXI AGENCY\u00BB! \uD83C\uDF1F \u041A\u0430\u043A \u043C\u044B \u043C\u043E\u0436\u0435\u043C \u0432\u0430\u043C \u043F\u043E\u043C\u043E\u0447\u044C \u0441\u0435\u0433\u043E\u0434\u043D\u044F?',
      send: 'Отправить',
      error: 'Ошибка соединения. Попробуйте ещё раз.',
      timeout: 'Ответ занял слишком много времени. Попробуйте ещё раз.',
    },
    en: {
      header: 'AXI AGENCY',
      subheader: 'Online',
      placeholder: 'Type a message...',
      welcome: 'Welcome to AXI AGENCY! \uD83C\uDF1F How can we help you today?',
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
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveHistory(history) {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    catch (e) {}
  }

  // ─── CSS ─────────────────────────────────────────────────────────────────────
  var css = [
    '#axi-chat-root *{box-sizing:border-box;margin:0;padding:0;}',

    /* ── Toggle button ── */
    '#axi-chat-toggle{',
    '  position:fixed;bottom:24px;right:24px;z-index:9999;',
    '  width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;',
    '  background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;',
    '  box-shadow:0 0 28px rgba(56,189,248,0.45),0 6px 24px rgba(0,0,0,0.55);',
    '  display:flex;align-items:center;justify-content:center;',
    '  transition:transform 0.2s ease,box-shadow 0.2s ease;outline:none;',
    '  position:fixed;',
    '}',
    '#axi-chat-toggle:hover{transform:scale(1.07);box-shadow:0 0 36px rgba(56,189,248,0.6),0 8px 28px rgba(0,0,0,0.55);}',
    '#axi-chat-toggle svg{width:26px;height:26px;pointer-events:none;transition:transform 0.25s ease;}',

    /* Pulse ring */
    '#axi-chat-toggle::before{',
    '  content:"";position:absolute;inset:0;border-radius:50%;',
    '  border:2px solid rgba(56,189,248,0.5);',
    '  animation:axi-ring 2.4s ease-out infinite;',
    '}',
    '@keyframes axi-ring{0%{transform:scale(1);opacity:0.7;}100%{transform:scale(1.7);opacity:0;}}',

    /* ── Panel ── */
    '#axi-chat-panel{',
    '  position:fixed;bottom:100px;right:24px;z-index:9998;',
    '  width:400px;height:min(640px,calc(100vh - 120px));',
    '  background:#0c0c0c;',
    '  border:1px solid rgba(255,255,255,0.08);',
    '  border-radius:24px;',
    '  box-shadow:0 32px 80px rgba(0,0,0,0.85),0 0 0 1px rgba(56,189,248,0.04),0 0 60px rgba(37,99,235,0.07);',
    '  display:flex;flex-direction:column;overflow:hidden;',
    '  opacity:0;transform:translateY(20px) scale(0.96);pointer-events:none;transform-origin:bottom right;',
    '  transition:opacity 0.3s cubic-bezier(0.16,1,0.3,1),transform 0.3s cubic-bezier(0.16,1,0.3,1);',
    '}',
    '#axi-chat-panel.axi-open{opacity:1;transform:translateY(0) scale(1);pointer-events:all;}',

    /* ── Header ── */
    '#axi-chat-header{',
    '  padding:16px 16px 14px;flex-shrink:0;',
    '  background:linear-gradient(160deg,rgba(37,99,235,0.18) 0%,rgba(14,165,233,0.06) 100%);',
    '  border-bottom:1px solid rgba(255,255,255,0.07);',
    '  display:flex;align-items:center;gap:12px;',
    '}',

    /* Avatar */
    '.axi-avatar{',
    '  width:42px;height:42px;border-radius:12px;flex-shrink:0;',
    '  background:#000;overflow:hidden;',
    '  box-shadow:0 0 20px rgba(56,189,248,0.35);',
    '  position:relative;flex-shrink:0;',
    '}',
    '.axi-avatar img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.axi-avatar-dot{',
    '  position:absolute;bottom:1px;right:1px;',
    '  width:11px;height:11px;border-radius:50%;',
    '  background:#22c55e;border:2px solid #0c0c0c;',
    '}',
    '.axi-header-text{flex:1;min-width:0;}',
    '.axi-header-title{font-family:Inter,sans-serif;font-size:15px;font-weight:700;color:#f9fafb;letter-spacing:-0.02em;display:flex;align-items:center;gap:5px;}',
    '.axi-header-brand{background:linear-gradient(90deg,#60a5fa,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}',
    '.axi-header-sub{',
    '  font-family:Inter,sans-serif;font-size:11px;color:rgba(134,239,172,0.9);margin-top:3px;',
    '  display:flex;align-items:center;gap:5px;',
    '}',
    '.axi-header-sub::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.7);}',
    '#axi-chat-close{',
    '  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);cursor:pointer;color:rgba(156,163,175,0.7);',
    '  width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;',
    '  transition:all 0.15s;flex-shrink:0;',
    '}',
    '#axi-chat-close:hover{background:rgba(255,255,255,0.1);color:#f9fafb;border-color:rgba(255,255,255,0.15);}',
    '#axi-chat-close svg{width:14px;height:14px;}',

    /* ── Messages ── */
    '#axi-chat-messages{',
    '  flex:1;min-height:0;overflow-y:auto;padding:18px 16px;',
    '  display:flex;flex-direction:column;gap:12px;',
    '  scroll-behavior:smooth;',
    '}',
    '#axi-chat-messages::-webkit-scrollbar{width:3px;}',
    '#axi-chat-messages::-webkit-scrollbar-track{background:transparent;}',
    '#axi-chat-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}',

    /* Message row (bot: avatar + bubble) */
    '.axi-msg-row{display:flex;align-items:flex-end;gap:8px;animation:axi-msg-in 0.25s cubic-bezier(0.16,1,0.3,1) both;}',
    '.axi-msg-row.axi-user-row{flex-direction:row-reverse;}',
    '@keyframes axi-msg-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}',

    '.axi-mini-avatar{',
    '  width:28px;height:28px;border-radius:50%;flex-shrink:0;',
    '  background:linear-gradient(135deg,#1d4ed8,#0284c7);',
    '  display:flex;align-items:center;justify-content:center;',
    '  font-family:Inter,sans-serif;font-size:8px;font-weight:800;color:#fff;letter-spacing:0.3px;',
    '  align-self:flex-end;margin-bottom:18px;',
    '}',

    '.axi-msg{display:flex;flex-direction:column;max-width:75%;min-width:0;}',
    '.axi-msg.axi-user{align-items:flex-end;align-self:flex-end;}',
    '.axi-msg.axi-bot{align-items:flex-start;align-self:flex-start;}',

    '.axi-bubble{',
    '  display:inline-block;',
    '  font-family:Inter,sans-serif;font-size:14px;line-height:1.45;',
    '  padding:14px 22px;word-break:break-word;overflow-wrap:anywhere;white-space:pre-wrap;',
    '}',
    '.axi-user .axi-bubble{',
    '  background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;',
    '  border-radius:18px 18px 4px 18px;',
    '  box-shadow:0 4px 16px rgba(37,99,235,0.35);',
    '}',
    '.axi-bot .axi-bubble{',
    '  background:#161616;color:#f3f4f6;',
    '  border:1px solid rgba(255,255,255,0.07);',
    '  border-radius:18px 18px 18px 4px;',
    '  box-shadow:0 2px 8px rgba(0,0,0,0.3);',
    '}',
    '.axi-time{font-family:Inter,sans-serif;font-size:10px;color:rgba(107,114,128,0.7);margin-top:5px;padding:0 2px;}',

    /* Typing */
    '.axi-typing{display:flex;align-items:center;gap:5px;padding:13px 16px;}',
    '.axi-typing span{',
    '  width:7px;height:7px;border-radius:50%;background:rgba(156,163,175,0.5);',
    '  animation:axi-bounce 1.2s ease-in-out infinite;',
    '}',
    '.axi-typing span:nth-child(2){animation-delay:0.2s;}',
    '.axi-typing span:nth-child(3){animation-delay:0.4s;}',
    '@keyframes axi-bounce{0%,80%,100%{transform:translateY(0);opacity:0.5;}40%{transform:translateY(-7px);opacity:1;}}',

    /* ── Input area ── */
    '#axi-chat-input-area{',
    '  padding:12px;',
    '  border-top:1px solid rgba(255,255,255,0.06);',
    '  display:flex;align-items:flex-end;gap:10px;',
    '  background:#0f0f0f;',
    '  flex-shrink:0;',
    '}',
    '#axi-chat-textarea{',
    '  flex:1;background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);',
    '  border-radius:14px;color:#f9fafb;',
    '  font-family:Inter,sans-serif;font-size:14px;line-height:1.5;',
    '  padding:11px 15px;resize:none;outline:none;',
    '  min-height:44px;max-height:110px;overflow-y:auto;',
    '  transition:border-color 0.2s,box-shadow 0.2s;',
    '}',
    '#axi-chat-textarea:focus{border-color:rgba(56,189,248,0.4);box-shadow:0 0 0 3px rgba(56,189,248,0.06);}',
    '#axi-chat-textarea::placeholder{color:rgba(107,114,128,0.6);}',
    '#axi-chat-send{',
    '  width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;',
    '  background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;',
    '  display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    '  box-shadow:0 0 16px rgba(56,189,248,0.3);',
    '  transition:opacity 0.2s,transform 0.15s,box-shadow 0.2s;',
    '}',
    '#axi-chat-send:disabled{opacity:0.3;cursor:not-allowed;box-shadow:none;}',
    '#axi-chat-send:not(:disabled):hover{transform:scale(1.08);box-shadow:0 0 24px rgba(56,189,248,0.5);}',
    '#axi-chat-send svg{width:17px;height:17px;}',

    /* ── Branded footer ── */
    '#axi-chat-footer{',
    '  padding:8px 16px;text-align:center;flex-shrink:0;',
    '  border-top:1px solid rgba(255,255,255,0.04);',
    '}',
    '#axi-chat-footer span{',
    '  font-family:Inter,sans-serif;font-size:10px;font-weight:500;',
    '  color:rgba(255,255,255,0.55);letter-spacing:0.02em;',
    '}',

    /* ── Reset button ── */
    '#axi-chat-reset{',
    '  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);cursor:pointer;',
    '  color:rgba(156,163,175,0.7);',
    '  width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;',
    '  transition:all 0.15s;flex-shrink:0;margin-right:6px;',
    '}',
    '#axi-chat-reset:hover{background:rgba(239,68,68,0.12);color:#f87171;border-color:rgba(239,68,68,0.25);}',
    '#axi-chat-reset svg{width:14px;height:14px;}',

    /* ── Mobile: fullscreen panel ── */
    '@media(max-width:440px){',
    '  #axi-chat-panel{',
    '    top:0;left:0;right:0;bottom:0;',
    '    width:100vw;max-width:100vw;',
    '    height:100vh;height:100dvh;max-height:100dvh;',
    '    border-radius:0;border:none;',
    '    transform-origin:center;',
    '  }',
    '  #axi-chat-panel.axi-open{transform:none;}',
    /* hide the floating toggle while chat is open — it overlaps the send button */
    '  #axi-chat-root.axi-chat-active #axi-chat-toggle{display:none;}',
    '  #axi-chat-toggle{bottom:16px;right:16px;width:60px;height:60px;}',
    '  #axi-chat-toggle svg{width:26px;height:26px;}',
    '  #axi-chat-header{padding:14px 14px 12px;padding-top:calc(14px + env(safe-area-inset-top));}',
    '  .axi-avatar{width:42px;height:42px;}',
    '  .axi-header-title{font-size:16px;}',
    '  .axi-header-sub{font-size:12px;}',
    '  #axi-chat-messages{padding:14px 12px 18px;gap:12px;}',
    '  .axi-mini-avatar{width:28px;height:28px;font-size:8px;}',
    '  .axi-msg{max-width:84%;}',
    '  .axi-bubble{font-size:15px;padding:14px 22px;line-height:1.45;}',
    '  .axi-time{font-size:11px;}',
    '  #axi-chat-input-area{padding:10px 10px calc(10px + env(safe-area-inset-bottom));gap:10px;}',
    '  #axi-chat-textarea{font-size:16px;padding:12px 15px;min-height:46px;}',
    '  #axi-chat-send{width:46px;height:46px;}',
    '  #axi-chat-send svg{width:19px;height:19px;}',
    '}',
  ].join('');

  // ─── SVG icons ───────────────────────────────────────────────────────────────
  var iconChat = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var iconClose = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var iconSend = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var iconReset = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>';

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
    var row = el('div', { className: 'axi-msg-row' + (role === 'user' ? ' axi-user-row' : '') });
    var msgWrap = el('div', { className: 'axi-msg axi-' + role });
    var bubble = el('div', { className: 'axi-bubble', textContent: text });
    var time = el('div', { className: 'axi-time', textContent: formatTime(ts || Date.now()) });
    msgWrap.appendChild(bubble);
    msgWrap.appendChild(time);

    if (role === 'bot') {
      var avatar = el('div', { className: 'axi-mini-avatar', textContent: 'AXI' });
      row.appendChild(avatar);
    }
    row.appendChild(msgWrap);
    return row;
  }

  function appendMessage(role, text, ts) {
    var msg = renderMessage(role, text, ts || Date.now());
    elements.messages.appendChild(msg);
    scrollToBottom();
    return msg;
  }

  function showTyping() {
    var row = el('div', { className: 'axi-msg-row' });
    var avatar = el('div', { className: 'axi-mini-avatar', textContent: 'AXI' });
    var msgWrap = el('div', { className: 'axi-msg axi-bot' });
    var bubble = el('div', { className: 'axi-bubble' });
    var dots = el('div', { className: 'axi-typing' });
    [1, 2, 3].forEach(function () { dots.appendChild(el('span')); });
    bubble.appendChild(dots);
    msgWrap.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(msgWrap);
    elements.messages.appendChild(row);
    scrollToBottom();
    return row;
  }

  function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function resetChat() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(HISTORY_KEY);
    history = [];
    elements.messages.innerHTML = '';
    getSessionId();
    var welcomeTs = Date.now();
    history.push({ role: 'bot', text: t.welcome, ts: welcomeTs });
    saveHistory(history);
    appendMessage('bot', t.welcome, welcomeTs);
  }

  function setLoading(state) {
    isLoading = state;
    elements.send.disabled = state;
    elements.textarea.disabled = state;
    elements.textarea.style.opacity = state ? '0.5' : '1';
    if (!state) elements.textarea.focus();
  }

  // ─── API call ────────────────────────────────────────────────────────────────
  function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    var sessionId = getSessionId();
    var ts = Date.now();

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
    ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
  }

  // ─── Panel toggle ─────────────────────────────────────────────────────────────
  var isMobile = function () { return window.matchMedia('(max-width:440px)').matches; };

  function openPanel() {
    isOpen = true;
    elements.panel.classList.add('axi-open');
    elements.root.classList.add('axi-chat-active');
    elements.toggle.innerHTML = iconClose;
    if (isMobile()) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    // Don't auto-focus on mobile — keyboard popping up immediately hides the welcome message.
    if (!isMobile()) elements.textarea.focus();
    scrollToBottom();
  }

  function closePanel() {
    isOpen = false;
    elements.panel.classList.remove('axi-open');
    elements.root.classList.remove('axi-chat-active');
    elements.toggle.innerHTML = iconChat;
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  // ─── Build DOM ───────────────────────────────────────────────────────────────
  function build() {
    var style = el('style', { innerHTML: css });
    document.head.appendChild(style);

    var root = el('div', { id: 'axi-chat-root' });

    // Toggle button
    var toggle = el('button', { id: 'axi-chat-toggle', 'aria-label': 'Open AXI chat', innerHTML: iconChat });
    toggle.addEventListener('click', function () {
      isOpen ? closePanel() : openPanel();
    });

    // Panel
    var panel = el('div', { id: 'axi-chat-panel', role: 'dialog', 'aria-label': 'AXI Chat' });

    // Header — avatar + name + status + close
    var avatarImg = el('img', { src: 'images/axi-logo.png', alt: 'AXI' });
    var avatar = el('div', { className: 'axi-avatar' }, [avatarImg]);
    var titleEl = el('div', { className: 'axi-header-title', textContent: 'AXI AGENCY' });
    var headerText = el('div', { className: 'axi-header-text' }, [
      titleEl,
      el('div', { className: 'axi-header-sub', textContent: t.subheader }),
    ]);
    var resetBtn = el('button', { id: 'axi-chat-reset', 'aria-label': 'Reset chat', innerHTML: iconReset });
    resetBtn.addEventListener('click', resetChat);
    var closeBtn = el('button', { id: 'axi-chat-close', 'aria-label': 'Close chat', innerHTML: iconClose });
    closeBtn.addEventListener('click', closePanel);
    var header = el('div', { id: 'axi-chat-header' }, [avatar, headerText, resetBtn, closeBtn]);

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
    // Mobile: after keyboard opens, re-scroll to bottom so latest messages are visible
    textarea.addEventListener('focus', function () {
      if (isMobile()) setTimeout(scrollToBottom, 300);
    });

    var sendBtn = el('button', { id: 'axi-chat-send', 'aria-label': t.send, innerHTML: iconSend });
    sendBtn.addEventListener('click', function () { sendMessage(textarea.value); });

    var inputArea = el('div', { id: 'axi-chat-input-area' }, [textarea, sendBtn]);

    // Branded footer
    var footer = el('div', { id: 'axi-chat-footer' });
    footer.innerHTML = '<span>Powered by AXI Agency</span>';

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputArea);
    panel.appendChild(footer);

    root.appendChild(toggle);
    root.appendChild(panel);
    document.body.appendChild(root);

    elements = { root: root, toggle: toggle, panel: panel, messages: messages, textarea: textarea, send: sendBtn };

    // Render welcome message + history
    history = loadHistory();
    if (history.length === 0) {
      var welcomeTs = Date.now();
      history.push({ role: 'bot', text: t.welcome, ts: welcomeTs });
      saveHistory(history);
    }
    history.forEach(function (msg) { appendMessage(msg.role, msg.text, msg.ts); });
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
