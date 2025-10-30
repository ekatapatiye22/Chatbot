const elements = {
  messages: document.getElementById('messages'),
  composer: document.getElementById('composer'),
  prompt: document.getElementById('prompt'),
  send: document.getElementById('send'),
  stop: document.getElementById('stop'),
  template: document.getElementById('message-template'),
  settingsDialog: document.getElementById('settings-dialog'),
  apiKeyInput: document.getElementById('api-key'),
  saveSettings: document.getElementById('save-settings'),
  openSettings: document.getElementById('open-settings'),
  newChat: document.getElementById('new-chat'),
  systemPrompt: document.getElementById('system-prompt'),
  modelSelect: document.getElementById('model-select')
};

const state = {
  apiKey: localStorage.getItem('openai_api_key') || '',
  model: localStorage.getItem('openai_model') || 'gpt-4o-mini',
  systemPrompt: localStorage.getItem('system_prompt') || 'You are a helpful AI assistant.',
  temperature: parseFloat(localStorage.getItem('temperature') || '0.7'),
  topP: parseFloat(localStorage.getItem('top_p') || '1'),
  sessions: JSON.parse(localStorage.getItem('sessions') || '[]'),
  activeSessionId: localStorage.getItem('active_session_id') || null,
  messages: []
};

elements.modelSelect.value = state.model;
elements.systemPrompt.value = state.systemPrompt;
elements.temperature = document.getElementById('temperature');
elements.topP = document.getElementById('top-p');
elements.sessionList = document.getElementById('session-list');
elements.exportJson = document.getElementById('export-json');
elements.importJson = document.getElementById('import-json');

if (elements.temperature) elements.temperature.value = String(state.temperature);
if (elements.topP) elements.topP.value = String(state.topP);

const scrollToBottom = () => {
  elements.messages.scrollTop = elements.messages.scrollHeight;
};

const createMessageEl = (role, htmlContent) => {
  const node = elements.template.content.cloneNode(true);
  const root = node.querySelector('.message');
  root.classList.add(role);
  const avatar = root.querySelector('.avatar');
  const bubble = root.querySelector('.bubble');
  avatar.textContent = role === 'user' ? '🧑' : '🤖';
  bubble.innerHTML = htmlContent;
  return root;
};

const typingEl = () => {
  const el = document.createElement('div');
  el.className = 'flex items-center gap-2 text-slate-400 text-sm';
  el.innerHTML = '<span class="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style="animation-delay:0ms"></span>' +
                 '<span class="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style="animation-delay:150ms"></span>' +
                 '<span class="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style="animation-delay:300ms"></span>';
  return el;
};

const addUserMessage = (text) => {
  const html = `<div class="md">${window.renderMarkdown(text)}</div>`;
  const el = createMessageEl('user', html);
  elements.messages.appendChild(el);
  scrollToBottom();
};

const addAssistantMessageShell = () => {
  const el = createMessageEl('assistant', '');
  const bubble = el.querySelector('.bubble');
  const t = typingEl();
  bubble.appendChild(t);
  elements.messages.appendChild(el);
  scrollToBottom();
  return { el, bubble };
};

function hydrateCodeBlocks(rootEl) {
  const blocks = rootEl.querySelectorAll('pre code');
  blocks.forEach((block) => {
    try { window.hljs && window.hljs.highlightElement(block); } catch (_) {}
    const pre = block.closest('pre');
    if (pre && !pre.querySelector('[data-copy-code]')) {
      const btn = document.createElement('button');
      btn.textContent = 'Copy';
      btn.className = 'absolute right-2 top-2 text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700';
      btn.setAttribute('data-copy-code', '');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(block.innerText);
      });
      pre.classList.add('relative');
      pre.appendChild(btn);
    }
  });
}

const enableUI = (enabled) => {
  elements.prompt.disabled = !enabled;
  elements.send.disabled = !enabled;
  elements.stop.disabled = enabled; // stop enabled while streaming
};

const saveSettingsToLocalStorage = () => {
  localStorage.setItem('openai_api_key', state.apiKey);
  localStorage.setItem('openai_model', state.model);
  localStorage.setItem('system_prompt', state.systemPrompt);
};

elements.openSettings?.addEventListener('click', () => {
  elements.apiKeyInput.value = state.apiKey;
  elements.settingsDialog.showModal();
});

elements.saveSettings?.addEventListener('click', (e) => {
  e.preventDefault();
  state.apiKey = elements.apiKeyInput.value.trim();
  saveSettingsToLocalStorage();
  elements.settingsDialog.close();
});

elements.modelSelect?.addEventListener('change', () => {
  state.model = elements.modelSelect.value;
  saveSettingsToLocalStorage();
});

elements.systemPrompt?.addEventListener('input', () => {
  state.systemPrompt = elements.systemPrompt.value;
  saveSettingsToLocalStorage();
});

elements.temperature?.addEventListener('input', () => {
  const v = parseFloat(elements.temperature.value);
  if (!Number.isNaN(v)) { state.temperature = v; localStorage.setItem('temperature', String(v)); }
});
elements.topP?.addEventListener('input', () => {
  const v = parseFloat(elements.topP.value);
  if (!Number.isNaN(v)) { state.topP = v; localStorage.setItem('top_p', String(v)); }
});

// Sessions management
function generateId() { return Math.random().toString(36).slice(2, 10); }
function saveSessions() {
  localStorage.setItem('sessions', JSON.stringify(state.sessions));
  if (state.activeSessionId) localStorage.setItem('active_session_id', state.activeSessionId);
}
function ensureActiveSession() {
  if (!state.activeSessionId) {
    const id = generateId();
    const session = { id, title: 'New Chat', createdAt: Date.now(), messages: [] };
    state.sessions.unshift(session);
    state.activeSessionId = id;
    saveSessions();
  }
}
function getActiveSession() {
  ensureActiveSession();
  return state.sessions.find(s => s.id === state.activeSessionId);
}
function renderSessions() {
  if (!elements.sessionList) return;
  elements.sessionList.innerHTML = '';
  state.sessions.forEach((s) => {
    const btn = document.createElement('div');
    btn.className = `flex items-center justify-between gap-2 px-2 py-1.5 rounded cursor-pointer ${s.id === state.activeSessionId ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/60'}`;
    const title = document.createElement('div');
    title.className = 'truncate text-sm';
    title.textContent = s.title || 'Untitled';
    const actions = document.createElement('div');
    actions.className = 'flex gap-1 text-xs text-slate-400';
    const rename = document.createElement('button'); rename.textContent = 'Rename'; rename.className = 'px-1 py-0.5 rounded bg-slate-800 border border-slate-700';
    const del = document.createElement('button'); del.textContent = 'Delete'; del.className = 'px-1 py-0.5 rounded bg-slate-800 border border-slate-700';
    actions.append(rename, del);
    btn.append(title, actions);
    btn.addEventListener('click', (e) => {
      if (e.target === rename || e.target === del) return;
      state.activeSessionId = s.id; localStorage.setItem('active_session_id', s.id);
      loadSessionMessages(); renderSessions();
    });
    rename.addEventListener('click', (e) => {
      e.stopPropagation();
      const newTitle = prompt('Rename chat', s.title || '');
      if (newTitle != null) { s.title = newTitle.trim() || s.title; saveSessions(); renderSessions(); }
    });
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      state.sessions = state.sessions.filter(x => x.id !== s.id);
      if (state.activeSessionId === s.id) state.activeSessionId = null;
      saveSessions(); ensureActiveSession(); renderSessions(); loadSessionMessages();
    });
    elements.sessionList.appendChild(btn);
  });
}
function loadSessionMessages() {
  const session = getActiveSession();
  state.messages = [...(session?.messages || [])];
  elements.messages.innerHTML = '';
  for (const m of state.messages) {
    const html = `<div class=\"md prose prose-invert max-w-none\">${window.renderMarkdown(m.content)}</div>`;
    const el = createMessageEl(m.role, html);
    elements.messages.appendChild(el);
  }
  scrollToBottom();
}

elements.newChat?.addEventListener('click', () => {
  const id = generateId();
  const session = { id, title: 'New Chat', createdAt: Date.now(), messages: [] };
  state.sessions.unshift(session);
  state.activeSessionId = id;
  saveSessions();
  renderSessions();
  loadSessionMessages();
});

let abortController = null;

async function sendChat(messages) {
  if (!state.apiKey) {
    // If no API key in browser, use proxy endpoint
  }

  abortController = new AbortController();

  const useProxy = !state.apiKey;
  const url = useProxy ? '/api/responses' : 'https://api.openai.com/v1/responses';
  const headers = { 'Content-Type': 'application/json' };
  if (!useProxy) headers['Authorization'] = `Bearer ${state.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: state.model,
      input: messages,
      stream: true,
      temperature: state.temperature,
      top_p: state.topP
    }),
    signal: abortController.signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.body;
}

function parseSSE(line) {
  if (!line.startsWith('data:')) return null;
  const json = line.slice(5).trim();
  if (json === '[DONE]') return { done: true };
  try { return JSON.parse(json); } catch (_) { return null; }
}

async function streamAssistant(messages, targetEl) {
  enableUI(false);
  let fullText = '';
  try {
    const body = await sendChat(messages);
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    // Replace typing indicator with actual content container
    targetEl.innerHTML = '';
    const contentEl = document.createElement('div');
    contentEl.className = 'md prose prose-invert max-w-none';
    targetEl.appendChild(contentEl);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const evt = parseSSE(line);
        if (!evt) continue;
        if (evt.done) break;
        const output = evt.output?.[0];
        const type = output?.type;
        if (type === 'message_delta' || type === 'message') {
          const contentParts = output.content || [];
          for (const part of contentParts) {
            if (part.type === 'output_text' || part.type === 'input_text') {
              fullText += part.text || '';
              contentEl.innerHTML = window.renderMarkdown(fullText);
              hydrateCodeBlocks(contentEl);
              scrollToBottom();
            }
          }
        }
      }
    }

    return fullText.trim();
  } catch (err) {
    targetEl.innerHTML = '';
    const errorEl = document.createElement('div');
    errorEl.style.color = '#ff9494';
    errorEl.textContent = `Error: ${err.message || err}`;
    targetEl.appendChild(errorEl);
    throw err;
  } finally {
    enableUI(true);
    abortController = null;
  }
}

// Add/replace a non-streaming assistant function
async function singleCompletionAssistant(messages, targetEl) {
  enableUI(false);
  let fullText = '';
  try {
    // Use sendChat to get a Response, but just json parse it now
    const useProxy = !state.apiKey;
    const url = useProxy ? '/api/responses' : 'https://api.openai.com/v1/chat/completions';
    const headers = { 'Content-Type': 'application/json' };
    if (!useProxy) headers['Authorization'] = `Bearer ${state.apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: state.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: state.temperature,
        top_p: state.topP,
        stream: false
      })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || `HTTP ${resp.status}`);
    }
    const json = await resp.json();
    fullText = json.choices?.[0]?.message?.content || '';
    targetEl.innerHTML = `<div class="md prose prose-invert max-w-none">${window.renderMarkdown(fullText)}</div>`;
    hydrateCodeBlocks(targetEl);
    scrollToBottom();
    return fullText.trim();
  } catch (err) {
    targetEl.innerHTML = '';
    const errorEl = document.createElement('div');
    errorEl.style.color = '#ff9494';
    errorEl.textContent = `Error: ${err.message || err}`;
    targetEl.appendChild(errorEl);
    throw err;
  } finally {
    enableUI(true);
    abortController = null;
  }
}

elements.stop.addEventListener('click', () => {
  if (abortController) {
    abortController.abort();
  }
});

elements.composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = elements.prompt.value.trim();
  if (!text) return;

  // Add user message to UI and state
  addUserMessage(text);
  state.messages.push({ role: 'user', content: text });
  const currentSession = getActiveSession();
  if (currentSession) { currentSession.messages = [...state.messages]; currentSession.title = state.messages[0]?.content?.slice(0,60) || 'New Chat'; saveSessions(); renderSessions(); }
  elements.prompt.value = '';

  // Now build input array after state update
  const input = [];
  if (state.systemPrompt) {
    input.push({ role: 'system', content: state.systemPrompt });
  }
  for (const m of state.messages) {
    input.push({ role: m.role, content: m.content });
  }

  // Prepare assistant shell
  const { bubble } = addAssistantMessageShell();

  try {
    // Use the new non-streaming assistant function:
    const assistantText = await singleCompletionAssistant(input, bubble);
    state.messages.push({ role: 'assistant', content: assistantText });
    if (currentSession) { currentSession.messages = [...state.messages]; saveSessions(); }
  } catch (_) {
    // Error message already shown in the bubble
  }
});

// Keyboard UX: submit on Enter, newline with Shift+Enter
elements.prompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    elements.send.click();
  }
});

// Initial welcome and session boot
(() => {
  ensureActiveSession();
  renderSessions();
  loadSessionMessages();
  if (state.messages.length === 0) {
    const hello = createMessageEl('assistant', '<strong>Hi!</strong> Ask me anything.');
    elements.messages.appendChild(hello);
  }
})();

// Export / Import
elements.exportJson?.addEventListener('click', () => {
  const data = { sessions: state.sessions, model: state.model, systemPrompt: state.systemPrompt };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'chat-export.json'; a.click(); URL.revokeObjectURL(url);
});
elements.importJson?.addEventListener('change', async () => {
  const file = elements.importJson.files?.[0]; if (!file) return;
  const text = await file.text();
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json.sessions)) state.sessions = json.sessions;
    if (typeof json.model === 'string') state.model = json.model;
    if (typeof json.systemPrompt === 'string') state.systemPrompt = json.systemPrompt;
    saveSessions();
    elements.modelSelect.value = state.model;
    elements.systemPrompt.value = state.systemPrompt;
    renderSessions(); loadSessionMessages();
  } catch (e) { alert('Invalid JSON'); }
  elements.importJson.value = '';
});

// Presets
elements.presetHelpful?.addEventListener('click', (e) => { e.preventDefault(); elements.systemPrompt.value = 'You are a helpful, concise AI assistant.'; elements.systemPrompt.dispatchEvent(new Event('input')); });
elements.presetCoder?.addEventListener('click', (e) => { e.preventDefault(); elements.systemPrompt.value = 'You are a senior software engineer. Provide correct, well-explained code with best practices.'; elements.systemPrompt.dispatchEvent(new Event('input')); });
elements.presetSummarize?.addEventListener('click', (e) => { e.preventDefault(); elements.systemPrompt.value = 'Summarize the user content clearly with bullet points and key takeaways.'; elements.systemPrompt.dispatchEvent(new Event('input')); });

// Message actions (copy/retry/edit/tts)
elements.messages.addEventListener('click', async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.getAttribute('data-action');
  if (!action) return;
  const messageRoot = target.closest('.message');
  if (!messageRoot) return;
  const idx = Array.from(elements.messages.children).indexOf(messageRoot);
  if (idx < 0) return;
  const role = messageRoot.classList.contains('user') ? 'user' : 'assistant';
  const bubble = messageRoot.querySelector('.bubble');
  const textContent = bubble?.innerText || '';
  if (action === 'copy') {
    await navigator.clipboard.writeText(textContent);
  } else if (action === 'retry') {
    const { bubble: newBubble } = addAssistantMessageShell();
    const input = [];
    if (state.systemPrompt) input.push({ role: 'system', content: state.systemPrompt });
    for (const m of state.messages) input.push({ role: m.role, content: m.content });
    try {
      const assistantText = await streamAssistant(input, newBubble);
      state.messages.push({ role: 'assistant', content: assistantText });
      const s = getActiveSession(); if (s) { s.messages = [...state.messages]; saveSessions(); }
    } catch {}
  } else if (action === 'edit') {
    if (role !== 'user') return;
    const original = state.messages[idx]?.content || '';
    const edited = prompt('Edit your message', original);
    if (edited == null) return;
    state.messages[idx].content = edited;
    bubble.innerHTML = `<div class=\"md prose prose-invert max-w-none\">${window.renderMarkdown(edited)}</div>`;
    const s = getActiveSession(); if (s) { s.messages = [...state.messages]; saveSessions(); }
  } else if (action === 'tts') {
    const utter = new SpeechSynthesisUtterance(textContent);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
});


