const fs = require("node:fs");
const path = require("node:path");

loadEnvFile(".env");
loadEnvFile(".env.local");

const config = JSON.parse(fs.readFileSync("activity.config.json", "utf8"));
const rules = config.copyRules || {};
const angle = Array.isArray(rules.angles) && rules.angles.length > 0 ? rules.angles[0] : "真实体验分享";
const prompt = [
  `活动名称：${config.activityName || "小红书活动分享"}`,
  `目标人群：${rules.targetAudience || "小红书用户"}`,
  `文案风格：${rules.tone || "自然真实，不像广告"}`,
  `字数要求：${rules.length || "80 到 140 个中文字符"}`,
  `本次角度：${angle}`,
  Array.isArray(rules.mustInclude) ? `必须自然包含：${rules.mustInclude.join("、")}` : "",
  Array.isArray(rules.avoid) ? `避免：${rules.avoid.join("、")}` : "",
  "随机种子：debug",
  "请生成一条适合用户复制到小红书发布的中文分享文案。要求每次表达不同，口吻像真实用户体验分享，可以使用少量 emoji，但不要超过 2 个。只输出正文。"
].filter(Boolean).join("\n");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const response = await fetch("https://api.minimaxi.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.MINIMAX_MODEL || "MiniMax-M2.7",
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
  console.log(JSON.stringify({
    ok: response.ok,
    status: response.status,
    finishReason: data.choices && data.choices[0] && data.choices[0].finish_reason,
    content: data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content,
    baseResp: data.base_resp,
    error: data.error
  }, null, 2));
}

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}
