const { generateCopy } = require("../../lib/generate-copy-core");

exports.onRequestOptions = async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS"
    }
  });
};

exports.onRequestPost = async function onRequestPost(context) {
  let body = {};
  try {
    body = await context.request.json();
  } catch (error) {
    body = {};
  }

  const result = await generateCopy(body);
  return Response.json(result, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
};

exports.onRequest = async function onRequest() {
  return Response.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        Allow: "POST, OPTIONS"
      }
    }
  );
};
