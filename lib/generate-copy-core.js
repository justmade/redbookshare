const fs = require("node:fs");
const path = require("node:path");

const MINIMAX_ENDPOINT = "https://api.minimaxi.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

async function generateCopy(requestBody = {}) {
  const config = readActivityConfig();
  const fallbackCopy = cleanCopy(config.fallbackCopy || "我刚参加了一个很值得分享的活动，内容很实用，体验也很不错。感兴趣的话可以一起看看。");

  if (!process.env.MINIMAX_API_KEY) {
    return { copy: fallbackCopy, fallback: true, reason: "missing_api_key" };
  }

  const angle = pickAngle(config.copyRules && config.copyRules.angles);
  const prompt = buildPrompt(config, angle, requestBody);

  try {
    const response = await fetch(MINIMAX_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "你是小红书分享文案助手。只输出用户要复制发布的正文，不输出解释、标题、编号或 Markdown。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.9,
        top_p: 0.95,
        max_completion_tokens: 800,
        stream: false
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { copy: fallbackCopy, fallback: true, reason: "minimax_error", detail: data.base_resp || data.error || null };
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const copy = cleanCopy(content);
    if (!copy || data.output_sensitive) {
      return { copy: fallbackCopy, fallback: true, reason: data.output_sensitive ? "output_sensitive" : "empty_output" };
    }

    return {
      copy,
      fallback: false,
      model: data.model || DEFAULT_MODEL,
      usage: data.usage || null
    };
  } catch (error) {
    return { copy: fallbackCopy, fallback: true, reason: "request_failed" };
  }
}

function readActivityConfig() {
  const filePath = path.join(process.cwd(), "activity.config.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function buildPrompt(config, angle, requestBody) {
  const rules = config.copyRules || {};
  const mustInclude = Array.isArray(rules.mustInclude) ? rules.mustInclude.join("、") : "";
  const avoid = Array.isArray(rules.avoid) ? rules.avoid.join("、") : "";
  const nonce = requestBody.visitId || `${Date.now()}-${Math.random()}`;

  return [
    `活动名称：${config.activityName || "小红书活动分享"}`,
    `目标人群：${rules.targetAudience || "小红书用户"}`,
    `文案风格：${rules.tone || "自然真实，不像广告"}`,
    `字数要求：${rules.length || "80 到 140 个中文字符"}`,
    `本次角度：${angle}`,
    mustInclude ? `必须自然包含：${mustInclude}` : "",
    avoid ? `避免：${avoid}` : "",
    `随机种子：${nonce}`,
    "请生成一条适合用户复制到小红书发布的中文分享文案。要求每次表达不同，口吻像真实用户体验分享，可以使用少量 emoji，但不要超过 2 个。只输出正文。"
  ].filter(Boolean).join("\n");
}

function pickAngle(angles) {
  if (!Array.isArray(angles) || angles.length === 0) return "真实体验分享";
  return angles[Math.floor(Math.random() * angles.length)];
}

function cleanCopy(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 260);
}

module.exports = { generateCopy };
