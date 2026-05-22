const MINIMAX_ENDPOINT = "https://api.minimaxi.com/v1/chat/completions";
const CONFIG = {
  activityName: "小红书活动分享",
  fallbackCopy: "我刚参加了一个很值得分享的活动，内容很实用，体验也很不错。感兴趣的话可以一起看看。",
  copyRules: {
    targetAudience: "准备在小红书分享活动体验的用户",
    tone: "自然、真实、有生活感，像普通用户主动分享，不要像广告",
    length: "80 到 140 个中文字符",
    mustInclude: ["活动体验", "值得分享"],
    avoid: ["夸张承诺", "硬广语气", "虚假价格或优惠", "联系方式"],
    angles: ["真实体验感", "适合朋友一起参与", "活动内容有记忆点", "轻松种草", "个人收获"]
  }
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS"
    }
  });
}

export async function onRequestPost(context) {
  let body = {};
  try {
    body = await context.request.json();
  } catch (error) {
    body = {};
  }

  const result = await generateCopy(body, context.env || {});
  return json(result, 200, {
    "Cache-Control": "no-store"
  });
}

export async function onRequest() {
  return json(
    { error: "Method not allowed" },
    405,
    {
      Allow: "POST, OPTIONS"
    }
  );
}

async function generateCopy(requestBody, env) {
  const fallbackCopy = cleanCopy(CONFIG.fallbackCopy);
  const apiKey = env.MINIMAX_API_KEY;
  const model = env.MINIMAX_MODEL || "MiniMax-M2.7";

  if (!apiKey) {
    return { copy: fallbackCopy, fallback: true, reason: "missing_api_key" };
  }

  const angle = pickAngle(CONFIG.copyRules.angles);
  const prompt = buildPrompt(CONFIG, angle, requestBody || {});

  try {
    const response = await fetch(MINIMAX_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
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
      model: data.model || model,
      usage: data.usage || null
    };
  } catch (error) {
    return { copy: fallbackCopy, fallback: true, reason: "request_failed" };
  }
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

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}
