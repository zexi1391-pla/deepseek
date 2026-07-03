// ==================== Worker 后端（修复版） ====================
// 常量抽离
const NVIDIA_API_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const ALLOW_MODELS = new Set(["z-ai/glm-5.2", "deepseek-ai/deepseek-v4-pro"]);
const MAX_REQUEST_BODY_SIZE = 1024 * 1024; // 1MB 请求体限制
const FETCH_TIMEOUT = 25000; // 25s 超时

// ==================== 前端 HTML（修复后完整代码） ====================
const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>AI Chat</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
body { background: #1e1e2f; color: #cdd6f4; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
header { background: #313244; padding: 12px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; border-bottom: 1px solid #45475a; flex-wrap: wrap; }
header h1 { font-size: 18px; font-weight: 600; flex: 1; min-width: 120px; }
#modeToggle { background: none; border: none; font-size: 26px; cursor: pointer; padding: 0 4px; transition: 0.2s; line-height: 1; }
#modeToggle:hover { transform: scale(1.1); }
header select { background: #45475a; color: #cdd6f4; border: none; padding: 6px 12px; border-radius: 8px; font-size: 14px; outline: none; }
.settings-toggle { background: none; border: none; color: #cdd6f4; font-size: 20px; cursor: pointer; }
#settingsPanel { background: #313244; padding: 12px 16px; display: none; flex-direction: column; gap: 10px; border-bottom: 1px solid #45475a; font-size: 14px; flex-shrink: 0; overflow-y: auto; max-height: 60vh; }
#settingsPanel label { display: flex; align-items: center; gap: 8px; cursor: pointer; flex-wrap: wrap; }
#settingsPanel textarea { width: 100%; background: #45475a; color: #cdd6f4; border: none; border-radius: 8px; padding: 8px; resize: vertical; font-size: 13px; }
#settingsPanel .core-setting { height: 60px; }
#settingsPanel .custom-prompt { height: 80px; }
.settings-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.settings-actions button { background: #45475a; color: #cdd6f4; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
#chatbox { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; line-height: 1.5; word-wrap: break-word; animation: fadeIn 0.2s; white-space: pre-wrap; }
.msg.user { align-self: flex-end; background: #89b4fa; color: #1e1e2f; border-bottom-right-radius: 4px; }
.msg.assistant { align-self: flex-start; background: #313244; border-bottom-left-radius: 4px; }
.msg.system { align-self: center; color: #a6adc8; font-size: 12px; background: transparent; font-style: italic; max-width: 95%; text-align: center; }
.msg.summary { align-self: center; background: #2a2a3a; color: #a6e3a1; font-size: 13px; border-radius: 12px; padding: 6px 16px; border: 1px solid #45475a; max-width: 95%; text-align: center; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
#inputArea { padding: 12px 16px; background: #313244; display: flex; gap: 10px; flex-shrink: 0; border-top: 1px solid #45475a; align-items: flex-end; }
#inputArea textarea { flex: 1; background: #45475a; color: #cdd6f4; border: none; border-radius: 20px; padding: 10px 16px; resize: none; min-height: 46px; max-height: 120px; font-size: 15px; outline: none; line-height: 1.4; overflow-y: auto; }
#inputArea button { background: #89b4fa; color: #1e1e2f; border: none; border-radius: 20px; padding: 0 20px; font-weight: 600; cursor: pointer; font-size: 15px; white-space: nowrap; height: 46px; }
#summaryStatus { font-size: 12px; color: #a6e3a1; margin-left: 12px; white-space: nowrap; }
</style>
</head>
<body>
<header>
<h1>💬 AI Chat</h1>
<button id="modeToggle" onclick="toggleMode()" title="切换对话风格模式">😇</button>
<select id="modelSelect">
  <option value="z-ai/glm-5.2">z-ai/glm-5.2</option>
  <option value="deepseek-ai/deepseek-v4-pro">deepseek-ai/deepseek-v4-pro</option>
</select>
<button class="settings-toggle" onclick="toggleSettings()">⚙️</button>
<span id="summaryStatus" title="当前总字数 / 已总结字数">📝 0字</span>
</header>
<div id="settingsPanel">
  <label><input type="checkbox" id="keepHistory" checked> 保留本地历史</label>
  <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
    <label>总结阈值（字数）：<input type="number" id="summaryThreshold" min="500" step="100" style="width:80px; background:#45475a; color:#cdd6f4; border:none; border-radius:4px; padding:4px;"></label>
  </div>
  <label>📌 角色设定（核心）：</label>
  <textarea id="roleSetting" class="core-setting" placeholder="例如：你是一位名叫艾琳的精灵法师..."></textarea>
  <label>🌍 世界设定（核心）：</label>
  <textarea id="worldSetting" class="core-setting" placeholder="例如：故事发生在艾泽拉斯大陆..."></textarea>
  <label>🧠 长期记忆总结（自动生成）：</label>
  <div style="background:#45475a; border-radius:8px; padding:8px; min-height:40px; color:#a6e3a1; font-size:13px;" id="summaryDisplay">暂无总结</div>
  <label>📝 额外 System Prompt（可选）：</label>
  <textarea id="systemPrompt" class="custom-prompt" placeholder="在这里写额外的系统指令..."></textarea>
  <div class="settings-actions">
    <button onclick="clearHistory()">清除本地历史</button>
    <button onclick="clearTemplate()">清除自定义模板</button>
    <button onclick="forceSummarize()">手动触发总结</button>
  </div>
  <span style="color:#a6adc8;font-size:12px;">⚡ 核心设定 + 长期记忆 + 额外prompt 始终生效（风格模式仅调整输出语气，不绕过安全规范）</span>
</div>
<div id="chatbox"></div>
<div id="inputArea">
  <textarea id="userInput" rows="1" placeholder="输入消息，Shift+Enter换行" onkeydown="handleKeyDown(event)"></textarea>
  <button onclick="sendMessage()" id="sendBtn">发送</button>
</div>
<script>
// ========== 全局变量 ==========
const API_URL = window.location.origin;
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const modelSelect = document.getElementById('modelSelect');
const systemPromptEl = document.getElementById('systemPrompt');
const keepHistoryEl = document.getElementById('keepHistory');
const modeToggleBtn = document.getElementById('modeToggle');
const summaryThresholdInput = document.getElementById('summaryThreshold');
const summaryStatus = document.getElementById('summaryStatus');
const summaryDisplay = document.getElementById('summaryDisplay');
const roleSettingEl = document.getElementById('roleSetting');
const worldSettingEl = document.getElementById('worldSetting');
const sendBtn = document.getElementById('sendBtn');

let isDevil = false;
let isRequesting = false; // 防重复发送锁

// ========== 本地存储键名 ==========
const SUMMARY_KEY = 'summary_text';
const LAST_COUNT_KEY = 'last_summary_word_count';
const DEFAULT_THRESHOLD = 3000;
const ROLE_KEY = 'role_setting';
const WORLD_KEY = 'world_setting';
const HISTORY_KEY = 'chat_history';
const SYSTEM_PROMPT_KEY = 'system_prompt';
const DEVIL_MODE_KEY = 'devil_mode';
const THRESHOLD_KEY = 'summary_threshold';

// ========== 统一封装 LocalStorage 工具（消除重复try-catch） ==========
const Storage = {
  set(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) {}
  },
  get(key) {
    try { return localStorage.getItem(key) ?? ''; } catch (e) { return ''; }
  },
  getNum(key, fallback = 0) {
    const raw = this.get(key);
    const num = parseInt(raw, 10);
    return isNaN(num) ? fallback : num;
  },
  setJson(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  },
  getJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
};

// ========== 读写封装（重构为Storage工具调用） ==========
function loadSummary() { return Storage.get(SUMMARY_KEY); }
function saveSummary(text) { Storage.set(SUMMARY_KEY, text); updateSummaryDisplay(); }
function loadLastCount() { return Storage.getNum(LAST_COUNT_KEY, 0); }
function saveLastCount(count) { Storage.set(LAST_COUNT_KEY, count); }
function getThreshold() {
  const val = parseInt(summaryThresholdInput.value, 10);
  return (val && val > 0) ? val : DEFAULT_THRESHOLD;
}
function loadRoleSetting() { return Storage.get(ROLE_KEY); }
function saveRoleSetting(val) { Storage.set(ROLE_KEY, val); }
function loadWorldSetting() { return Storage.get(WORLD_KEY); }
function saveWorldSetting(val) { Storage.set(WORLD_KEY, val); }
function loadHistory() {
  if (!keepHistoryEl.checked) return [];
  return Storage.getJson(HISTORY_KEY);
}
function saveHistory(msgs) {
  if (keepHistoryEl.checked) Storage.setJson(HISTORY_KEY, msgs);
}
function loadSystemPrompt() { return Storage.get(SYSTEM_PROMPT_KEY); }
function saveSystemPrompt(val) { Storage.set(SYSTEM_PROMPT_KEY, val); }
function loadMode() { return Storage.get(DEVIL_MODE_KEY) === 'true'; }
function saveMode(val) { Storage.set(DEVIL_MODE_KEY, String(val)); }

// ========== 初始化数据 ==========
let messages = loadHistory();
systemPromptEl.value = loadSystemPrompt();
roleSettingEl.value = loadRoleSetting();
worldSettingEl.value = loadWorldSetting();
isDevil = loadMode();
// 修复：初始化读取保存的阈值
const savedThreshold = Storage.get(THRESHOLD_KEY);
if (savedThreshold) summaryThresholdInput.value = savedThreshold;

// ========== UI 更新函数 ==========
function updateModeUI() {
  if (isDevil) {
    modeToggleBtn.textContent = '😈';
    modeToggleBtn.style.filter = 'drop-shadow(0 0 8px #ff9999)';
  } else {
    modeToggleBtn.textContent = '😇';
    modeToggleBtn.style.filter = 'none';
  }
}
updateModeUI();

function getTotalWordCount(msgs) {
  let total = 0;
  for (const m of msgs) {
    if (m.role !== 'system' && m.content) total += m.content.length;
  }
  return total;
}

function updateSummaryStatus() {
  const count = getTotalWordCount(messages);
  const last = loadLastCount();
  summaryStatus.textContent = \`📝 \${count}字 (已总结 \${last}字)\`;
}

function updateSummaryDisplay() {
  const summary = loadSummary();
  summaryDisplay.textContent = summary || '暂无总结';
}

function renderMessages() {
  chatbox.innerHTML = '';
  for (const msg of messages) {
    const div = document.createElement('div');
    div.className = \`msg \${msg.role}\`;
    if (msg.role === 'system') {
      div.textContent = \`🔹 \${msg.content}\`;
    } else if (msg.role === 'summary') {
      div.textContent = \`🧠 \${msg.content}\`;
    } else {
      div.textContent = msg.content;
    }
    chatbox.appendChild(div);
  }
  chatbox.scrollTop = chatbox.scrollHeight;
  updateSummaryStatus();
  updateSummaryDisplay();
}
renderMessages();

// ========== 总结生成 ==========
async function generateSummary(msgs) {
  const summaryPrompt = {
    role: 'system',
    content: '你是长期记忆总结助手。提炼对话主线、人物、关键事件、用户偏好，200字内，仅输出总结文本，无多余描述。'
  };
  const apiMessages = [summaryPrompt];
  for (const m of msgs) {
    if (m.role !== 'system') apiMessages.push(m);
  }
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: apiMessages,
        max_tokens: 512,
        stream: false
      })
    });
    if (!resp.ok) throw new Error(\`API请求失败 \${resp.status}\`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || data.error);
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('总结生成失败:', err);
    return null;
  }
}

async function checkAndSummarize() {
  // 修复：未开启历史存储直接跳过，不浪费API调用
  if (!keepHistoryEl.checked) return;
  const totalWords = getTotalWordCount(messages);
  const lastCount = loadLastCount();
  const threshold = getThreshold();
  if (totalWords - lastCount < threshold) return;

  const summary = await generateSummary(messages);
  if (summary) {
    saveSummary(summary);
    saveLastCount(totalWords);
    messages.push({ role: 'system', content: \`🧠 长期记忆已更新（累计\${totalWords}字）\` });
    saveHistory(messages);
    renderMessages();
    console.log('✅ 自动总结完成');
  }
}

window.forceSummarize = async function() {
  if (messages.length < 2) {
    alert('对话内容过少，无需总结');
    return;
  }
  const summary = await generateSummary(messages);
  if (summary) {
    saveSummary(summary);
    const totalWords = getTotalWordCount(messages);
    saveLastCount(totalWords);
    messages.push({ role: 'system', content: \`🧠 手动更新长期记忆（累计\${totalWords}字）\` });
    saveHistory(messages);
    renderMessages();
  } else {
    alert('总结生成失败，请检查网络与API配置');
  }
};

// ========== 模式切换（修复：移除违规越狱指令，改为语气风格区分） ==========
window.toggleMode = function() {
  isDevil = !isDevil;
  saveMode(isDevil);
  updateModeUI();
  const status = isDevil ? '⚠️ 已切换至直白风格模式' : '✅ 已切换至温和标准模式';
  messages.push({ role: 'system', content: status });
  saveHistory(messages);
  renderMessages();
};

// ========== 键盘事件（修复回车重复发送、换行逻辑） ==========
function handleKeyDown(event) {
  if (event.key === 'Enter') {
    if (event.shiftKey) return; // Shift+Enter允许换行
    event.preventDefault();
    if (!isRequesting) sendMessage();
  }
}

// ========== 发送消息核心（防重复锁、重构system拼接逻辑、移除违规越狱Prompt） ==========
window.sendMessage = async function() {
  const text = userInput.value.trim();
  if (!text || isRequesting) return;
  // 上锁防重复
  isRequesting = true;
  sendBtn.disabled = true;

  messages.push({ role: 'user', content: text });
  userInput.value = '';
  renderMessages();
  saveHistory(messages);

  // 加载中占位
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'msg assistant';
  loadingDiv.textContent = '⏳ AI思考中...';
  loadingDiv.id = 'loading-tip';
  chatbox.appendChild(loadingDiv);
  chatbox.scrollTop = chatbox.scrollHeight;

  // 组装系统提示词（移除违规无限制越狱指令）
  const systemVal = systemPromptEl.value.trim();
  const summary = loadSummary();
  const roleSetting = roleSettingEl.value.trim();
  const worldSetting = worldSettingEl.value.trim();

  let systemContent = '';
  if (roleSetting) systemContent += \`[角色设定]：\${roleSetting}\\n\\n\`;
  if (worldSetting) systemContent += \`[世界设定]：\${worldSetting}\\n\\n\`;
  if (summary) systemContent += \`[长期记忆总结]：\${summary}\\n\\n\`;
  if (systemVal) systemContent += systemVal;
  // 修复：风格模式仅调整输出语气，无绕过安全限制指令
  if (isDevil) {
    systemContent += \`\\n\\n[风格调整]：输出直白简洁，减少委婉修饰，保持合规回答边界\`;
  }

  // 过滤旧system消息，统一前置全局system
  const chatHistory = messages.filter(m => m.role !== 'system');
  const apiMessages = [];
  if (systemContent) apiMessages.push({ role: 'system', content: systemContent });
  apiMessages.push(...chatHistory);

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: apiMessages,
        stream: false
      })
    });
    // 移除加载提示
    const loadingEl = document.getElementById('loading-tip');
    if (loadingEl) loadingEl.remove();

    if (!resp.ok) throw new Error(\`请求状态码 \${resp.status}\`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || data.error);

    const reply = data.choices?.[0]?.message?.content || '无返回内容';
    messages.push({ role: 'assistant', content: reply });
    saveHistory(messages);
    renderMessages();

    // 异步自动总结
    setTimeout(() => checkAndSummarize(), 100);
  } catch (err) {
    const loadingEl = document.getElementById('loading-tip');
    if (loadingEl) loadingEl.remove();
    const errMsg = \`❌ 请求失败：\${err.message}\`;
    messages.push({ role: 'assistant', content: errMsg });
    saveHistory(messages);
    renderMessages();
  } finally {
    // 解锁，允许再次发送
    isRequesting = false;
    sendBtn.disabled = false;
  }
};

// ========== 设置面板操作 ==========
window.toggleSettings = function() {
  const panel = document.getElementById('settingsPanel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
};

window.clearHistory = function() {
  if (confirm('确认清空全部对话历史与长期记忆？此操作不可恢复')) {
    messages = [];
    saveHistory(messages);
    saveSummary('');
    saveLastCount(0);
    renderMessages();
  }
};

window.clearTemplate = function() {
  systemPromptEl.value = '';
  roleSettingEl.value = '';
  worldSettingEl.value = '';
  saveSystemPrompt('');
  saveRoleSetting('');
  saveWorldSetting('');
};

// ========== 输入框自动保存设置 ==========
systemPromptEl.addEventListener('input', e => saveSystemPrompt(e.target.value));
roleSettingEl.addEventListener('input', e => saveRoleSetting(e.target.value));
worldSettingEl.addEventListener('input', e => saveWorldSetting(e.target.value));
summaryThresholdInput.addEventListener('change', e => Storage.set(THRESHOLD_KEY, e.target.value));

// ========== 启动完成 ==========
updateSummaryStatus();
updateSummaryDisplay();
console.log('✅ AI Chat 页面初始化完成，当前风格模式：', isDevil ? '直白模式' : '温和模式');
</script>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '*';
    // CORS 基础头
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    // 1. OPTIONS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. GET 返回前端页面，开启缓存
    if (request.method === "GET") {
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=1800" // 缓存30分钟
        }
      });
    }

    // 3. POST API 代理
    if (request.method === "POST") {
      try {
        // 限制请求体大小
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > MAX_REQUEST_BODY_SIZE) {
          return new Response(JSON.stringify({ error: "请求内容过大，限制1MB" }), {
            status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 读取请求体
        const rawBody = await request.text();
        let body;
        try {
          body = JSON.parse(rawBody);
        } catch {
          return new Response(JSON.stringify({ error: "JSON格式错误" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 校验API Key
        const apiKey = env.NVIDIA_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
          return new Response(JSON.stringify({ error: "服务端未配置 NVIDIA_API_KEY 环境变量" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 校验模型，禁止非法模型
        const targetModel = body.model || "z-ai/glm-5.2";
        if (!ALLOW_MODELS.has(targetModel)) {
          return new Response(JSON.stringify({ error: "不支持的模型名称" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 构造透传参数，强制关闭流式输出
        const payload = {
          ...body,
          model: targetModel,
          stream: false,
          messages: Array.isArray(body.messages) ? body.messages : []
        };

        // 设置超时控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        // 转发上游NVIDIA请求
        const upstreamResp = await fetch(NVIDIA_API_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify(payload)
        });
        clearTimeout(timeoutId);

        // 转发上游返回数据
        const upstreamData = await upstreamResp.json();
        return new Response(JSON.stringify(upstreamData), {
          status: upstreamResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        // 屏蔽内部错误堆栈，仅对外返回简洁提示
        let errMsg = "服务端请求异常";
        if (err.name === 'AbortError') errMsg = "API请求超时，请重试";
        return new Response(JSON.stringify({ error: errMsg }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 其他请求方法拒绝
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }
};
