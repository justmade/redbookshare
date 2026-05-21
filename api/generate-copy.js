const { generateCopy } = require("../lib/generate-copy-core");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const result = await generateCopy(req.body || {});
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(result);
};
