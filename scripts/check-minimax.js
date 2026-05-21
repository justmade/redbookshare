const fs = require("node:fs");
const path = require("node:path");

loadEnvFile(".env");
loadEnvFile(".env.local");

const apiKey = process.env.MINIMAX_API_KEY;
const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

if (!apiKey) {
  console.error("MINIMAX_API_KEY is missing.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const response = await fetch("https://api.minimaxi.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Hi, how are you?" }]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  console.log(content || JSON.stringify(data));
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
