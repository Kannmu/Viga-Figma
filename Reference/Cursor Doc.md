# Cursor Agent

Agent 是 Cursor 的助手，能够独立完成复杂的编码任务、运行终端命令并编辑代码。可在侧边栏按 Cmd+ICtrl+I 打开。

了解更多[Agent 的工作原理](/learn/agents)，助你更快构建。

## Agent 的工作原理

一个 agent 由三个组件组成：

1. **Instructions（指令）**：用于引导 agent 行为的 system prompt（系统提示词）和 [rules](/docs/context/rules)
2. **Tools（工具）**：文件编辑、代码库搜索、终端执行等
3. **User messages（用户消息）**：你发出的 prompt（提示词）和后续补充，用于指挥具体工作

Cursor 的 agent 会为我们支持的每个模型编排这些组件，并针对每个前沿模型专门调整 instructions 和 tools。随着新模型的发布，你可以专注于构建软件，而由 Cursor 负责处理所有模型相关的优化工作。

## 工具

工具是构建 Agent 的基础模块。它们用于搜索你的代码库和网络以查找相关信息、编辑文件、运行终端命令等。

若想了解工具调用在底层是如何工作的，请参阅我们的[工具调用基础](/learn/tool-calling)。

Agent 在单个任务中可发起的工具调用次数没有上限。

**语义搜索**

在你的[已索引代码库](/docs/context/semantic-search)中执行语义搜索。按含义而不仅是精确匹配来查找代码。

**搜索文件和文件夹**

按名称搜索文件、读取目录结构，并在文件中查找精确关键词或模式。

**Web**

生成搜索语句并进行网页搜索。

**获取规则**

根据类型和描述检索特定[规则](/docs/context/rules)。

**读取文件**

智能读取文件内容。也支持图片文件（.png、.jpg、.gif、.webp、.svg），并将其包含在对话上下文中，供具备视觉能力的模型分析。

**编辑文件**

为文件提供编辑建议，并自动[应用](/docs/agent/apply)这些修改。

**运行 shell 命令**

执行终端命令并查看输出。默认情况下，Cursor 使用第一个可用的终端配置文件。

要设置首选终端配置文件：

1. 打开命令面板（Command Palette，`Cmd/Ctrl+Shift+P`）
2. 搜索 "Terminal: Select Default Profile"
3. 选择所需的配置文件

**browser浏览器**

控制浏览器进行截图、测试应用并验证界面变化。Agent 可以导航页面、与元素交互，并捕获当前状态供分析。详情参见[浏览器文档](/docs/agent/browser)。

**图像生成**

根据文本描述或参考图片生成图像。适用于创建 UI 草图、产品素材以及可视化架构图。生成的图像默认保存到项目的 `assets/` 文件夹中，并在对话中内联展示。

**message-question提问**

在任务过程中提出澄清性问题。在等待你回复时，Agent 会继续读取文件、进行编辑或运行命令。一旦收到你的回答，就会立即将其纳入任务上下文。

## 消息摘要

随着对话变长，Cursor 会自动为你生成摘要并管理上下文，以保持对话高效。了解如何使用上下文菜单，并理解文件是如何被压缩和精简以适配模型的上下文窗口。

### 使用 /summarize 命令

你可以在对话中使用 `/summarize` 命令手动触发内容总结。这个命令在对话变得过长时帮助你管理上下文，从而让你在不丢失重要信息的情况下继续高效工作。

初次使用 Cursor？了解更多关于[上下文](/learn/context)的信息。

## Checkpoints

Checkpoint 是 Agent 针对你的代码库所做更改的自动快照，让你在需要时可以撤销修改。你可以在之前的请求中通过 `Restore Checkpoint` 按钮恢复，或在鼠标悬停到某条消息上时点击 + 按钮来恢复。

Checkpoint 会本地存储，并且独立于 Git。仅将它们用于撤销 Agent 的更改——持久的版本管理请使用 Git。

## 导出与分享

通过上下文菜单 → “Export Chat” 将 Agent 对话导出为 Markdown 文件，或将其以只读链接的形式分享。被分享的对话允许接收者查看并 fork 该会话，在自己的 Cursor 中继续。

分享需要付费计划。常见的密钥等敏感信息会被自动隐藏，且在隐私模式下会禁用分享。

## 排队消息

在 Agent 处理当前任务时，将后续消息加入队列。你的指令会依次等待，并在就绪后自动执行。

### 使用队列

1. 当 Agent 正在工作时，输入你的下一条指令
2. 按 Enter 将其添加到队列
3. 消息会按顺序显示在当前任务下方
4. 按需拖动以重新排序队列中的消息
5. Agent 完成当前任务后会按顺序依次处理队列中的消息

### 键盘快捷键

当 Agent 正在执行任务时：

- 按 Enter 将消息排入队列（会等待 Agent 完成当前任务后再发送）
- 按 Cmd+EnterCtrl+Enter 立即发送，跳过队列

### 即时发送消息

当你使用 Cmd+EnterCtrl+Enter 即时发送时，你的消息会附加到当前对话中最近的一条用户消息后面，并立即处理，而无需在队列中等待。

- 你的消息会附加在工具执行结果后并立即发送
- 有助于在紧急跟进时获得更快速的响应
- 当你需要中断或重定向 Agent 当前任务时使用此方式

# 模式

Agent 提供针对特定任务优化的不同模式。每种模式都启用了不同的能力和工具，以匹配你的工作流程需求。

了解[Agent 的工作原理](/learn/agents)和[工具调用基础](/learn/tool-calling)将帮助你为当前任务选择合适的模式。

模式适用场景能力工具**[Agent](#agent)**复杂功能、重构自主探索、多文件编辑启用全部工具**[Ask](#ask)**学习、规划、提问只读探索，无自动修改仅启用搜索工具**[Plan](#plan)**需要规划的复杂功能在执行前创建详细计划，并提出澄清性问题启用全部工具**[Debug](#debug)**棘手 Bug、回归问题生成假设、日志埋点、运行时分析全部工具 + 调试服务器
## Agent

适用于复杂编码任务的默认模式。Agent 会自主探索你的代码库、编辑多个文件、运行命令并修复错误，以完成你的请求。

## Ask

用于学习和探索的只读模式。Ask 会搜索你的代码库并提供答案，且不会对代码做出任何更改——非常适合在修改代码前先理解代码。

## Plan

Plan 模式会在编写任何代码之前先创建详细的实现计划。Agent 会分析你的代码库、提出澄清性问题，并生成一个可在构建前编辑的审阅用计划。

在聊天输入框中按 Shift+Tab 以切换到 Plan 模式。当你输入表明任务较为复杂的关键词时，Cursor 也会自动建议切换到该模式。

### 工作原理

1. Agent 会先提出一些澄清性问题，以了解你的需求
2. 分析你的代码库以获取相关上下文
3. 创建一份完整的实现计划
4. 你可以通过聊天或 Markdown 文件审阅并编辑该计划
5. 准备就绪后，点击构建该计划

计划默认会保存在你的主目录中。点击 “Save to workspace” 将其移动到你的工作区，方便后续查阅、团队协作和编写文档。

### 何时使用 Plan 模式

Plan 模式最适合：

- 具有多种可行方案的复杂功能
- 涉及许多文件或多个系统的任务
- 需求不清晰、需要先探索再厘清范围的工作
- 你希望先审查整体方案的架构决策

对于一些简单、能很快完成的改动，或者你已经做过很多次的任务，直接使用 Agent 模式就可以了。

### 从计划重新开始

有时 Agent 生成的内容和你想要的不一致。与其通过后续提示一点点修补，不如回到计划本身。

先回滚这些更改，然后把计划写得更具体、更清晰，再重新运行。这样通常比在中途修 Agent 更快，而且结果也更干净。

对于较大的改动，多花一些时间制定一个精确、范围清晰的计划。最难的部分往往是先弄清楚应该做**什么**改动——这更适合由人来完成。给出合适的指令后，再把具体实现交给 Agent。

## 调试

调试模式可以帮助你查明问题根源，并修复那些难以复现或理解的棘手 Bug。智能体不会立刻开始写代码，而是先提出假设、插入日志语句，并利用运行时信息精确定位问题，然后再进行有针对性的修复。

### 何时使用 Debug 模式

Debug 模式最适合用于：

- **能复现但想不明白原因的 Bug**：你知道有问题，但单靠读代码看不出明显原因
- **竞态条件和时序问题**：依赖执行顺序或异步行为的问题
- **性能问题和内存泄漏**：需要运行时性能分析（profiling）才能搞清楚的问题
- **回归问题（以前能用现在坏了）**：当你需要追踪到底改了什么时

当标准 Agent 交互难以处理某个 Bug 时，Debug 模式提供了一种不同的思路——依赖运行时证据，而不是凭猜测去修复。

### 工作原理

1. **探索并提出假设**：Agent 会探索相关文件、构建上下文，并针对潜在根因生成多个假设。
2. **添加埋点**：Agent 会添加日志语句，将数据发送到运行在 Cursor 扩展中的本地调试服务器。
3. **复现 Bug**：Debug Mode 会让你复现 Bug 并提供具体步骤。这能让你始终参与其中，并确保 Agent 捕获到真实的运行时行为。
4. **分析日志**：复现完成后，Agent 会审查收集到的日志，根据运行时证据识别真正的根因。
5. **进行针对性修复**：Agent 会执行有针对性的修复，直接处理根因——通常只需要改动几行代码。
6. **验证并清理**：你可以重新执行复现步骤来验证修复。一旦确认，Agent 会移除所有埋点。

### 调试模式使用提示

- **提供详细上下文**：你对 bug 及其复现方式描述得越详细，Agent 的监控和埋点效果就会越好。请包含错误信息、堆栈跟踪和具体步骤。
- **严格按照复现步骤执行**：执行 Agent 提供的步骤，确保日志能捕获到实际问题。
- **必要时多次复现**：多次复现 bug 可以帮助 Agent 识别比较棘手的问题，比如竞态条件。
- **明确期望行为与实际行为**：帮助 Agent 理解应该发生什么，以及现在实际发生了什么。

## 自定义斜杠命令

对于特定的工作流，你可以创建[自定义斜杠命令](/docs/agent/chat/commands)，将特定指令与工具使用限制组合起来。

### 示例

**学习**

创建一个 `/learn` 命令，重点在于详细解释概念并提出澄清问题。若要将 agent 限制为只使用搜索类工具，可在命令提示词中加入如下说明：“仅使用搜索工具（read file、codebase search、grep），不要进行任何编辑或运行终端命令。”

**重构**

创建一个 `/refactor` 命令，指示 agent 在不增加新功能的前提下改进代码结构。可在提示词中包含：“专注于重构现有代码，改进结构、可读性和组织方式，而不添加新特性。”

**调试**

创建一个 `/debug` 命令，指示 agent 在提出修复方案前要彻底排查问题。可在提示词中包含：“先使用搜索工具和终端命令调查问题，只有在彻底理解根本原因后再提出修复方案。”

有关如何创建自定义斜杠命令的详细信息，请参见[命令文档](/docs/agent/chat/commands)。

## 切换模式

- 在 Agent 中使用模式选择器下拉菜单
- 按下 Cmd+.Ctrl+. 进行快速切换
- 在 [设置](#settings) 中设置键盘快捷键

## 设置

所有模式都有以下通用设置：

SettingDescriptionModel选择要使用的 AI 模型Keyboard shortcuts设置在模式之间切换的快捷键
各模式特有设置：

ModeSettingsDescription**Agent**Auto-run and Auto-fix Errors自动运行命令并自动修复错误**Ask**Search Codebase自动查找相关文件

# 审阅

当 Agent 生成代码更改时，这些更改会显示在一个审阅界面中，通过不同颜色标记的行来展示新增和删除内容。这样你可以检查并控制哪些更改会应用到你的代码库中。

审阅界面以常见的 diff 格式展示代码更改：

## 差异

类型含义示例**Added lines**新增代码`+ const newVariable = 'hello';`**Deleted lines**删除代码`- const oldVariable = 'goodbye';`**Context lines**未更改的周围代码` function example() `
## Agent Review

Agent Review 会以专用模式运行 Cursor Agent，专注于发现你 diff 中的缺陷。该工具会逐行分析提议的变更，并在你合并前标记潜在问题。

> 
> **想在 PR 上自动完成代码审查吗？**
> 
> 试试 [Bugbot](/docs/bugbot)，它会在每个 pull request 上自动执行高级分析，及早发现问题并给出改进建议。
> 
> 
> 

使用 Agent Review 有两种方式：在 agent diff 中使用，或在 Source Control 选项卡中使用。

### Agent 差异

查看 agent 差异的结果：在收到响应后，点击 **Review**，然后点击 **Find Issues**，以分析建议的修改并生成后续建议。

### 源代码管理

审查所有相对于主分支的更改：打开 Source Control 选项卡并运行 Agent Review，以检查本地更改与主分支之间的所有差异。

### 计费

运行 Agent Review 会触发一次 Agent 运行，并按使用量计费。

### 设置

你可以在 Cursor 的设置中配置 Agent Review。

设置描述**Auto-run on commit**在每次提交后自动扫描代码中的错误**Include submodules**在审查中包含来自 Git 子模块的更改**Include untracked files**在审查中包含未跟踪的文件（尚未添加到 Git）
## 审查界面

生成完成后，你会看到提示，要求你在继续之前先审查所有更改。这样可以让你总览即将被修改的内容。

### 逐个文件

屏幕底部会出现一个浮动审阅栏，你可以：

- **接受**或**拒绝**当前文件的更改
- 跳转到仍有未处理更改的**下一个文件**
Your browser does not support the video tag.

### 选择性接受

若需更细粒度的控制：

- 若要接受大部分更改：先拒绝不需要的行，然后点击 **全部接受**
- 若要拒绝大部分更改：先接受需要的行，然后点击 **全部拒绝**

# 语义搜索

语义搜索通过理解代码的含义来查找代码，而不仅仅是进行文本匹配。你可以使用自然语言提问，比如“认证是在哪里处理的？”，并在整个代码库中获得相关结果。

## 工作原理

Cursor 会通过 7 个步骤将你的代码转换为可搜索的向量：

1. 你的工作区文件会安全地同步到 Cursor 的服务器，以确保索引始终是最新的。
2. 文件会被拆分成有意义的代码块，尽量按函数、类和逻辑代码块来划分，而不是随意的文本片段。
3. 每个代码块都会通过 AI 模型转换为向量表示。这会生成一个数学层面的“指纹”，用来捕捉代码的语义含义。
4. 这些嵌入向量会存储在专门的向量数据库中，该数据库针对在数百万代码块中进行快速相似度搜索进行了优化。
5. 当你搜索时，你的查询会通过处理代码时使用的同一套 AI 模型转换为向量。
6. 系统会将你的查询向量与已存储的嵌入向量进行比较，找到最相似的代码块。
7. 你会得到带有文件位置和上下文的相关代码片段，并按与搜索请求的语义相似度排序显示。

          .mermaid-diagram svg .node rect,
          .mermaid-diagram svg .node circle,
          .mermaid-diagram svg .node ellipse,
          .mermaid-diagram svg .node polygon,
          .mermaid-diagram svg .node path {
            stroke: var(--border) !important;
            fill: var(--secondary) !important;
          }
          .mermaid-diagram svg .label text,
          .mermaid-diagram svg span {
            fill: var(--foreground) !important;
            color: var(--foreground) !important;
          }
          .mermaid-diagram svg .edgePath .path,
          .mermaid-diagram svg .flowchart-link {
            stroke: var(--border) !important;
          }
          .mermaid-diagram svg .arrowheadPath {
            fill: var(--border) !important;
          }
          .mermaid-diagram svg .marker {
            fill: var(--border) !important;
            stroke: var(--border) !important;
          }
        
## 为什么使用语义搜索？

虽然像 `grep` 和 `ripgrep` 这样的工具在查找精确字符串匹配时很有用，但语义搜索更进一步，可以理解你的代码背后的含义。

如果你让 Agent 去“更新顶部导航栏”，语义搜索也能找到 `header.tsx`，即使文件名里并没有出现“导航”这个词。这是因为 embeddings 能理解“header”和“top navigation”在语义上的相关性。

### 相比仅使用 grep 的优势

语义搜索带来以下几项优势：

- **更快的结果**：计算发生在索引阶段（离线）而不是运行时，因此 Agent 的搜索更快且成本更低
- **更高的准确性**：经过定制训练的模型比字符串匹配能检索到更相关的结果
- **更少的后续交互**：相比仅使用 grep 的搜索，用户需要发送的澄清消息更少，消耗的 token 也更少
- **概念级匹配**：按“代码在做什么”来查找，而不仅仅是按名称查找

Agent 会**同时**使用 grep 和语义搜索。grep 擅长查找精确模式，而语义搜索擅长查找在概念上相似的代码。这种组合能够提供最佳结果。

## 快速开始

### 初次建立索引

当你首次打开工作区时，会自动开始建立索引。系统会扫描你的工作区结构、安全上传文件，并通过 AI 模型处理这些文件以生成向量嵌入。**当进度达到 80% 时，就可以使用语义搜索。**

## 保持索引最新

### 自动同步

Cursor 会通过每隔 5 分钟的定期检查，自动保持你的索引与工作区同步。系统会智能地只更新发生变更的文件，按需移除旧的 embedding 并创建新的 embedding。文件将以批处理方式处理，以获得最佳性能，并尽可能减少对你的开发工作流的影响。

### 哪些内容会被索引

文件类型操作新文件自动加入索引修改过的文件删除旧向量并重新生成新向量已删除的文件会立即从索引中移除大型/复杂文件可能会被跳过以提高性能
### 性能与故障排查

**性能**：使用智能批处理与缓存，确保结果准确且最新。

**故障排查步骤**：

1. 检查网络连接
2. 核实工作区权限
3. 重启 Cursor
4. 如问题仍然存在，请联系支持团队

索引系统会在后台可靠运行，确保你的代码始终可以被搜索到。

## 隐私与安全

### 数据保护

代码隐私通过多层安全机制得到保护。文件路径在发送到我们的服务器之前会被加密，确保你的项目结构保持机密。实际代码内容从不会以明文形式存储在我们的服务器上，以维护你的知识产权机密性。代码仅在索引过程中暂时保存在内存中，随后即被丢弃，因此不会对源代码进行任何永久存储。

## 配置

除了[忽略文件](/docs/context/ignore-files)（如 `.gitignore`、`.cursorignore`）中的文件外，Cursor 会为所有文件建立索引。

点击 `Show Settings`：

- 为新仓库启用自动索引
- 配置要忽略的文件

[忽略体积较大的内容文件](/docs/context/ignore-files) 可以提升回答准确性。

### 查看已索引的文件

要查看已索引文件的路径：`Cursor Settings` > `Indexing & Docs` > `View included files`

这会打开一个 `.txt` 文件，列出所有已索引的文件。

## 常见问题

**我在哪里可以看到所有已索引的代码库？**

目前还没有全局列表。请在 Cursor 中逐个打开项目，并在 Codebase Indexing 设置中查看。

**如何删除所有已索引的代码库？**

在设置中删除你的 Cursor 帐号即可移除所有已索引的代码库。
否则，请在各项目的 Codebase Indexing 设置中分别删除单个代码库。

**已索引的代码库会保留多长时间？**

已索引的代码库在 6 周无活动后会被删除。重新打开项目会触发重新索引。

**我的源代码会存储在 Cursor 服务器上吗？**

不会。Cursor 在创建 embedding 时不会存储文件名或源代码。文件名会被混淆处理，代码片段会被加密。

当 Agent 搜索代码库时，Cursor 会从服务器检索这些 embedding 并解密相应的代码片段。

**我可以自定义路径加密吗？**

在工作区根目录创建 `.cursor/keys` 文件来自定义路径加密：

```
{
  "path_decryption_key": "your-custom-key-here"
}
```

**团队共享是如何工作的？**

索引可以在团队成员之间共享，从而更快地索引类似的代码库。会遵守文件访问权限设置，只共享可访问的内容。

**什么是智能索引复制？**

对于团队工作区，Cursor 可以通过从文件结构兼容的相似代码库中复制来加速索引。此过程会自动进行，并遵守隐私权限。

**Cursor 是否支持多根工作区？**

是的。Cursor 编辑器支持 [multi-root workspaces](https://code.visualstudio.com/docs/editor/workspaces#_multiroot-workspaces)，可以同时处理多个代码库：

- 所有代码库都会自动索引
- 每个代码库的上下文都可供 AI 使用
- `.cursor/rules` 在所有文件夹中生效
- 某些依赖单一 git 根的功能（如 worktrees）在多根工作区中会被禁用。

Cursor Cloud Agents 不支持多根工作区。

# 常用 Agent 工作流

这些是已验证的与 Cursor Agent 高效协作的工作流模式。每种工作流都利用了 Agent 自主搜索、编辑和执行命令的能力。

## 测试驱动开发

当代理拥有清晰的迭代目标时，表现最佳。测试正好能提供这一点——一个代理可以围绕其不断迭代并加以验证的目标。

### TDD 工作流

1. **让 Agent 编写测试**，基于预期的输入/输出对。要明确说明你在使用 TDD，这样它就会避免为尚不存在的功能创建模拟实现。
2. **让 Agent 运行测试并确认测试失败。** 明确说明在这个阶段不要编写实现代码。
3. **当你对测试满意时，提交这些测试。**
4. **让 Agent 编写能通过测试的代码**，并指示它不要修改测试。告诉它持续迭代，直到所有测试都通过。
5. **当你对改动满意时，提交实现代码。**

这个工作流尤其有效，因为 Agent 可以运行测试、查看失败情况并自动迭代。测试套件就变成了验收标准。

### 示例提示

```
Write tests for a function that validates email addresses. 
Expected behavior:
- "user@example.com" returns true
- "invalid-email" returns false  
- Empty string returns false

Use the testing patterns in `__tests__/`. Don't implement the function yet—I want the tests to fail first.
```

```
现在实现 validateEmail 函数以通过所有测试。
不要修改测试。持续迭代直至所有测试通过。
```

## 使用命令的 Git 工作流

命令可以帮助你自动化多步骤 git 工作流。将它们作为 Markdown 文件存放在 `.cursor/commands/` 中，并在 Agent 输入中通过 `/` 来触发。

### Pull Request 命令

创建 `.cursor/commands/pr/COMMAND.md` 文件：

```
为当前更改创建 Pull Request。

1. 使用 `git diff` 查看已暂存和未暂存的更改
2. 根据更改内容编写清晰的提交信息
3. 提交并推送到当前分支
4. 使用 `gh pr create` 创建包含标题和描述的 Pull Request
5. 完成后返回 PR URL
```

在 Agent 中输入 `/pr`，即可自动完成提交、推送并打开 PR。

### 修复问题命令

创建 `.cursor/commands/fix-issue/COMMAND.md`：

```
修复用户指定的 GitHub issue。

1. 使用 `gh issue view <number>` 获取 issue 详情
2. 在代码库中搜索相关代码
3. 按照现有模式实现修复
4. 如有必要，编写测试
5. 创建引用该 issue 的 PR
```

用法：`/fix-issue 123`

### 其他常用命令

命令作用`/review`运行代码规范检查工具（linter），检查常见问题，并总结需要关注的内容`/update-deps`检查过时依赖，并逐个更新，每次更新后运行测试`/docs`为最近的更改生成或更新文档
将这些命令提交到 Git 仓库，这样整个团队都能使用。每当你看到 Agent 在工作流中犯错时，就更新对应命令。

## 理解代码库

在上手新代码库时，把 Agent 当作一位熟悉情况的队友，向它提出你平时会问同事的那些问题：

### 示例问题

- 「这个项目里的日志机制是如何运作的？」
- 「我该如何添加一个新的 API 端点？」
- 「`CustomerOnboardingFlow` 处理了哪些边界/极端情况？」
- 「为什么我们在第 1738 行调用的是 `setUser()` 而不是 `createUser()`？」
- 「带我过一遍当用户提交登录表单时会发生什么」

Agent 会结合使用 grep 和语义搜索来探索代码库并找到答案。这是快速熟悉陌生代码的最高效方式之一。

### 逐步加深理解

先从宏观入手，再逐步缩小范围：

1. "给我讲一下这个代码库的整体概览"
2. "认证系统是如何工作的？"
3. "给我展示一下 token 刷新的具体流程"
4. "为什么这个函数要在这里检查 null？"

每个问题都建立在前一个问题的基础上，并且 Agent 会在整个对话中持续维护上下文。

## 架构图

在进行重大变更或编写文档时，可以让 Agent 生成架构图。

### 示例提示

```
创建一个 Mermaid 图表，展示我们身份验证系统的数据流，
包括 OAuth 提供商、会话管理和令牌刷新。
```

Agent 会分析代码库，并生成可用于文档的示意图。这些图非常适合用于：

- 在 PR 描述中解释复杂改动
- 为新团队成员编写文档
- 在代码评审前发现架构问题

## 长时间运行的 Agent 循环

使用 [hooks](/docs/agent/hooks)，你可以创建可长时间运行的 Agent，让其不断迭代，直到达成目标。

### 示例：运行直到测试通过

在 `.cursor/hooks.json` 中配置该 hook：

```
{
  "version": 1,
  "hooks": {
    "stop": [{ "command": "bun run .cursor/hooks/grind.ts" }]
  }
}
```

钩子脚本（`.cursor/hooks/grind.ts`）接收上下文信息，并返回一个用于继续循环的 `followup_message`：

```
import { readFileSync, existsSync } from "fs";

interface StopHookInput {
  conversation_id: string;
  status: "completed" | "aborted" | "error";
  loop_count: number;
}

const input: StopHookInput = await Bun.stdin.json();
const MAX_ITERATIONS = 5;

if (input.status !== "completed" || input.loop_count >= MAX_ITERATIONS) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

const scratchpad = existsSync(".cursor/scratchpad.md")
  ? readFileSync(".cursor/scratchpad.md", "utf-8")
  : "";

if (scratchpad.includes("DONE")) {
  console.log(JSON.stringify({}));
} else {
  console.log(JSON.stringify({
    followup_message: `[迭代 ${input.loop_count + 1}/${MAX_ITERATIONS}] 继续执行。完成后在 .cursor/scratchpad.md 中更新 DONE。`
  }));
}
```

这种模式适用于：

- 反复运行并修复，直到所有测试通过
- 不断迭代 UI，直到与设计稿完全匹配
- 任何结果可验证的目标导向任务

## 设计转代码

Agent 可直接处理图片：粘贴截图、拖入设计文件或提供图片路径。

### 工作流程

1. 将设计稿粘贴到 Agent 输入框中
2. 让 Agent 实现该组件
3. Agent 根据图像匹配布局、颜色和间距
4. 使用 [browser sidebar](/docs/agent/browser) 预览并迭代

对于更复杂的设计，你也可以使用 [Figma MCP 服务器](/docs/context/mcp/directory) 直接拉取设计数据。

### 可视化调试

将错误状态或异常 UI 截图，然后粘贴到 Agent 中。这样通常比用文字描述问题更快。

Agent 也可以控制浏览器来自行截图、测试应用并验证界面变化。详见 [Browser 文档](/docs/agent/browser)。

## 委派给云端 Agent

[Cloud agents](/docs/cloud-agent) 非常适合那些你本来会丢进待办列表里的任务：

- 在做其他事情时顺带发现的 bug 修复
- 最近代码变更的重构
- 为现有代码生成测试
- 更新文档

你可以从 [cursor.com/agents](https://cursor.com/agents)、Cursor 编辑器或手机上启动云端 Agent。它们在远程沙箱中运行，因此你可以放心合上笔记本电脑，稍后再查看结果。

你可以在 Slack 中通过“@Cursor”触发 Agent。参见 [Slack 集成](/docs/integrations/slack) 了解设置方法。

