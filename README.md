# 灵珠 Agent Bridge (Lingzhu Agent Bridge)

Lingzhu Agent Bridge 是一个用于连接灵珠（Lingzhu）平台与其他 Agent 协议的中间件服务。它允许开发者通过可视化的方式配置协议转换规则，将灵珠的标准协议转换为目标 Agent（如 AutoGLM 或自定义 HTTP 接口）所需的格式，实现无缝对接。


![Lingzhu Agent Bridge WebUI](./docs/ScreenShot.png)


## ✨ 核心功能

- **协议转换引擎**：支持灵珠协议与外部协议的双向转换。
- **可视化绑定配置**：提供友好的 UI 界面，管理 Agent 的绑定关系。
- **多种协议支持**：
  - **AutoGLM**: 原生支持 AutoGLM WebSocket 协议。
  - **自定义协议 (Custom HTTP)**: 支持通过 JSON 模板引擎，灵活定义任意 HTTP 接口的请求和响应映射。
- **沙箱调试环境 (Sandbox)**：内置交互式沙箱，支持实时调试绑定配置，查看转换前后的请求/响应数据流。
- **流式响应支持 (Streaming)**：全链路支持 Server-Sent Events (SSE) 流式输出，提供打字机体验。

## 🚀 快速开始

### 1. 环境准备

确保您的本地环境已安装：
- [Node.js](https://nodejs.org/) (v18 或更高版本)
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
# 或者
yarn install
```

### 3. 启动开发服务器

```bash
npm run dev
```

启动后，访问 [http://localhost:3000](http://localhost:3000) 即可进入控制台。

## 📖 使用指南

### 1. 创建绑定 (Binding)

在控制台主页点击 "新建绑定"，配置 Agent 的基本信息：
- **OpenAI Compatible**: Connect to any OpenAI-compatible API (e.g. local LLMs, other hosted services).
- **Custom Protocol**: Generic HTTP/JSON integration for any agent API.
- **Target URL**: 目标服务的接口地址。
- **Auth Key**: (可选) 鉴权密钥 (Bearer Token)。

### 2. 配置自定义协议 (Custom Protocol)

如果您选择了 **Custom (HTTP)** 协议，可以通过 JSON 模板定义映射规则。系统使用 `{{path}}` 语法引用灵珠请求中的数据。

#### 请求模版 (Request Template)

将灵珠的请求转换为目标 API 的格式。

**可用变量**:
- `{{message.0.text}}`: 用户发送的最新消息文本/指令。
- `{{message}}`: 完整的消息历史数组。
- `{{stream}}`: 流式标识 (true/false)。
- `{{model}}`: 模型名称。

**示例**:
```json
{
  "model": "my-custom-model",
  "messages": [
    {
      "role": "user",
      "content": "{{message.0.text}}"
    }
  ],
  "stream": true
}
```

#### 响应模版 (Response Template)

将目标 API 的响应转换为灵珠的标准格式。

**目标字段**:
- `answer`: (必填) Agent 回复的文本内容。
- `is_finish`: (可选) 标识对话是否结束。

**示例**:
```json
{
  "answer": "{{choices.0.delta.content}}",
  "is_finish": "{{choices.0.finish_reason}}"
}
```

### 3. 沙箱调试 (Sandbox)

点击绑定卡片上的 "Debug" 按钮进入沙箱：
- **Trace Log**: 查看完整的请求处理耗时和日志。
- **Raw Response**: 查看目标接口返回的原始数据块。
- **Transformed Preview**: 实时预览转换后的灵珠格式响应。

### 4. 调用 Bridge API

配置完成后，使用以下接口对接灵珠平台：

```http
POST /api/bridge/{agentId}
Content-Type: application/json

{
  "message_id": "msg_123",
  "message": [
    { "role": "user", "text": "你好" }
  ]
}
```

- `agentId`: 绑定记录的 ID。

## 🐳 Docker 部署

本服务支持使用 Docker 容器化部署。

### 构建镜像

```bash
docker build -t lingzhu-bridge .
```

### 运行容器

```bash
# 运行在 3000 端口
docker run -p 3000:3000 -v $(pwd)/bindings.json:/app/bindings.json lingzhu-bridge
```

> **注意**: 建议将 `bindings.json` 挂载到宿主机，以确保重启容器后绑定配置不丢失。

## 🛠️ 技术栈

- **框架**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI 组件**: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS
- **图标**: Lucide React
- **核心逻辑**: TypeScript

## 📄 许可证

MIT
