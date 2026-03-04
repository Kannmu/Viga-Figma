# Viga-Figma：AI Agent 驱动的智能化 Figma 插件项目设计

本文档详细描述了 Viga-Figma 插件的项目架构、UI/UX 设计、核心业务逻辑、自定义 DSL 以及大模型 Tool Calling 工具库的设计方案。本插件旨在打造一个类似 Cursor 或 Claude Code 的原生 Figma AI 设计助手。

---

## 1. 产品愿景与 UI/UX 设计

Viga-Figma 的目标是让设计师和开发者能够通过自然语言、图片参考和多轮对话，实现零门槛的 UI 生成、设计稿修改与视觉审查。

### 1.1 界面视觉风格

* **极简极客风**：整体采用类似 Cursor / Linear 的深色模式（同时适配 Figma 的亮/暗主题），强调代码与设计的融合感。
* **悬浮面板 (Floating Panel)**：UI 作为 Figma 画布上的悬浮侧边栏，支持拖拽调整大小，最小化时收起为一个灵动的 AI 悬浮球。
* **状态感知指示器**：顶部常驻当前上下文状态（如：`已选中 3 个图层` 或 `当前无选中项，处于全局模式`）。

### 1.2 核心交互模块

1. **全局配置抽屉 (Settings Drawer)**：
    * 提供大模型提供商（Provider）切换。
    * 提供自定义 `BaseURL` 和 `API Key` 输入框（以 ZenMux 标准 API 为默认模板）。
    * 可选模型下拉列表（支持视觉模型如 `gpt-4o`, `claude-3.5-sonnet` 或推理模型等）。
2. **多轮对话区 (Chat Stream)**：
    * 支持基础 Markdown 渲染（代码块、粗体等）。
    * 支持用户拖拽上传图片（用于 Image-to-Design）。
    * AI 思考过程展示（Reasoning / Thinking 折叠面板）。
    * **Tool Calling 状态展示**：当 AI 调用工具时，UI 实时显示 `[执行中] 正在读取图层...` 或 `[完成] 已生成 AutoLayout 框架`。
3. **人类确认机制 (Human-in-the-loop)**：
    * AI 提议修改现有设计时，UI 提供 `JSON 参数预览` 和 `Approve (应用)` / `Reject (拒绝)` 按钮，确保用户完全控制变更。

---

## 2. 系统架构设计

Figma 插件环境分为受到严格限制的 **Main Thread (Figma 沙盒)** 和负责渲染与网络的 **Iframe (UI 线程)**。

### 2.1 模块划分

* **UI Thread (React/Vue)**：负责展现聊天界面、管理用户状态、处理多轮对话逻辑、与 LLM 发起 HTTP 网络请求（Fetch API）。
* **Main Thread (Figma API)**：负责执行实际的画布操作（增删改查）、读取节点数据、导出图片。
* **通信总线 (Message Bridge)**：负责 UI 与 Main 之间的异步双向通信。例如：AI 在 UI 线程决定调用 `create_rect` 工具 -> 通过 Bridge 发送指令 -> Main 线程执行并返回新节点 ID -> UI 线程将结果反馈给 AI。

### 2.2 存储与安全

* **凭证安全**：`API Key` 和 `BaseURL` 存储于 `figma.clientStorage`（本地存储），绝不随文件共享，确保用户资产安全。
* **网络权限**：在 `manifest.json` 的 `networkAccess` 中配置 `["*"]`（因为允许用户自定义 BaseURL，必须开放全局网络权限）。

---

## 3. Viga-Figma 专用图形描述语言 (VF-DSL)

Figma 原生的 JSON AST（抽象语法树）极其庞大且嵌套极深，直接发给 LLM 会导致 Token 爆炸且严重影响指令遵循能力。因此需要设计一套**专门针对 LLM 优化的类 JSX 标记语言 (VF-DSL)**。

### 3.1 VF-DSL 设计原则

* **语义化**：使用类似 HTML/React 的标签（LLM 对此最熟悉）。
* **极简样式**：合并冗余属性（例如把 padding, gap 融合成类似 Tailwind 的简写）。
* **强调 Auto Layout**：Figma 设计的核心是 Auto Layout，DSL 必须能完美表达弹性布局。

### 3.2 VF-DSL 语法示例

```xml
<!-- 这是一个带有文字和按钮的卡片组件 -->
<Frame id="n_101" name="UserCard" layout="vertical" gap="16" padding="24" fill="#FFFFFF" radius="8">
  <Frame id="n_102" layout="horizontal" gap="12" align="center">
    <Ellipse id="n_103" name="Avatar" size="48x48" image="url_or_hash" />
    <Text id="n_104" name="UserName" fontSize="16" weight="bold" color="#111111">John Doe</Text>
  </Frame>
  <Text id="n_105" name="Bio" fontSize="14" color="#666666" maxLines="2">
    AI interaction designer and full-stack developer.
  </Text>
  <Button id="n_106" name="FollowBtn" layout="auto" fill="#0D99FF" radius="4" padding="8,16">
    <Text color="#FFFFFF" fontSize="14">Follow</Text>
  </Button>
</Frame>
```

### 3.3 DSL 解析器 (Parser & Compiler)

* **Figma to DSL**：将用户选中的 Figma 节点提炼、降维，转换为上述 XML 字符串，作为 Context 发送给大模型。
* **DSL to Figma**：解析大模型输出的 XML 字符串，映射调用 Figma API (`figma.createFrame`, `figma.createText` 等) 递归生成画布节点。

---

## 4. AI Agent 工具库 (Tool Calling Library)

为了让 AI 拥有“手”和“眼”，我们需要在发送给 LLM（如 ZenMux 接口）的 Payload 中注册以下 Tools。大模型会根据用户意图自主决策调用哪个工具。

### 4.1 获取上下文工具 (Read Tools)

* **`get_current_selection`**
  * *描述*：获取用户当前选中的图层。
  * *返回*：选中图层的 VF-DSL 结构以及所在页面的基础信息。
* **`inspect_node_tree`**
  * *描述*：给定一个节点 ID，深度读取其内部的所有子节点结构。
  * *参数*：`node_id` (string), `depth` (integer)
* **`get_visual_snapshot` (Vision 专用)**
  * *描述*：将指定的 Figma 节点导出为图片，通过多模态大模型上传图片文件的方式，来让模型可以直观的获取对象的视觉信息。
  * *参数*：`node_id` (string)

### 4.2 画布操作工具 (Write & Modify Tools)

* **`generate_design_from_dsl`**
  * *描述*：根据 AI 生成的 VF-DSL，在画布上（或选定的父节点内）直接渲染生成 UI 元素。
  * *参数*：`dsl_string` (string), `parent_id` (string, optional)
* **`update_node_properties`**
  * *描述*：精确修改现有图层的属性（不改变整体结构），如修改颜色、文案、字号、Auto Layout 间距等。
  * *参数*：`node_id` (string), `properties` (json object，包含 fill, text_content, gap, padding 等)
* **`delete_nodes`**
  * *描述*：删除画布上不需要的节点。
  * *参数*：`node_ids` (array of strings)

### 4.3 辅助与交互工具 (Utility Tools)

* **`ask_user_for_clarification`**
  * *描述*：当 AI 遇到模糊指令（例如：“帮我把这里的风格改一下”）时，主动调用此工具在 UI 弹出一个提示框，要求用户具体说明（如指定哪种风格或提供参考图）。
* **`focus_and_zoom_to_node`**
  * *描述*：将用户的 Figma 视口 (Viewport) 平滑移动并缩放到指定的节点，用于 AI 向用户展示其刚刚修改的部分。
  * *参数*：`node_id` (string)

---

## 5. 多轮 Agent 核心工作流设计

Viga-Figma 的核心体验在于 Agent 的自主运行。以下是三个典型场景的设计逻辑：

### 场景一：从零生成设计稿 (Text/Image to Design)

1. **用户输入**：“帮我设计一个深色模式的现代风登录表单”，或直接拖入一张竞品截图。
2. **Agent 思考**：分析需求，如果是图片则调用视觉模型理解布局。
3. **调用工具**：Agent 自主编写一段 `VF-DSL` 字符串，并调用 `generate_design_from_dsl`。
4. **渲染反馈**：插件解析 DSL，在画布生成矩形、输入框、文本等，并组装成 Auto Layout。
5. **结束回合**：Agent 调用 `focus_and_zoom_to_node` 将镜头移至新生成的 UI，并在聊天框回复：“已为您生成登录表单，需要调整主色调或间距吗？”

### 场景二：智能优化与修改现有设计

1. **用户选中**：用户在画布上选中一个粗糙的线框图。
2. **用户输入**：“把这个卡片变得更精美，符合 iOS 设计规范。”
3. **Agent 获取上下文**：自动调用 `get_current_selection`，获取到该线框图的 `VF-DSL`。
4. **Agent 诊断**：AI 分析 DSL 后发现 padding 不均匀、没有使用 AutoLayout、颜色没有对比度。
5. **调用工具**：Agent 调用 `update_node_properties` 或重写局部 DSL 进行替换。
6. **人类确认**：UI 拦截操作，展示待执行的工具调用及参数，并询问用户是否批准。用户点击 Approve。
7. **生效**：调用 `figma.commitUndo()` 创建历史记录，然后应用修改。

### 场景三：设计审查 (Design Review / QA)

1. **用户输入**：“帮我检查一下当前页面的无障碍设计和排版问题。”
2. **Agent 动作**：调用 `get_visual_snapshot` 获取页面截图。
3. **视觉大模型分析**：识别出某些按钮文字对比度不足，某些模块没有对齐。
4. **输出报告**：在聊天区输出 Markdown 格式的审查报告。
5. **提供修复按钮**：在报告末尾，Agent 附带一键修复动作（内部预置了 `update_node_properties` 的参数），用户点击即可自动修复对比度问题。

---

## 6. 配置与扩展性设计

* **完全解耦的 API 层**：由于兼容 ZenMux 标准，网络请求层设计为通用的 OpenAI 格式适配器。无论用户填入的是 OpenAI、Anthropic、还是国内的 DeepSeek、Qwen（通过 ZenMux 转发），只要支持标准的 Message 格式和 Tool Calling 协议，即可无缝接入。
* **System Prompt 热更新**：UI 设置中允许高级用户自定义 System Prompt（如指定：“你是一个 Material Design 专家，生成的间距必须是 8 的倍数”），赋予 Agent 不同的设计人设。

---

## 7. 运行时日志与调试 (Runtime Logs & Debugging)

为了便于开发者排查问题和优化 Prompt，插件内置了全链路的日志记录系统。

* **双线程日志合并**：自动收集并合并 Main Thread (Plugin API) 和 UI Thread (Browser API) 的所有关键事件。
* **结构化数据**：记录每一次 RPC 调用、LLM 请求/响应（包括 Token 消耗）、Tool Calling 执行结果以及错误堆栈。
* **一键导出**：UI 顶部提供 `Export Log` 按钮，可将当前会话的完整运行日志导出为 JSON 文件，包含环境信息、设置快照和带时间戳的事件流。
