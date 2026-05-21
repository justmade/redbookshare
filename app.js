(function () {
  const state = {
    config: null,
    copy: "",
    ready: false
  };

  const els = {
    title: document.getElementById("activityTitle"),
    heroImage: document.getElementById("heroImage"),
    copyText: document.getElementById("copyText"),
    copyStatus: document.getElementById("copyStatus"),
    message: document.getElementById("message"),
    shareButton: document.getElementById("shareButton"),
    buttonText: document.getElementById("buttonText"),
    fallbackLink: document.getElementById("fallbackLink")
  };

  init();

  async function init() {
    const config = await loadConfig();
    state.config = config;
    applyConfig(config);
    await generateCopy();
    els.shareButton.addEventListener("click", handleShare);
  }

  async function loadConfig() {
    try {
      const response = await fetch("/activity.config.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Config request failed");
      return await response.json();
    } catch (error) {
      return {
        activityName: "小红书活动分享",
        heroImage: "/assets/activity-placeholder.svg",
        redbookUrl: "https://www.xiaohongshu.com/",
        buttonText: "复制文案并打开小红书",
        fallbackCopy: "我刚参加了一个很值得分享的活动，内容很实用，体验也很不错。感兴趣的话可以一起看看。"
      };
    }
  }

  function applyConfig(config) {
    document.title = config.activityName || "小红书活动分享";
    els.title.textContent = config.activityName || "小红书活动分享";
    els.heroImage.src = config.heroImage || "/assets/activity-placeholder.svg";
    els.heroImage.alt = config.activityName ? `${config.activityName}图片` : "活动分享图片";
    els.buttonText.textContent = config.buttonText || "复制文案并打开小红书";
    els.fallbackLink.href = config.redbookUrl || "https://www.xiaohongshu.com/";
  }

  async function generateCopy() {
    setStatus("生成中", "");
    els.copyText.textContent = "正在为你生成专属分享文案...";
    els.shareButton.disabled = true;

    try {
      const response = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: getVisitId(),
          timestamp: new Date().toISOString()
        })
      });
      const data = await response.json();
      if (!response.ok || !data.copy) throw new Error(data.error || "Generate copy failed");
      setCopy(data.copy, data.fallback ? "兜底文案" : "已生成", data.fallback ? "error" : "ready");
      if (data.fallback) {
        setMessage("AI 文案暂时不可用，已为你准备默认文案。", true);
      }
    } catch (error) {
      setCopy(state.config.fallbackCopy, "兜底文案", "error");
      setMessage("AI 文案暂时不可用，已为你准备默认文案。", true);
    }
  }

  function setCopy(copy, status, statusClass) {
    state.copy = copy || state.config.fallbackCopy;
    state.ready = true;
    els.copyText.textContent = state.copy;
    setStatus(status, statusClass);
    els.shareButton.disabled = false;
  }

  async function handleShare() {
    if (!state.ready) return;
    els.shareButton.disabled = true;
    setMessage("正在复制文案...");

    const copied = await copyToClipboard(state.copy);
    if (!copied) {
      setMessage("自动复制失败，请长按上方文案手动复制，再点击下方链接打开小红书。", true);
      els.shareButton.disabled = false;
      return;
    }

    setMessage("文案已复制，正在打开小红书...");
    window.location.href = state.config.redbookUrl || "https://www.xiaohongshu.com/";
    window.setTimeout(() => {
      els.shareButton.disabled = false;
      setMessage("如果没有自动打开，请点击下方链接继续。");
    }, 1200);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return fallbackCopy(text);
      }
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  function getVisitId() {
    const random = Math.random().toString(36).slice(2);
    return `${Date.now()}-${random}`;
  }

  function setStatus(text, className) {
    els.copyStatus.textContent = text;
    els.copyStatus.className = `status ${className || ""}`.trim();
  }

  function setMessage(text, isError) {
    els.message.textContent = text || "";
    els.message.className = `message ${isError ? "error" : ""}`.trim();
  }
})();
