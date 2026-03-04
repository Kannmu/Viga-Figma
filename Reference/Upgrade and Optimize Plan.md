# Viga-Figma 深度分析与重构建议报告

## 1. 核心架构与工程化问题

目前 Viga 采用原生的 `code.js` (Main Thread) 和 `ui.html` (UI Thread) 文件结构，手动处理消息传递和构建流程。

### 问题识别

1. **手动 RPC (消息通信) 脆弱且冗余**：
    * 目前的 `onUiMessage` / `postMessage` 模式（在 `code.js` 和 `ui.html` 中大量 switch-case）是典型的样板代码，难以维护类型安全，且容易导致 "回调地狱"。
    * **证据**：`code.js` 中的 `handleRpc` 和 `ui.html` 中的 `rpc` 函数占据了大量篇幅。
2. **缺乏现代化构建系统**：
    * 项目依赖 TypeScript 编译 (`tsc`)，但似乎缺乏强大的打包器（如 Esbuild/Webpack）来支持引入 NPM 包。这限制了你使用高质量开源库的能力。
3. **单文件巨石架构**：
    * `code.js` 包含所有逻辑（设置、选择、DSL解析、节点操作），违反了单一职责原则。

### ✅ 最优修改方案

使用 **`create-figma-plugin`** 框架重构项目。

* **理由**：它是目前 Figma 插件开发的工业标准。它内置了基于类型安全的 RPC 机制，自动处理 `ui` 和 `main` 线程的通信，并集成了 Esbuild，允许你直接 `import` 任何 NPM 包。
* **收益**：你可以删除 `handleRpc`, `postMessage` 等 80% 的样板代码，直接像调用本地函数一样调用后端逻辑。

---

## 2. AI Agent 核心逻辑 (LLM & Tool Calling)

目前 Viga 手动实现了大模型调用流和工具调用解析。

### 问题识别

1. **重复制造 Agent 循环**：
    * 目前的逻辑是线性的（Prompt -> LLM -> Tool -> Result）。真正的 Agent（如 Claude Code）需要一个自动的 **多步循环 (Thinking -> Tool -> Observation -> Thinking)**。手动在 `ui.html` 中维护这个 `while` 循环非常复杂且容易出错。
    * **证据**：`ui.html` 中的 `runAgentLoop` 函数手动处理了流式传输、工具解析和消息追加，这在现代 AI 开发中是不必要的。
2. **脆弱的工具解析**：
    * 代码中手动解析 `tool_calls` JSON (`JSON.parse(call.function.arguments)`)。大模型经常输出不完整的 JSON 或错误的格式，手动处理很难覆盖所有边缘情况（如 streaming 中的 JSON 拼接）。
3. **手动拼接 Prompt**：
    * `buildDeveloperPrompt` 函数手动拼接了系统提示词和上下文，这种硬编码方式不灵活，难以进行 Prompt Engineering 优化。

### ✅ 最优修改方案

引入 **Vercel AI SDK (`ai` npm package)**。

* **架构变更**：
  * 在 **UI 线程** (React) 中使用 `useChat` hook。它内置了与 OpenAI 兼容接口（ZenMux）的流式对话管理。
  * 使用 `ai` SDK 的 **`maxSteps`** 参数。你只需要定义 Tools，SDK 会自动处理 "LLM请求 -> 工具调用 -> 执行工具 -> 结果回传 -> LLM再次思考" 的完整循环。
  * 使用 **`zod`** 定义工具参数 Schema。AI SDK 会自动利用 Zod 进行类型验证，确保 LLM 输出的参数符合预期，无需手动 `JSON.parse`。
* **代码删减**：`callChatStream`、`runAgentLoop`、`toModelMessage` 等大量底层代码可被移除。

---

## 3. DSL 设计与解析 (VF-DSL)

Viga 发明了一套自定义 XML 风格的 `VF-DSL` 来描述 UI。

### 问题识别

1. **高昂的维护成本**：
    * 编写并维护一个 XML 解析器 (`parseVfDsl`, `nodeToVfDsl`) 极其困难。Figma 的属性非常复杂（AutoLayout, Constraints, Fills），自定义 DSL 很容易遗漏属性或解析出错。
    * **证据**：`code.js` 中大量的 `parseVfDsl`, `splitTopLevel`, `nodeToVfDsl` 逻辑。
2. **LLM 的训练偏差**：
    * 大模型（GPT-4o, Claude 3.5）并没有针对你的 `VF-DSL` 进行过训练。它们最熟悉的是 **HTML/Tailwind** 或 **React/JSX**。强迫模型学习一种新 DSL 会降低其表现，增加 Hallucination（幻觉）。
3. **单向转换损耗**：
    * 从 Figma Node -> DSL -> Figma Node 的过程中，大量细节（如 Effect 阴影细节、字体特性）会因为 DSL 覆盖不全而丢失。

### ✅ 最优修改方案

**弃用 VF-DSL，转向基于 JSX 或精简 JSON 的方案。**

* **方案 A (推荐 - 利用现有生态)**：利用 Figma Widget API 的思路，或使用 **`html-to-figma`** (Builder.io 开源) 的逻辑。让 LLM 生成带有 Tailwind 类的 HTML 代码，然后使用开源库将其转换为 Figma 节点。这利用了 LLM 最强的 Web 编码能力。

---

## 4. 上下文感知与“视力” (RAG & Vision)

目前的上下文获取方式是 `get_current_selection`，它将选中节点的 DSL 塞入 Prompt。

### 问题识别

1. **Token 爆炸风险**：
    * 如果用户选中了一个复杂的 Frame，转换后的 DSL 可能轻易超过 LLM 的上下文窗口。
2. **缺乏全局感知**：
    * 如 Claude Code 文档所述，Agent 需要感知文件结构。目前 Viga 只能看到选中的部分，无法回答“参考 Home 页面的风格”这类问题。
3. **缺乏视觉反馈**：
    * 虽然代码中有 `get_visual_snapshot`，但并没有被深度集成到 Agent 的决策流中。Cursor 和 Claude Code 强调 **Multimodal (多模态)** 交互。

### ✅ 最优修改方案

1. **实施“渐进式上下文”策略 (参考 Cursor)**：
    * 不要一次性 dump 所有属性。为 Agent 提供一个 `inspect_node_summary` 工具，只返回节点层级树（ID, Name, Type），不包含具体样式。
    * 当 Agent 决定需要修改某个节点时，再调用 `get_node_details(id)` 获取详细属性。
2. **增强视觉能力**：
    * 在 Agent 修改设计后，**自动** 调用 `get_visual_snapshot` 并将新截图传回给 Vision Model (如 GPT-4o) 进行 **Visual Regression Check (视觉回归测试)**。让 AI 自己判断：“我生成的按钮是否居中了？”。

---

## 5. UI/UX 设计

目前的 UI 是原生 HTML/CSS 实现的。

### 问题识别

1. **开发效率低**：手动操作 DOM (`document.createElement`) 来渲染聊天气泡和 Thinking 面板是非常原始的做法。
2. **状态难以同步**：当 Agent 正在思考、执行工具或等待用户确认时，UI 状态管理变得非常复杂（`state` 对象在 `ui.html` 中很庞大）。

### ✅ 最优修改方案

**React + Tailwind CSS + Radix UI (shadcn/ui)**。

* 这不仅是为了美观，更是为了**状态驱动 UI**。
* 利用 Vercel AI SDK 的 `useChat` 返回的 `messages` 数组，直接 map 渲染聊天记录。
* 使用 `shadcn/ui` 的 Accordion 组件来折叠/展开 "Thinking" 过程，模仿 Claude Code 的体验。
* 使用 Markdown 渲染库 (`react-markdown`) 替代正则替换，支持更丰富的代码块高亮。

---

## 6. 具体重构路线图 (Action Plan)

基于以上分析，建议按照以下步骤重构：

### 第一阶段：基础设施 (Infrastructure)

1. 初始化 **`create-figma-plugin`** 项目，配置 React + Tailwind 模板。
2. 安装 **`ai` (Vercel AI SDK)**, **`zod`**, **`lucide-react`**。
3. 配置 `manifest.json` 确保 `networkAccess` 允许连接 ZenMux/OpenAI。

### 第二阶段：Agent 核心 (The Brain)

1. 在 UI 线程（React 组件中）重写聊天逻辑。使用 `useChat` hook。
2. 定义 `tools` 集合。使用 `zod` 定义每个工具的参数结构（如 `CreateRectSchema`, `UpdateTextSchema`）。
3. 配置 `maxSteps: 10`，启用多轮自动推理。

### 第三阶段：Figma 互操作层 (The Hands)

1. 废弃 `VF-DSL` 解析器。
2. 编写“原子化”的 Figma 操作函数（Main Thread）：
    * `createNodes(json)`: 接收简化版 JSON 结构创建节点。
    * `updateProperties(id, props)`: 原子化更新属性。
    * `scanSelection()`: 返回轻量级节点树摘要。
3. 使用 `create-figma-plugin` 的 `on` / `emit` 或 RPC 处理器连接 UI 线程的 Tool Calls 和 Main 线程的操作函数。

### 第四阶段：增强体验 (The Experience)

1. 实现 **Human-in-the-loop**：当 Tool 是 `delete_nodes` 或大规模修改时，在 UI 层拦截，显示 Diff 预览（参考 Claude Code 的权限控制），用户点击 "Approve" 后再将结果传回 `ai` SDK 继续执行。
2. 添加 **Prompt Caching**： ZenMux等 Provider 支持，缓存系统 Prompt 和选中的上下文，降低成本消耗。

---

通过这种重构，Viga 将从一个“手动拼接的脚本”进化为一个“现代化的 AI Agent 平台”，代码量可能减少 50% 以上，但能力和稳定性将大幅提升。
