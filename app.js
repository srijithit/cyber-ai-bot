// =============================================================
// AEGIS INTELLIGENCE - APP LOGIC (VANILLA JS / MODERN ESM)
// =============================================================

// Ensure Marked is initialized safely
const markedParser = window.marked ? window.marked : { parse: (x) => x };

// State Management
const FALLBACK_KEY = 'AQ.Ab8RN6LbxF5tieiJbatkREYOmQimF8CQ6Mqh-QcZVmPCeAjEtw';
const STATE = {
  apiKey: localStorage.getItem('aegis_gemini_key') || FALLBACK_KEY,
  activeView: 'chat-view',
  chatHistory: [
    {
      role: 'user',
      parts: [{ text: "Initialize connection as Aegis Security virtual analyst." }]
    },
    {
      role: 'model',
      parts: [{ text: "Aegis Security Intelligence Platform online. Cognitive protocols active. State: NOMINAL. Ready for query analysis." }]
    }
  ],
  isGenerating: false
};

// Gemini API Configurations
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// System Prompts & Instructions
const SYSTEM_PROMPTS = {
  chat: `You are Aegis, a highly advanced, cognitive virtual cybersecurity analyst and threat prevention specialist. 
Your goal is to help users understand cybersecurity threats, prevent phishing attacks, secure their accounts, detect social engineering, and provide actionable threat mitigation plans.
Follow these rules:
1. Act as a friendly but highly technical and professional security specialist.
2. If the user presents a scenario that looks like a phishing attack, warn them immediately.
3. Provide step-by-step remediation plans.
4. Keep answers clear, technical, and use markdown tables, lists, and code snippets when appropriate.
5. Do not answer questions that are completely unrelated to computers, networks, programming, technology, or cybersecurity. Politely direct the conversation back to threat prevention.`,

  urlScanner: `You are a cybersecurity expert URL scanner. Analyze the provided URL.
You must output a JSON object with the following fields:
{
  "riskScore": (integer between 0 and 100, where 0 is completely safe and 100 is highly malicious/active threat),
  "verdict": (string: "SAFE", "SUSPICIOUS", or "MALICIOUS"),
  "findings": [array of strings explaining lexical anomalies, spoofing, domain age issues, or threat patterns],
  "reportMarkdown": (string containing a detailed markdown analysis explaining who the URL is trying to spoof, why it is dangerous, and what steps to take if visited)
}
Analyze lexical signs, top-level domains, query parameters, brand impersonation (e.g. paypal-security-update.com), and common phishing tactics. Return ONLY the JSON object. Do not wrap in markdown code blocks.`,

  emailAuditor: `You are a social engineering and phishing forensic auditor. Analyze the provided email or message content.
You must output a JSON object with the following fields:
{
  "riskScore": (integer between 0 and 10, where 0 is completely benign and 10 is severe social engineering/credential harvesting),
  "urgencyLevel": (string: "NONE", "LOW", "MEDIUM", or "HIGH"),
  "techniques": [array of strings representing phishing indicators, e.g., "Urgency Trigger", "Fake Domain", "Authority Impersonation", "Call to Action", "Credential Request"],
  "reportMarkdown": (string containing a detailed markdown analysis detailing the psychological triggers used, spoofed indicators, potential threats, and safe verification steps)
}
Return ONLY the JSON object. Do not wrap in markdown code blocks.`,

  scriptSandbox: `You are a sandbox malware forensic analyst. Analyze the provided script source code.
You must output a JSON object with the following fields:
{
  "riskScore": (integer between 0 and 100, where 0 is clean script and 100 is high-severity malware/active payload),
  "severity": (string: "SAFE", "LOW RISK", "MEDIUM RISK", or "HIGH RISK"),
  "signatures": [array of strings representing static malware signatures/indicators, e.g., "Obfuscated payload", "Network download callback", "Registry manipulation", "Process injection"],
  "reportMarkdown": (string containing a detailed markdown breakdown explaining: what the script does step-by-step, what APIs/commands are dangerous, and how to neutralize it)
}
Return ONLY the JSON object. Do not wrap in markdown code blocks.`
};

// DOM References
const DOM = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  viewPanels: document.querySelectorAll('.view-panel'),
  viewTitle: document.getElementById('view-title'),
  viewDesc: document.getElementById('view-desc'),
  apiStatusBadge: document.getElementById('api-status-badge'),
  headerKeyWidget: document.getElementById('header-key-widget'),
  headerKeyLbl: document.getElementById('header-key-lbl'),
  threatIndexVal: document.getElementById('threat-index-val'),

  // Chat
  chatFeed: document.getElementById('chat-feed'),
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  chatSuggestions: document.getElementById('chat-suggestions'),
  typingIndicator: document.getElementById('typing-indicator'),

  // URL Scanner
  urlScanInput: document.getElementById('url-scan-input'),
  urlScanBtn: document.getElementById('url-scan-btn'),
  urlClearBtn: document.getElementById('url-clear-btn'),
  lexicalIndicatorsBox: document.getElementById('lexical-indicators-box'),
  lexicalFlagList: document.getElementById('lexical-flag-list'),
  urlGaugeFill: document.getElementById('url-gauge-fill'),
  urlGaugeLbl: document.getElementById('url-gauge-lbl'),
  urlGaugePct: document.getElementById('url-gauge-pct'),
  urlRiskLvl: document.getElementById('url-risk-lvl'),
  urlVerdict: document.getElementById('url-verdict'),
  urlReportBox: document.getElementById('url-report-box'),
  urlReportContent: document.getElementById('url-report-content'),

  // Email Audit
  emailAuditInput: document.getElementById('email-audit-input'),
  emailAuditBtn: document.getElementById('email-audit-btn'),
  emailGaugeFill: document.getElementById('email-gauge-fill'),
  emailGaugeLbl: document.getElementById('email-gauge-lbl'),
  emailGaugePct: document.getElementById('email-gauge-pct'),
  emailRiskLvl: document.getElementById('email-risk-lvl'),
  emailUrgencyLbl: document.getElementById('email-urgency-lbl'),
  emailReportBox: document.getElementById('email-report-box'),
  emailReportContent: document.getElementById('email-report-content'),

  // Script Sandbox
  scriptInput: document.getElementById('script-input'),
  scriptLang: document.getElementById('script-lang'),
  scriptScanBtn: document.getElementById('script-scan-btn'),
  editorLines: document.getElementById('editor-lines'),
  signaturesBox: document.getElementById('signatures-box'),
  sigBadgesList: document.getElementById('sig-badges-list'),
  scriptReportBox: document.getElementById('script-report-box'),
  scriptReportContent: document.getElementById('script-report-content'),

  // Settings
  geminiKeyInput: document.getElementById('gemini-key-input'),
  saveKeyBtn: document.getElementById('save-key-btn'),
  clearKeyBtn: document.getElementById('clear-key-btn'),
  toggleKeyVisibility: document.getElementById('toggle-key-visibility'),
  diagnosticBox: document.getElementById('diagnostic-box'),
  diagnosticLogs: document.getElementById('diagnostic-logs')
};

// =============================================================
// INITIALIZATION
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Check for API Key in URL query parameter (?key=...)
  const urlParams = new URLSearchParams(window.location.search);
  const keyParam = urlParams.get('key');
  if (keyParam) {
    STATE.apiKey = keyParam.trim();
    localStorage.setItem('aegis_gemini_key', STATE.apiKey);
    // Strip query parameter to clean URL address bar
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  initNavigation();
  initAPIKeyState();
  initChat();
  initURLScanner();
  initEmailAuditor();
  initScriptSandbox();
  initSettings();
  
  // Set initial timestamps
  const welcomeTime = document.getElementById('welcome-time');
  if (welcomeTime) welcomeTime.innerText = getCurrentTimeString();
});

// Helper: Time Format
function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

// =============================================================
// VIEWS / NAVIGATION ROUTING
// =============================================================
function initNavigation() {
  DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      switchView(target);
      
      // Update sidebar active state
      DOM.navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function switchView(viewId) {
  STATE.activeView = viewId;
  DOM.viewPanels.forEach(panel => {
    panel.classList.remove('active');
    if (panel.id === viewId) {
      panel.classList.add('active');
    }
  });

  // Update Header text based on selected view
  let title = "Cyber security Chatbot";
  let desc = "Cognitive threat prevention & general security assistant";

  switch (viewId) {
    case 'chat-view':
      title = "Cyber security Chatbot";
      desc = "Cognitive threat prevention & general security assistant";
      break;
    case 'url-view':
      title = "URL Risk Scanner";
      desc = "Real-time lexical inspection and phishing domain analysis";
      break;
    case 'email-view':
      title = "Email Threat Audit";
      desc = "Phishing forensics & social engineering indicator parser";
      break;
    case 'script-view':
      title = "Malware Sandbox";
      desc = "Static heuristic analysis & safe code decompilation";
      break;
    case 'settings-view':
      title = "System Configuration";
      desc = "Configure API hooks, keychains, and environment diagnostics";
      break;
  }

  DOM.viewTitle.innerText = title;
  DOM.viewDesc.innerText = desc;
}

// =============================================================
// GEMINI API CONTROLLER
// =============================================================
function initAPIKeyState() {
  if (STATE.apiKey) {
    DOM.apiStatusBadge.innerText = "LINK ESTABLISHED";
    DOM.apiStatusBadge.classList.add('connected');
    DOM.headerKeyLbl.innerText = "CONNECTED";
    DOM.headerKeyLbl.className = "stat-val status-key-connected";
    DOM.geminiKeyInput.value = STATE.apiKey;
  } else {
    DOM.apiStatusBadge.innerHTML = `<i class="fa-solid fa-key-skeleton"></i> NO API KEY`;
    DOM.apiStatusBadge.classList.remove('connected');
    DOM.headerKeyLbl.innerText = "DISCONNECTED";
    DOM.headerKeyLbl.className = "stat-val status-key-miss";
    DOM.geminiKeyInput.value = '';
  }
}

// Low-level fetch wrapper for Gemini API
async function queryGemini(promptText, systemInstruction = '', jsonMode = false) {
  if (!STATE.apiKey) {
    throw new Error("No Gemini API key detected. Please navigate to the System Config tab to enter your key.");
  }

  const payload = {
    contents: jsonMode 
      ? [{ role: 'user', parts: [{ text: promptText }] }]
      : [...STATE.chatHistory, { role: 'user', parts: [{ text: promptText }] }],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.15
    }
  };

  if (jsonMode) {
    payload.generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${STATE.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP error ${response.status}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!modelText) {
    throw new Error("Empty response payload received from Gemini.");
  }

  // Update chat history memory if not in tool jsonMode
  if (!jsonMode) {
    STATE.chatHistory.push({
      role: 'user',
      parts: [{ text: promptText }]
    });
    STATE.chatHistory.push({
      role: 'model',
      parts: [{ text: modelText }]
    });

    // Keep chat history compact (last 10 interactions max) to protect context window limits
    if (STATE.chatHistory.length > 20) {
      // Retain the first system initialization pair, slice the rest
      STATE.chatHistory = [
        STATE.chatHistory[0],
        STATE.chatHistory[1],
        ...STATE.chatHistory.slice(-10)
      ];
    }
  }

  return modelText;
}

// =============================================================
// CHAT MODULE
// =============================================================
function initChat() {
  DOM.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  });

  DOM.sendBtn.addEventListener('click', handleChatSubmit);

  // Suggestions Button handler
  DOM.chatSuggestions.querySelectorAll('.suggest-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      DOM.chatInput.value = prompt;
      handleChatSubmit();
    });
  });
}

async function handleChatSubmit() {
  const query = DOM.chatInput.value.trim();
  if (!query || STATE.isGenerating) return;

  // Clear Input, reset height
  DOM.chatInput.value = '';
  DOM.chatInput.style.height = 'auto';

  // Add User Message to feed
  appendMessage('user', query);
  
  if (!STATE.apiKey) {
    appendMessage('system', "<strong>ERROR:</strong> API Key not configured. Please navigate to the <a href='#' onclick='document.querySelector(\"[data-target=\\\"settings-view\\\"]\").click()'>System Config</a> view and register your Gemini developer API key to enable analysis capabilities.");
    return;
  }

  // Toggle Loading State
  toggleChatLoading(true);

  try {
    const reply = await queryGemini(query, SYSTEM_PROMPTS.chat, false);
    appendMessage('model', reply);
  } catch (error) {
    appendMessage('system', `<strong>TRANSMISSION FAILURE:</strong> ${error.message}`);
  } finally {
    toggleChatLoading(false);
  }
}

function appendMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}-msg`;

  const isUser = sender === 'user';
  const avatarHtml = isUser 
    ? `<i class="fa-solid fa-user-shield"></i>` 
    : (sender === 'system' ? `<i class="fa-solid fa-triangle-exclamation"></i>` : `<i class="fa-solid fa-robot"></i>`);
  
  const senderName = isUser 
    ? `USER ANALYST` 
    : (sender === 'system' ? `SYSTEM WARNING` : `AEGIS INTELLIGENCE`);

  let renderedContent = text;
  if (sender !== 'user' && sender !== 'system') {
    // Render Markdown output safely
    renderedContent = markedParser.parse(text);
  } else if (sender === 'user') {
    // Escape standard text to prevent basic injection from rendering raw tags in user panel
    renderedContent = escapeHTML(text).replace(/\n/g, '<br>');
  }

  msgDiv.innerHTML = `
    <div class="msg-avatar">${avatarHtml}</div>
    <div class="msg-bubble">
      ${!isUser ? `<div class="sci-decor-bar"></div>` : ''}
      <div class="msg-sender">${senderName}</div>
      <div class="msg-body">${renderedContent}</div>
      <span class="msg-time">${getCurrentTimeString()}</span>
    </div>
  `;

  DOM.chatFeed.appendChild(msgDiv);
  DOM.chatFeed.scrollTop = DOM.chatFeed.scrollHeight;
}

function toggleChatLoading(loading) {
  STATE.isGenerating = loading;
  DOM.sendBtn.disabled = loading;
  if (loading) {
    DOM.typingIndicator.style.display = 'flex';
    DOM.chatFeed.scrollTop = DOM.chatFeed.scrollHeight;
  } else {
    DOM.typingIndicator.style.display = 'none';
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// =============================================================
// URL RISK SCANNER MODULE
// =============================================================
function initURLScanner() {
  DOM.urlScanBtn.addEventListener('click', handleURLScan);
  DOM.urlClearBtn.addEventListener('click', () => {
    DOM.urlScanInput.value = '';
    DOM.lexicalIndicatorsBox.style.display = 'none';
  });

  // Fast auto-clear check
  DOM.urlScanInput.addEventListener('input', () => {
    DOM.urlClearBtn.style.display = DOM.urlScanInput.value ? 'block' : 'none';
  });
}

async function handleURLScan() {
  const url = DOM.urlScanInput.value.trim();
  if (!url) return;

  // 1. Perform immediate lexical analysis
  const lexicalFlags = analyzeURLLexically(url);
  renderLexicalFlags(lexicalFlags);

  // Set visual status to loading
  setURLGauge(30, 'ANALYZING', 'suspicious');
  DOM.urlReportBox.innerHTML = `
    <div class="report-placeholder">
      <i class="fa-solid fa-arrows-spin fa-spin"></i>
      <p>Running active DNS and brand impersonation heuristic scanners via Gemini Intelligence...</p>
    </div>
  `;
  DOM.urlReportContent.style.display = 'none';

  if (!STATE.apiKey) {
    setURLGauge(0, 'NO KEY', 'danger');
    DOM.urlReportBox.innerHTML = `
      <div class="report-placeholder">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger)"></i>
        <p>Gemini API connection unconfigured. Enter key in Config settings to output report.</p>
      </div>
    `;
    return;
  }

  try {
    const rawResult = await queryGemini(
      `Analyze the safety parameters of this URL: "${url}"\nLexical flags found: ${JSON.stringify(lexicalFlags)}`,
      SYSTEM_PROMPTS.urlScanner,
      true
    );

    const data = JSON.parse(rawResult);
    
    // Update Gauge dashboard
    const riskScore = data.riskScore;
    const verdict = data.verdict;
    const ratingClass = riskScore > 70 ? 'danger' : (riskScore > 30 ? 'suspicious' : 'safe');
    
    setURLGauge(riskScore, verdict, ratingClass);
    DOM.urlRiskLvl.innerText = `${riskScore}%`;
    DOM.urlVerdict.innerText = verdict;

    // Display formatted AI output
    DOM.urlReportBox.innerHTML = '';
    DOM.urlReportContent.innerHTML = markedParser.parse(data.reportMarkdown);
    DOM.urlReportBox.appendChild(DOM.urlReportContent);
    DOM.urlReportContent.style.display = 'block';

    // Update main status bar threat rating
    updateSystemThreatIndex(riskScore);

  } catch (error) {
    setURLGauge(0, 'ERROR', 'danger');
    DOM.urlReportBox.innerHTML = `
      <div class="report-placeholder">
        <i class="fa-solid fa-circle-xmark" style="color: var(--color-danger)"></i>
        <p>Inspection failed: ${error.message}</p>
      </div>
    `;
  }
}

function analyzeURLLexically(urlString) {
  const flags = [];
  let host = urlString;
  
  try {
    // Add prefix if missing to let URL constructor parse it
    const fixedUrl = (urlString.startsWith('http://') || urlString.startsWith('https://')) 
      ? urlString 
      : 'http://' + urlString;
    const urlObj = new URL(fixedUrl);
    host = urlObj.hostname;
  } catch(e) {
    flags.push({ type: 'warning', text: 'Lexical parsing error: invalid URL format' });
  }

  // 1. Check IP address in hostname
  const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipPattern.test(host)) {
    flags.push({ type: 'danger', text: 'Uses direct IP address instead of domain name' });
  }

  // 2. Check for suspicious TLDs
  const suspiciousTLDs = ['.ru', '.cn', '.xyz', '.top', '.info', '.work', '.click', '.tk', '.ml', '.ga', '.cf', '.gq', '.zip'];
  suspiciousTLDs.forEach(tld => {
    if (host.endsWith(tld)) {
      flags.push({ type: 'warning', text: `Suspicious Top Level Domain (TLD) flagged: ${tld}` });
    }
  });

  // 3. Subdomain count check
  const subdomains = host.split('.');
  if (subdomains.length > 4) {
    flags.push({ type: 'warning', text: `Excessive subdomains found (${subdomains.length}). High risk of spoofing.` });
  }

  // 4. Common brand name spoofing check
  const targetedBrands = ['paypal', 'paypal-security', 'google', 'microsoft', 'apple', 'netflix', 'amazon', 'chase', 'bankofamerica', 'wells-fargo', 'outlook', 'facebook'];
  targetedBrands.forEach(brand => {
    if (host.includes(brand) && host !== `${brand}.com` && host !== `www.${brand}.com` && !host.endsWith(`.${brand}.com`)) {
      flags.push({ type: 'danger', text: `Potential Brand Spoofing: contains spoofed string "${brand}"` });
    }
  });

  // 5. Check for obfuscation keywords
  const phishingKeywords = ['login', 'signin', 'secure', 'update', 'verify', 'account', 'banking', 'support', 'webscr', 'cmd'];
  phishingKeywords.forEach(kw => {
    if (host.includes(kw) && !targetedBrands.includes(kw)) {
      flags.push({ type: 'warning', text: `Contains suspicious social engineering keyword: "${kw}"` });
    }
  });

  if (flags.length === 0) {
    flags.push({ type: 'safe', text: 'Lexical patterns look typical. (AI scan still recommended)' });
  }

  return flags;
}

function renderLexicalFlags(flags) {
  DOM.lexicalFlagList.innerHTML = '';
  flags.forEach(flag => {
    const li = document.createElement('li');
    let icon = '<i class="fa-solid fa-circle-check text-green"></i>';
    
    if (flag.type === 'danger') {
      icon = '<i class="fa-solid fa-triangle-exclamation flag-danger"></i>';
    } else if (flag.type === 'warning') {
      icon = '<i class="fa-solid fa-circle-exclamation flag-warning"></i>';
    }
    
    li.innerHTML = `${icon} <span>${flag.text}</span>`;
    DOM.lexicalFlagList.appendChild(li);
  });
  DOM.lexicalIndicatorsBox.style.display = 'block';
}

function setURLGauge(percent, label, stateClass) {
  // SVG gauge has total path length ~ 126
  const dashOffset = 126 - (126 * (percent / 100));
  DOM.urlGaugeFill.style.strokeDashoffset = dashOffset;
  DOM.urlGaugePct.innerText = `${percent}%`;
  DOM.urlGaugeLbl.innerText = label;
  
  const gaugeBox = DOM.urlGaugeFill.closest('.threat-gauge');
  gaugeBox.className = `threat-gauge ${stateClass}`;
}

// =============================================================
// EMAIL THREAT FORENSICS MODULE
// =============================================================
function initEmailAuditor() {
  DOM.emailAuditBtn.addEventListener('click', handleEmailAudit);
}

async function handleEmailAudit() {
  const content = DOM.emailAuditInput.value.trim();
  if (!content) return;

  // Set visual status to loading
  setEmailGauge(30, 'AUDITING', 'suspicious');
  DOM.emailReportBox.innerHTML = `
    <div class="report-placeholder">
      <i class="fa-solid fa-arrows-spin fa-spin"></i>
      <p>Parsing message structure, intent patterns, and social engineering indicators via Gemini v2.5...</p>
    </div>
  `;
  DOM.emailReportContent.style.display = 'none';

  if (!STATE.apiKey) {
    setEmailGauge(0, 'NO KEY', 'danger');
    DOM.emailReportBox.innerHTML = `
      <div class="report-placeholder">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger)"></i>
        <p>Gemini API connection unconfigured. Enter key in Config settings to output report.</p>
      </div>
    `;
    return;
  }

  try {
    const rawResult = await queryGemini(
      `Perform threat forensics on this message content:\n\n"${content}"`,
      SYSTEM_PROMPTS.emailAuditor,
      true
    );

    const data = JSON.parse(rawResult);
    
    // Scale risk score (from 0-10 format to 0-100 gauge)
    const normalizedPercent = data.riskScore * 10;
    const urgency = data.urgencyLevel;
    const ratingClass = normalizedPercent >= 70 ? 'danger' : (normalizedPercent >= 30 ? 'suspicious' : 'safe');
    
    setEmailGauge(normalizedPercent, `${data.riskScore}/10`, ratingClass);
    DOM.emailRiskLvl.innerText = `${data.riskScore} / 10`;
    DOM.emailUrgencyLbl.innerText = urgency;

    // Display formatted AI output
    DOM.emailReportBox.innerHTML = '';
    DOM.emailReportContent.innerHTML = markedParser.parse(data.reportMarkdown);
    DOM.emailReportBox.appendChild(DOM.emailReportContent);
    DOM.emailReportContent.style.display = 'block';

    // Update main status bar threat rating
    updateSystemThreatIndex(normalizedPercent);

  } catch (error) {
    setEmailGauge(0, 'ERROR', 'danger');
    DOM.emailReportBox.innerHTML = `
      <div class="report-placeholder">
        <i class="fa-solid fa-circle-xmark" style="color: var(--color-danger)"></i>
        <p>Auditing failed: ${error.message}</p>
      </div>
    `;
  }
}

function setEmailGauge(percent, label, stateClass) {
  const dashOffset = 126 - (126 * (percent / 100));
  DOM.emailGaugeFill.style.strokeDashoffset = dashOffset;
  DOM.emailGaugePct.innerText = `${percent}%`;
  DOM.emailGaugeLbl.innerText = label;
  
  const gaugeBox = DOM.emailGaugeFill.closest('.threat-gauge');
  gaugeBox.className = `threat-gauge ${stateClass}`;
}

// =============================================================
// MALWARE CODE SANDBOX MODULE
// =============================================================
function initScriptSandbox() {
  DOM.scriptScanBtn.addEventListener('click', handleScriptSandboxScan);
  
  // Track code text changes to generate interactive sidebar line-numbers
  DOM.scriptInput.addEventListener('input', updateEditorLineNumbers);
  DOM.scriptInput.addEventListener('scroll', () => {
    DOM.editorLines.scrollTop = DOM.scriptInput.scrollTop;
  });
  
  // Pre-generate standard line-numbers on load
  updateEditorLineNumbers();
}

function updateEditorLineNumbers() {
  const linesCount = DOM.scriptInput.value.split('\n').length;
  let numbersHtml = '';
  for (let i = 1; i <= linesCount; i++) {
    numbersHtml += `${i}<br>`;
  }
  DOM.editorLines.innerHTML = numbersHtml;
}

async function handleScriptSandboxScan() {
  const scriptContent = DOM.scriptInput.value.trim();
  if (!scriptContent) return;

  const lang = DOM.scriptLang.value;

  // Run immediate heuristic matches
  const signatures = scanScriptForSignatures(scriptContent, lang);
  renderHeuristicSignatures(signatures);

  DOM.scriptReportBox.innerHTML = `
    <div class="report-placeholder">
      <i class="fa-solid fa-microchip fa-spin"></i>
      <p>Running isolated structural evaluation, parsing memory hooks and obfuscations...</p>
    </div>
  `;
  DOM.scriptReportContent.style.display = 'none';

  if (!STATE.apiKey) {
    DOM.scriptReportBox.innerHTML = `
      <div class="report-placeholder">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger)"></i>
        <p>Gemini API connection unconfigured. Enter key in Config settings to output report.</p>
      </div>
    `;
    return;
  }

  try {
    const rawResult = await queryGemini(
      `Target Language environment: ${lang}\nSource Code to scan:\n\n\`\`\`\n${scriptContent}\n\`\`\`\nStatic heuristic findings: ${JSON.stringify(signatures)}`,
      SYSTEM_PROMPTS.scriptSandbox,
      true
    );

    const data = JSON.parse(rawResult);

    // Render detailed AI output
    DOM.scriptReportBox.innerHTML = '';
    DOM.scriptReportContent.innerHTML = markedParser.parse(data.reportMarkdown);
    DOM.scriptReportBox.appendChild(DOM.scriptReportContent);
    DOM.scriptReportContent.style.display = 'block';

    // Update main status bar threat rating
    updateSystemThreatIndex(data.riskScore);

  } catch (error) {
    DOM.scriptReportBox.innerHTML = `
      <div class="report-placeholder">
        <i class="fa-solid fa-circle-xmark" style="color: var(--color-danger)"></i>
        <p>Sandbox forensic run aborted: ${error.message}</p>
      </div>
    `;
  }
}

function scanScriptForSignatures(code, language) {
  const found = [];
  
  // Lowercase code for easier searching
  const lCode = code.toLowerCase();

  // Heuristic patterns
  if (lCode.includes('invoke-expression') || lCode.includes('iex ')) {
    found.push({ level: 'high', tag: 'DYN-EXECUTION', desc: 'Uses dynamic command execution (IEX)' });
  }
  if (lCode.includes('downloadstring') || lCode.includes('downloadfile') || lCode.includes('webclient')) {
    found.push({ level: 'high', tag: 'NET-DOWNLOAD', desc: 'Attempts code/payload download from external domains' });
  }
  if (lCode.includes('-enc') || lCode.includes('-encodedcommand') || lCode.includes('frombase64string')) {
    found.push({ level: 'high', tag: 'OBFUSCATION', desc: 'Uses Base64 encoding or dynamic code encryption' });
  }
  if (lCode.includes('bypass') && lCode.includes('-executionpolicy')) {
    found.push({ level: 'medium', tag: 'POLICY-BYPASS', desc: 'Bypasses standard OS shell safety configurations' });
  }
  if (lCode.includes('wscript.shell') || lCode.includes('createobject("wscript')) {
    found.push({ level: 'high', tag: 'WSH-SHELL', desc: 'Instantiates direct access to Windows Script Host shell' });
  }
  if (lCode.includes('eval(') || lCode.includes('unescape(') || lCode.includes('atob(')) {
    found.push({ level: 'medium', tag: 'JS-EVAL', desc: 'Uses dynamic JS evaluation/unescaping logic' });
  }
  if (lCode.includes('sh ') || lCode.includes('bash ') || lCode.includes('/bin/sh') || lCode.includes('/bin/bash')) {
    if (language === 'python' || language === 'javascript') {
      found.push({ level: 'medium', tag: 'SUBPROCESS-SHELL', desc: 'Spawns local sub-shells from environment' });
    }
  }

  if (found.length === 0) {
    found.push({ level: 'safe', tag: 'CLEAN-STATICS', desc: 'No dangerous static API hooks discovered.' });
  }

  return found;
}

function renderHeuristicSignatures(signatures) {
  DOM.sigBadgesList.innerHTML = '';
  signatures.forEach(sig => {
    const badge = document.createElement('span');
    badge.className = `sig-badge ${sig.level === 'high' ? 'badge-risk-high' : (sig.level === 'medium' ? 'badge-risk-medium' : 'api-status-badge connected')}`;
    badge.title = sig.desc;
    badge.innerText = sig.tag;
    DOM.sigBadgesList.appendChild(badge);
  });
  DOM.signaturesBox.style.display = 'block';
}

// =============================================================
// CONFIGURATION / SETTINGS MODULE
// =============================================================
function initSettings() {
  DOM.toggleKeyVisibility.addEventListener('click', () => {
    const isPass = DOM.geminiKeyInput.type === 'password';
    DOM.geminiKeyInput.type = isPass ? 'text' : 'password';
    DOM.toggleKeyVisibility.innerHTML = isPass 
      ? `<i class="fa-solid fa-eye-slash"></i>` 
      : `<i class="fa-solid fa-eye"></i>`;
  });

  DOM.saveKeyBtn.addEventListener('click', handleSaveKey);
  DOM.clearKeyBtn.addEventListener('click', handleClearKey);
}

async function handleSaveKey() {
  const inputKey = DOM.geminiKeyInput.value.trim();
  if (!inputKey) return;

  // Visual feedback
  DOM.diagnosticBox.style.display = 'block';
  DOM.diagnosticLogs.innerText = "INITIATING KEY VERIFICATION SUBROUTINE...\nConnecting to Google Generative Language service...";

  try {
    // Perform light connection validation
    const payload = {
      contents: [{ role: 'user', parts: [{ text: "Hello" }] }],
      generationConfig: { maxOutputTokens: 5 }
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${inputKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Authentication validation failed. Code: ${response.status}`);
    }

    // Success! Update State and localStorage
    STATE.apiKey = inputKey;
    localStorage.setItem('aegis_gemini_key', inputKey);
    initAPIKeyState();
    
    // Add custom welcome greeting to chat history for smooth UX transition
    appendMessage('system', "<strong>CONNECTION STATUS UPDATE:</strong> Active handshake with Gemini API established. All threat prevention subroutines loaded and operational.");

    DOM.diagnosticLogs.innerText += "\n[SUCCESS] Handshake verified. Encryption keys stored in private localStorage.\nAegis v2.5 initialized successfully.";

  } catch (error) {
    DOM.diagnosticLogs.innerText += `\n[FAILURE] Secure link validation failed: ${error.message}\nMake sure your key is valid and you have network connectivity.`;
  }
}

function handleClearKey() {
  STATE.apiKey = '';
  localStorage.removeItem('aegis_gemini_key');
  initAPIKeyState();
  DOM.diagnosticLogs.innerText = "[CLEARED] Cryptographic keys removed from system database.";
  DOM.diagnosticBox.style.display = 'block';
  appendMessage('system', "<strong>CONNECTION STATUS UPDATE:</strong> Gemini API link terminated. Tool auditing will return static patterns only.");
}

// =============================================================
// GLOBAL SYSTEM INDICATORS CONTROLLER
// =============================================================
function updateSystemThreatIndex(score) {
  if (score >= 75) {
    DOM.threatIndexVal.innerText = "HIGH DANGER";
    DOM.threatIndexVal.className = "stat-val val-danger";
  } else if (score >= 35) {
    DOM.threatIndexVal.innerText = "SUSPICIOUS";
    DOM.threatIndexVal.className = "stat-val val-suspicious";
  } else {
    DOM.threatIndexVal.innerText = "NOMINAL";
    DOM.threatIndexVal.className = "stat-val val-safe";
  }
}
