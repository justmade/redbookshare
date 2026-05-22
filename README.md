# Redbook Share

扫码访问的小红书活动分享页。页面会为每次访问生成一条不同的 AI 分享文案，用户点击按钮后复制文案并跳转到小红书链接。

## 配置

编辑 `activity.config.json`：

- `activityName`：页面标题和活动名称。
- `heroImage`：活动图片路径，正式图片可放到 `assets/`。
- `redbookUrl`：点击后跳转的小红书 URL。
- `fallbackCopy`：AI 不可用时使用的兜底文案。
- `copyRules`：AI 文案的目标人群、风格、长度、必须包含内容和随机角度。

## MiniMax

服务端通过 MiniMax OpenAI-compatible 文本接口生成文案。部署时设置环境变量：

```bash
MINIMAX_API_KEY=你的 MiniMax API Key
```

可选：

```bash
MINIMAX_MODEL=MiniMax-M2.7-highspeed
```

默认模型是 `MiniMax-M2.7`，和 MiniMax OpenAI-compatible 示例保持一致。

## 本地运行

```bash
npm run dev
```

打开终端输出的本地地址。没有配置 `MINIMAX_API_KEY` 时，页面会使用 `fallbackCopy`，功能仍可测试。

## 部署到 EdgeOne Pages

1. 把项目推送到 GitHub/GitLab，或按 EdgeOne Pages 支持的方式导入代码仓库。
2. 在 EdgeOne Pages 创建项目，选择当前仓库。
3. 构建命令留空或填 `true`，输出目录填项目根目录 `.`。
4. 在项目环境变量中设置：

```bash
MINIMAX_API_KEY=你的 MiniMax API Key
```

可选设置：

```bash
MINIMAX_MODEL=MiniMax-M2.7
```

5. 部署完成后访问 EdgeOne Pages 提供的 HTTPS 域名，确认页面能加载并请求 `/api/generate-copy`。

EdgeOne Pages 会把 `cloud-functions/api/generate-copy.js` 映射为线上接口 `/api/generate-copy`。EdgeOne 函数通过 `context.env` 读取环境变量，所以 `MINIMAX_API_KEY` 必须配置在 EdgeOne Pages 项目的运行环境变量中，不能只放在本地 `.env`。

## 其他部署

Vercel：直接导入项目，设置 `MINIMAX_API_KEY` 环境变量。

Netlify：使用根目录发布，`netlify.toml` 已把 `/api/generate-copy` 转发到 Netlify Function，同样需要设置 `MINIMAX_API_KEY`。

移动端复制 API 需要 HTTPS，正式二维码请指向 HTTPS 公网地址。
