# Table of Contents

- [Responses API (OpenAI Responses API) | ZenMux | Documentation](#responses-api-openai-responses-api-zenmux-documentation)

---

# Responses API (OpenAI Responses API) | ZenMux | Documentation

> Source: [https://zenmux.ai/docs/api/openai/openai-responses.html](https://zenmux.ai/docs/api/openai/openai-responses.html)

# Create a Model Response [​](#create-a-model-response)

```
POST https://zenmux.ai/api/v1/responses
```

The Create a Model Response endpoint is compatible with OpenAI’s [Create a Model Response](https://platform.openai.com/docs/api-reference/responses/create?lang=curl) endpoint. It is used to create a single model response (supports text/image/file inputs; text or structured JSON outputs; built-in tools and function calling, etc.).

Below is a list of all parameters that may be supported by different models. Parameter support varies by model; for the exact parameters supported by each model, see the model’s detail page.

## Request headers [​](#request-headers)

### Authorization `string` [​](#authorization-string-required)

Bearer token authentication.

### Content-Type `string` [​](#content-type-string-required)

Request content type. Default is `application/json`.

## Request body [​](#request-body)

### model `string` [​](#model-string-required)

The model ID for this inference call, in the format `<provider>/<model_name>`, e.g., openai/gpt-5. You can find it on each model’s detail page.

### input `string | array` [​](#input-string-array-optional)

The content passed to the model.

#### `string` [​](#string)

* Treated as plain-text input (equivalent to a single `user` text input).

#### `array` (Input item list) [​](#array-input-item-list)

Each element in the array is an **Item** (a context item). It can include messages, images, files, tool outputs, references, etc. Possible types include:

##### 1. Input message `object` [​](#_1-input-message-object)

* type `string` : fixed to `message`
* role `string` : `user` / `assistant` / `system` / `developer`
* content `string | array` : message content
  + If `string`: plain text
  + If `array`: a list of content parts (see Input content parts below)

Input content parts (possible input content part types)

1. Input text `object`

* type `string` : `input_text`
* text `string` : text content

2. Input image `object`

* type `string`: `input_image`
* detail `string`: `high` / `low` / `auto` : image processing detail level; affects token usage and recognition accuracy
* file\_id `string` : ID of an uploaded file
* image\_url `string` (URL or data URL/base64) : image URL or base64-encoded data

3. Input file `object`

* type `string`: `input_file`
* file\_data `string` : base64-encoded file data
* file\_id `string`: ID of an uploaded file
* file\_url `string`: file URL
* filename `string`: file name

##### 2. Item types overview [​](#_2-item-types-overview)

Input message `object`

* type `string` : fixed to `message`
* role `string` : `user` / `assistant` / `system` / `developer`
* status `string` : `in_progress` / `completed` / `incomplete` item status
* content `string | array` : message content
  + If `string`: plain text
  + If `array`: a list of content parts; each element can be `input_text` / `input_image` / `input_file` (same as above)
Output message (model output message) `object`

(Used when you “feed back the model’s previous output message item” into `input`.)

* type `string`: `message`
* role `string`: fixed to `assistant`
* id `string`: unique ID of the output message
* status `string`: `in_progress` / `completed` / `incomplete`
* content `array`: list of **Output content parts** (see below)

###### Output content parts (possible output content part types) [​](#output-content-parts-possible-output-content-part-types)

* type `string`: `output_text`
* text `string`: output text
* annotations `array`: annotations (see below)
* logprobs `array`: logprobs (see below)

**annotations** element types:

* File citation `object`
  + type `string`: `file_citation`
  + file\_id `string`: cited file ID
  + filename `string`: cited file name
  + index `integer`: starting index position in the text
* URL citation `object`
  + type `string`: `url_citation`
  + start\_index `integer`: starting index position of the citation in the text
  + end\_index `integer`: ending index position of the citation in the text
  + title `string`: cited page title
  + url `string`: cited page URL
* Container file citation `object`
  + type `string`: `container_file_citation`
  + container\_id `string`: container file ID
  + file\_id `string`: actual cited file ID
  + filename `string`: cited file name
  + start\_index `integer`: starting index position of the citation in the text
  + end\_index `integer`: ending index position of the citation in the text
* File path `object`
  + type `string`: `file_path`
  + file\_id `string`: file ID
  + index `integer`: index position in the list

**logprobs** (each element is logprob info for one token; field hierarchy below):

* bytes `array`: byte representation of the token
* logprob `number`: token log probability
* token `string`: token text
* top\_logprobs `array`: most likely candidate tokens (each element includes `bytes` / `logprob` / `token`)

2. Refusal `object`

* type `string`: `refusal`
* refusal `string`: explanation for why the model refused to answer
Function tool call `object`

The model initiates a call to a **function tool**.

* type `string`: `function_call`
* call\_id `string` : unique identifier for the function call
* name `string` : name of the function to call
* arguments `string` : function arguments as a JSON string
* id `string` : unique item ID
* status `string` : call status, `in_progress` / `completed` / `incomplete`
Function tool call output (function tool output) `object`

Send the result of executing the function back to the model (for the next step of reasoning).

* type `string`: `function_call_output`
* call\_id `string`: corresponding function call identifier
* output `string | array` : function execution result, either a string or a list of content parts
* id `string` : unique output item ID
* status `string` : output status, `in_progress` / `completed` / `incomplete`

> When `output` is an `array`, elements can be `input_text` / `input_image` / `input_file` (same as above).

Custom tool call `object`

The model initiates a call to a “custom tool” (you must execute it on your side).

* type `string`: `custom_tool_call`
* call\_id `string`: unique identifier for the custom tool call
* name `string`: name of the custom tool to call
* input `string`: input passed to the tool
* id `string` : unique item ID
Custom tool call output (custom tool output) `object`

Send the execution result of the custom tool back to the model.

* type `string`: `custom_tool_call_output`
* call\_id `string`: corresponding custom tool call identifier
* output `string | array`: tool result, either a string or a list of content parts
* id `string`: unique output item ID

> When `output` is an `array`, elements can be `input_text` / `input_image` / `input_file` (same as above).

Web search tool call `object`

* type `string`: `web_search_call`
* id `string`: unique ID for the web search tool call
* status `string`
* action `object`: describes what the web tool did in this call (search/open\_page/find)

###### Possible action types [​](#possible-action-types)

1. Search action `object`

* type `string`: action type, fixed to `search`
* query `string`: search query (deprecated)
* queries `array`: list of search queries
* sources `array`: list of sources
  + each source:
    - type `string`: `url`
    - url `string`: source URL

2. Open page action `object`

* type `string`: action type, fixed to `open_page`
* url `string`: page URL to open

3. Find action `object`

* type `string`: action type, fixed to `find`
* url `string`: page URL to search
* pattern `string`: search pattern or keyword
Computer tool call (Computer Use call) `object`

The model initiates a Computer Use action (you must execute it on your side). After execution, send results such as screenshots back via `computer_call_output`.

* type `string`: `computer_call`
* call\_id `string` : unique identifier for the computer use call
* action `object` : parameters for the specific computer action (see Action types below)
* pending\_safety\_checks `array` : list of safety checks pending user confirmation
  + id `string` : unique safety check identifier
  + code `string` : safety check code
  + message `string` : safety check message
* id `string` : unique item identifier
* status `string` : call status, `in_progress` (in progress) / `completed` (completed) / `incomplete` (incomplete)

###### Action types (possible `action` variants) [​](#action-types-possible-action-variants)

###### Click `object` [​](#click-object)

* type `string`: `click` : action type, fixed to `click`
* x `number` : click X coordinate (pixels)
* y `number` : click Y coordinate (pixels)
* button `string` : mouse button, `left` / `right` / `middle`

###### Double click `object` [​](#double-click-object)

* type `string`: `double_click` : action type, fixed to `double_click`
* x `integer` : double-click X coordinate (pixels)
* y `integer` : double-click Y coordinate (pixels)

###### Move `object` [​](#move-object)

* type `string`: `move` : action type, fixed to `move`
* x `integer` : target X coordinate (pixels)
* y `integer` : target Y coordinate (pixels)

###### Screenshot `object` [​](#screenshot-object)

* type `screenshot`：`screenshot` : action type, fixed to `screenshot`

###### Drag `object` [​](#drag-object)

* type `string`: `drag` : action type, fixed to `drag`
* path `array` : list of coordinates for the drag path
  + x `integer` : X coordinate (pixels)
  + y `integer` : Y coordinate (pixels)

###### Scroll `object` [​](#scroll-object)

* type `string`: `scroll` : action type, fixed to `scroll`
* x `integer` : scroll anchor X (pixels; provided by some implementations)
* y `integer` : scroll anchor Y (pixels)
* scroll\_x `integer` : horizontal scroll distance (pixels)
* scroll\_y `integer` : vertical scroll distance (pixels)

###### Type `object` [​](#type-object)

* type `string`: `type` : action type, fixed to `type`
* text `string` : text to type

###### Keypress `object` [​](#keypress-object)

* type `string`: `keypress` : action type, fixed to `keypress`
* keys `array` : key combo to press, e.g. `["CTRL","L"]` means Ctrl+L

###### Wait `object` [​](#wait-object)

* type `string`: `wait` : action type, fixed to `wait`
Computer tool call output (Computer Use output) `object`

* type `string`: `computer_call_output`
* call\_id `string`: corresponding computer use call identifier
* output `object`: output of the computer action (e.g., screenshots)
  + type `string`: `computer_screenshot`: output type, fixed to computer screenshot
  + file\_id `string`: screenshot file ID
  + image\_url `string`: screenshot URL
* acknowledged\_safety\_checks `array`: list of acknowledged safety checks
  + id `string`: acknowledged safety check identifier
  + code `string`: acknowledged safety check code
  + message `string`: acknowledged safety check message
* id `string`: unique output item identifier
* status `string`: output status, e.g. `completed` / `failed`
Local shell call (local shell call) `object`

* type `string`: `local_shell_call`
* id `string`: unique ID for the local shell call
* call\_id `string`: associated call ID
* status `string`: call status, e.g. `in_progress` / `completed` / `failed`
* action `object`: specific shell execution action
  + type `string`: `exec`
  + command `array`: command arguments (array form)
  + env `map`: environment variables for execution
  + timeout\_ms `integer`: timeout (ms)
  + user `string`: system user to run the command as
  + working\_directory `string`: working directory path
Local shell call output `object`

* type `string`: `local_shell_call_output`
* id `string`: unique ID for the output item
* output `string`: command result output as a JSON string
* status `string`: output status, e.g. `completed` / `failed`
Shell tool call `object`

* type `string`: `shell_call`
* call\_id `string`: unique identifier for the shell call
* id `string`: unique item ID
* status `string`: call status, `in_progress` / `completed` / `incomplete`
* action `object`: shell command execution config
  + commands `array`: list of shell commands to execute in order
  + max\_output\_length `integer`: maximum captured output length (stdout+stderr UTF-8)
  + timeout\_ms `integer`: timeout (ms)
Shell tool call output `object`

* type `string`: `shell_call_output`
* call\_id `string`: corresponding shell call identifier
* id `string`: unique output item identifier
* max\_output\_length `integer`: maximum output length limit
* output `array`: list of output chunks; each element includes:
  + stdout `string`: stdout content
  + stderr `string`: stderr content
  + outcome `object`: execution outcome (union type)
    - Timeout outcome `object`
      * type `string`: `timeout`: command timed out
    - Exit outcome `object`
      * type `string`: `exit`: command exited normally
      * exit\_code `integer`
Apply patch tool call (apply patch call) `object`

Used to create/delete/update files via a diff patch.

* type `string`: `apply_patch_call`
* call\_id `string`: unique identifier for the apply patch call
* id `string`: unique item identifier
* status `string`: call status, `in_progress` / `completed`
* operation `object`: specific file operation (union type: create/delete/update)

###### Possible operation types [​](#possible-operation-types)

1. Create file `object`

* type `string`: `create_file`
* path `string`: file path relative to the workspace root
* diff `string`: unified diff patch content

2. Delete file `object`

* type `string`: `delete_file`
* path `string`: file path to delete

3. Update file `object`

* type `string`: `update_file`
* path `string`: file path to update
* diff `string`: unified diff patch content
Apply patch tool call output `object`

* type `string`: `apply_patch_call_output`
* call\_id `string`: corresponding apply patch call identifier
* id `string`: unique output item identifier
* status `string`: output status, `completed` / `failed`
* output `string`: apply-patch logs or error description
MCP list tools `object`

* type `string`: `mcp_list_tools`
* id `string`: unique ID for the MCP list-tools call
* server\_label `string`: MCP server label
* error `string`: error message when fetching tools (if any)
* tools `array`: available tools; each element includes:
  + name `string`: tool name
  + description `string`: tool description
  + annotations `object`: additional tool annotations
  + input\_schema `object`: tool input JSON Schema
MCP approval request `object`

* type `string`: `mcp_approval_request`
* id `string`: unique ID for the approval request
* server\_label `string`: MCP server label
* name `string`: requested tool name to run
* arguments `string`: tool arguments as a JSON string
MCP approval response `object`

* type `string`: `mcp_approval_response`
* approval\_request\_id `string`: corresponding approval request ID
* approve `boolean`: whether to approve the tool call (true=approve, false=reject)
* id `string`: unique response item ID
* reason `string`: reason for approval or rejection
MCP tool call `object`

* type `string`: `mcp_call`
* id `string`: unique ID for the MCP tool call
* server\_label `string`: MCP server label
* name `string`: tool name to call
* arguments `string`: tool arguments as a JSON string
* approval\_request\_id `string`: associated approval request ID (for subsequent approval response)
* output `string`: tool output after execution
* error `string`: tool execution error message
* status `string`: call status, `in_progress` / `completed` / `incomplete` / `calling` / `failed`
Reasoning `object`

* type `string`: `reasoning`
* id `string`: unique ID for the reasoning content
* summary `array`: reasoning summary parts
  + Summary text `object`
    - type `string`: `summary_text`
    - text `string`: summary text
* content `array`: full reasoning text parts
  + Reasoning text `object`
    - type `string`: `reasoning_text`
    - text `string`: full reasoning text
* encrypted\_content `string`: encrypted full reasoning content (requires enabling via `include`)
* status `string`: reasoning status, `in_progress` / `completed` / `incomplete`
Compaction item `object`

Generated by `v1/responses/compact`. Used to compress long conversations into an opaque encrypted summary and can be fed back into later `input`.

* type `string`: `compaction`
* id `string`: compaction item ID
* encrypted\_content `string`: compressed summary (encrypted, opaque)

##### 3. Item reference `object` [​](#_3-item-reference-object)

Used to reference an existing item (internal identifier).

* type `string`: `item_reference`
* id `string`

### instructions `string` [​](#instructions-string-optional)

System/developer instructions inserted into the context. When used with `previous_response_id`, it will not inherit the previous round’s instructions, making it easier to replace the system prompt.

### previous\_response\_id `string` [​](#previous-response-id-string-optional)

ID of the previous Response for continuing multi-turn conversations; **cannot be used together with `conversation`**.

### conversation `string | object` (default `null`) [​](#conversation-string-object-optional-default-null)

Associates this response with a conversation. The conversation’s items will be prepended to this request’s input context, and after completion this request’s input/output will be automatically appended to the conversation.

* Conversation ID `string`: unique conversation ID used to identify and reuse conversation history
* Conversation object `object`
  + id `string`: unique conversation ID for persistence and retrieval

### prompt `object` [​](#prompt-object-optional)

Reference a prompt template and pass variables.

* id `string` : prompt template ID
* variables `object`: template variable key-value pairs for placeholder substitution
* version `string`: prompt template version

### include `array` [​](#include-array-optional)

Specifies additional output data to include in the response. Supported values include (string enum):

* `web_search_call.action.sources`: include source info for web search calls

* `computer_call_output.output.image_url`: include screenshot URL from Computer Use tool outputs

* `message.input_image.image_url`: include image URLs in input messages
* `message.output_text.logprobs`: include per-token log probabilities for output text
* `reasoning.encrypted_content`: include encrypted reasoning content

### max\_output\_tokens `integer` [​](#max-output-tokens-integer-optional)

Caps the maximum tokens the response can generate (includes visible output tokens and reasoning tokens).

### max\_tool\_calls `integer` [​](#max-tool-calls-integer-optional)

Caps the total number of **built-in tool** calls that can be processed within this response (accumulated across tools).

### parallel\_tool\_calls `boolean` (default `true`) [​](#parallel-tool-calls-boolean-optional-default-true)

Whether to allow parallel tool calls.

### reasoning `object` (reasoning models only) [​](#reasoning-object-optional-reasoning-models-only)

Reasoning model configuration.

* effort `string`  (default `medium`)  
   Controls reasoning intensity, affecting reasoning depth and compute time. Supported: `none` / `minimal` / `low` / `medium` / `high` / `xhigh`
* summary `string`   
   Reasoning summary level: `auto` / `concise` / `detailed`
* generate\_summary `string` (Deprecated)  
   Deprecated: use `summary` instead

### text `object` [​](#text-object-optional)

Text output configuration (including structured output formats).

* format `object` : output format (default `{ "type": "text" }`)  
   Possible types:

  1. Text `object`

     + type `string`: `text`: plain text output
  2. JSON schema `object` (Structured Outputs)

     + type `string`: `json_schema`: structured JSON output
     + name `string`: output format name identifier
     + schema `object`: JSON Schema defining the output structure
     + description `string` : description of the output format
     + strict `boolean`  (default `false`): whether to strictly enforce the schema; when true, validation is enforced
  3. JSON object `object` (legacy JSON mode)

     + type `string`: `json_object`: JSON object output
* verbosity `string`  (default `medium`)  
   Constrains response verbosity. Lower values produce more concise responses; higher values produce more detailed responses. Supported values: `low` / `medium` / `high`

### temperature `number` (default `1`) [​](#temperature-number-optional-default-1)

Sampling temperature, typically 0–2. Prefer tuning either this or `top_p`, not both.

### top\_p `number` (default `1`) [​](#top-p-number-optional-default-1)

Nucleus sampling parameter.

### top\_logprobs `integer` [​](#top-logprobs-integer-optional)

0–20. Number of most likely tokens to return at each position.

### truncation `string` (default `disabled`) [​](#truncation-string-optional-default-disabled)

Context truncation strategy for handling prompts that exceed the model’s context window:

* `auto`: when content exceeds the context window, automatically drop the earliest items from the start of the conversation to make room
* `disabled`: disables auto-truncation; requests that exceed the context window will fail (400)

### tools `array` [​](#tools-array-optional)

Declares the list of tools the model is allowed to call in this request. The model may choose to call these tools as needed to enhance its capabilities.

#### Possible `tools[i]` types [​](#possible-tools-i-types)

Below are the supported tool type definitions. Each tool type has specific configuration parameters:

Function tool (function tool definition) `object`

* type `string`: `function`: tool type, fixed to function tool
* name `string`: unique function name identifier
* parameters `object`: JSON Schema defining function parameters (structure + validation rules)
* strict `boolean` (default `true`): whether to strictly validate parameters against the schema
* description `string` : detailed function description to help the model decide when to use it
Web search (generally available) `object`

* type `string` : `web_search` or `web_search_2025_08_26`
* filters `object` : result filters
  + allowed\_domains `array[string]`  (default `[]`): allowed domain allowlist (subdomains allowed)
* search\_context\_size `string`  (default `medium`): search context size level
* user\_location `object` : approximate user location for localized results
  + type `string` : `approximate`
  + city `string`
  + country `string` : 2-letter ISO (e.g. `US`)
  + region `string`
  + timezone `string` : IANA TZ (e.g. `America/Los_Angeles`)
Web search preview `object`

* type `string`: `web_search_preview` or `web_search_preview_2025_03_11`
* search\_context\_size `string` : `low` / `medium` / `high`
* user\_location `object` : user location
  + type `string`: `approximate`
  + city `string`
  + country `string`  (2-letter ISO)
  + region `string`
  + timezone `string`  (IANA TZ)
Computer use preview (Computer Use tool) `object`

* type `string` : `computer_use_preview`
* display\_width `integer` : display width (pixels)
* display\_height `integer` : display height (pixels)
* environment `string` : environment type (e.g. `browser` / `mac` / `windows` / `ubuntu`)
Apply patch tool (apply patch) `object`

* type `string`: `apply_patch`
MCP tool (remote MCP tool) `object` (if enabled)

* type `string` : `mcp`
* server\_label `string` : MCP server label (for tool-call routing)
* server\_url `string` : remote MCP server
* authorization `string` : OAuth access token (for remote MCP server or service connector)
* allowed\_tools `array[string] | object` : allowed tools list or filter
  + **MCP allowed tools** `array[string]`
  + **MCP tool filter** `object`
    - read\_only `boolean` : filter by read-only tools
    - tool\_names `array[string]` : tool name allowlist
* require\_approval `string | object` : which tools require approval (example uses `never`; supports finer granularity)
  + `string`: `always` / `never`
  + `object`: approval filter (schema in docs)
Shell tool (generic Shell) `object`

* type `string` : `shell`

(Usually no extra configuration is needed; execution parameters are in the model output’s `shell_call.action`.)

Local shell tool (legacy local Shell) `object`

* type `string` : `local_shell`

(The official guidance notes that local shell is legacy; for new use cases, `shell` is recommended.)

Custom tool (custom tool definition; non-function “free input / optionally constrained format”) `object`

* type `string` : `custom`
* name `string` : tool name
* description `string` : tool description
* format `object` : input format (defaults to free text)
  + **Text format** `object`
    - type `string` : `text`
  + **Grammar format** `object`
    - type `string` : `grammar`
    - syntax `string` : `lark` / `regex`
    - definition `string` : grammar definition

### tool\_choice `string | object` [​](#tool-choice-string-object-optional)

Controls how the model selects tools and whether it must call tools.

Tool choice mode `string`

* `none`: do not call tools
* `auto`: let the model decide
* `required`: must call ≥1 tool
Allowed tools `object`

* type `string`: `allowed_tools`
* mode `string`: `auto` / `required`
* tools `array`: allowed tool set (e.g. `{ "type":"function","name":"get_weather" }`, etc.)
Hosted tool (force a built-in tool) `object`

* type `string`: one of: / `web_search_preview` / `computer_use_preview` /
Function tool (force a specific function) `object`

* type `string`: `function`
* name `string`
MCP tool (force a specific MCP tool) `object`

* type `string`: `mcp`
* server\_label `string`
* name `string`
Custom tool (force a specific custom tool) `object`

* type `string`: `custom`
* name `string`
Specific apply patch tool choice (force the model to call apply\_patch) `object`

* type `string`: `apply_patch`
Specific shell tool choice (force the model to call Shell when a tool call is needed) `object`

* type `string`: `shell`

### store `boolean` (default `true`) [​](#store-boolean-optional-default-true)

Whether to store this Response for later retrieval.

### stream `boolean` (default `false`) [​](#stream-boolean-optional-default-false)

Whether to enable SSE streaming output.

### stream\_options `object` (default `null`) [​](#stream-options-object-optional-default-null)

Streaming response options. Used only when `stream: true`.

* include\_usage `boolean` : whether to include usage info in the stream

### prompt\_cache\_key `string` [​](#prompt-cache-key-string-optional)

A key to improve cache hit rate (replaces the legacy `user` field).

### prompt\_cache\_retention `string` [​](#prompt-cache-retention-string-optional)

Prompt cache retention policy (e.g. `24h`).

### safety\_identifier `string` [​](#safety-identifier-string-optional)

A stable user identifier for safety/abuse detection (recommended to hash).

### provider `object` [​](#provider-object-optional)

Used to configure routing and failover strategies across multiple model providers (e.g., OpenAI, Anthropic, Google) for this request. If not configured, the project or model’s default routing strategy is used.

#### routing `object` [​](#routing-object-required)

Routing strategy configuration that determines how requests are selected and distributed across multiple providers.

##### type `string` [​](#type-string-required)

Routing type. Supported values:

* `priority` Select providers by priority order: try the first one, then try the next upon failure (can be combined with fallback).
* `round_robin` Round-robin distribution: evenly distribute traffic across providers.
* `least_latency` Lowest-latency first: choose the provider with the fastest response based on historical/real-time stats.

##### primary\_factor `string` [​](#primary-factor-string-optional)

Primary factor when multiple providers are available. For example:

* `cost` Prefer lower-cost providers
* `speed` Prefer faster providers
* `quality` Prefer higher-quality providers (e.g., stronger models / more stable)

Actual behavior combines with `type`. For example, when `type = "priority"`, `primary_factor` mainly affects how priorities are ordered.

##### providers `array` [​](#providers-array-required)

List of model providers that can participate in routing. Example: `["openai", "anthropic", "google"]`

#### fallback `string` [​](#fallback-string-optional)

Failover strategy. When the currently selected provider fails (e.g., timeout, insufficient quota, service unavailable), how to switch automatically:

`"true"`: enable automatic failover. When the current provider is unavailable, try other available providers according to the routing strategy.

`"false"`: disable failover. If the current provider call fails, return the error directly without trying other providers.

`"<provider_name>"`: explicitly specify a fixed backup provider, e.g. `"anthropic"`:

Use the provider selected by primary routing first  
 If it fails, switch to the specified fallback provider  
 If both primary and fallback fail, return an error

### model\_routing\_config `object` [​](#model-routing-config-object-optional)

Used to configure selection and routing among different models **within the same provider** for the current request (e.g., choosing between `gpt-4o`, `gpt-4-turbo`, `claude-3-5-sonnet`).

If not configured, the project or SDK’s default model selection strategy is used (e.g., default model, default task-type mapping).

#### available\_models `array` [​](#available-models-array-required)

List of **model names** that can be used for routing or fallback.

#### preference `string` [​](#preference-string-optional)

Preferred model name.

#### task\_info `object` [​](#task-info-object-optional)

Task metadata used to determine the model or parameters **based on task type and complexity**.

Internal fields:

##### task\_type `string` [​](#task-type-string-required)

Task type describing the purpose of the request for routing or automatic parameter selection.

* Example supported values:
  + `"chat"` — conversational tasks (multi-turn chat, assistant Q&A)
  + `"completion"` — general text generation/completion
  + `"embedding"` — vectorization/semantic embeddings
* Usage:
  + Can set different default models or quota strategies per task type
  + Can be combined with `complexity` to decide whether to use a stronger model

##### complexity `string` [​](#complexity-string-optional)

Task complexity indicating the difficulty or importance of the request.

* Supported values:
  + `"low"` — simple tasks (short answers, simple rewrites, etc.)
  + `"medium"` — medium complexity (general Q&A, basic code, standard analysis)
  + `"high"` — high complexity (long document analysis, complex programming, large-scale reasoning)
* Usage:
  + Select different tiers of models by complexity (e.g., cheaper models for low complexity; stronger models for high complexity)
  + Can also be used to control timeouts, retry strategies, etc.

##### additional\_properties `object` [​](#additional-properties-object-optional)

Additional task-related fields as an extensible key-value map.

#### additional\_properties `object` [​](#additional-properties-object-optional-1)

Additional fields for the model routing config itself, used to attach extra control info beyond the standard structure.

### Unsupported fields [​](#unsupported-fields)

| Field name | Type | Supported | Description |
| --- | --- | --- | --- |
| service\_tier | string | ❌ Not supported | Service tier |
| user | string | ❌ Not supported | Legacy user identifier; its main role is now replaced by `safety_identifier` and `prompt_cache_key`. |
| background | boolean | ❌ Not supported | Whether to run this response in the background |
| metadata | object(map) | ❌ Not supported | Up to 16 key-value metadata pairs |
| tools(Code interpreter) | object | ❌ Not supported | Code interpreter |
| tools(Image generation tool) | object | ❌ Not supported | Image generation tool |
| tools(File search) | object | ❌ Not supported | File search |

## Response (non-streaming) [​](#response-non-streaming)

When `stream: false`, a **Response object** is returned.

### Top-level fields (Response object) [​](#top-level-fields-response-object)

#### background `boolean` [​](#background-boolean)

Whether this Response runs in the background. Not supported as an input; defaults to `false`.

#### completed\_at `number` [​](#completed-at-number)

Response completion timestamp (Unix seconds); present only when `status` is `completed`.

#### conversation `object` [​](#conversation-object)

The conversation this Response belongs to; input/output items are automatically appended to that conversation.

* id `string`: unique conversation ID.

#### created\_at `number` [​](#created-at-number)

Response creation timestamp (Unix seconds).

#### error `object | null` [​](#error-object-null)

Error object when generation fails.

* code `string`: error code.
* message `string`: error message.

#### id `string` [​](#id-string)

Unique Response ID.

#### incomplete\_details `object | null` [​](#incomplete-details-object-null)

Reason information for an incomplete Response.

* reason `string`: reason (e.g., reached `max_output_tokens`).

#### instructions `string | array` [​](#instructions-string-array)

System/developer instructions inserted into the model context.

#### max\_output\_tokens `integer | null` [​](#max-output-tokens-integer-null)

Generation cap (includes visible output and reasoning tokens).

#### max\_tool\_calls `integer | null` [​](#max-tool-calls-integer-null)

Total built-in tool call cap (accumulated across tools).

#### model `string` [​](#model-string)

Model ID that generated this Response.

#### object `string` [​](#object-string)

Object type, fixed to `response`.

#### output `array` [​](#output-array)

Array of model output items (order/length determined by the model). See details below.

#### output\_text `string` (SDK Only) [​](#output-text-string-sdk-only)

SDK convenience field: concatenation of all `output_text` text.

#### parallel\_tool\_calls `boolean` [​](#parallel-tool-calls-boolean)

Whether parallel tool calls are allowed.

#### previous\_response\_id `string | null` [​](#previous-response-id-string-null)

Previous Response ID; used for multi-turn conversations (mutually exclusive with `conversation`).

#### prompt `object` [​](#prompt-object)

Referenced prompt template and variables.

* id `string`: prompt template ID.
* version `string`: template version (optional).
* variables `object(map)`: variable substitution values.

#### prompt\_cache\_key `string` [​](#prompt-cache-key-string)

Stable identifier for cache optimization (replaces `user`).

#### prompt\_cache\_retention `string` [​](#prompt-cache-retention-string)

Prompt cache retention policy (e.g. `24h`).

#### reasoning `object` [​](#reasoning-object)

Reasoning configuration (gpt-5 / o series).

* effort `string | null`: reasoning intensity; supported values: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.
* summary `string | null`: whether to generate a reasoning summary; one of `auto`, `concise`, or `detailed.

#### safety\_identifier `string` [​](#safety-identifier-string)

Stable user identifier for safety monitoring (recommended to hash).

#### service\_tier `string` [​](#service-tier-string)

Service tier. Not supported as an input; defaults to `default` in the response.

#### **store `boolean`** [​](#store-boolean)

Whether to store the Response for later retrieval (appears in example responses).

#### status `string` [​](#status-string)

Generation status: `completed` / `failed` / `in_progress` / `cancelled` / `queued` / `incomplete`.

#### temperature `number` [​](#temperature-number)

Sampling temperature (0–2).

#### text `object` [​](#text-object)

Text output configuration.

##### text.format `object` [​](#text-format-object)

Specifies the model’s text output format. Default `{ type: "text" }`. Possible `text.format` types:

Text format

* type `string`

Fixed to `text`, meaning plain text output.

JSON Object format

* type `string`

Fixed to `json_object`, enabling JSON mode (guarantees valid JSON output).

JSON Schema format (Structured Outputs)

* type `string`: fixed to `json_schema`.
* name `string`: format name (≤64, alphanumeric/underscore/hyphen).
* description `string`: format description.
* schema `object`: JSON Schema definition.
* strict `boolean`: strict mode; when enabled, output must strictly follow the schema.

##### ⚠ How to enable JSON Schema / JSON Mode (Responses API) [​](#⚠-how-to-enable-json-schema-json-mode-responses-api)

* Structured Outputs:  
  `text: { format: { type: "json_schema", strict: true, schema: ... } }`
* JSON mode:  
  `text: { format: { type: "json_object" } }`

##### text.verbosity `string` [​](#text-verbosity-string)

Constrains response verbosity. Lower values produce more concise responses; higher values produce more detailed responses. Supported values: `low` / `medium` / `high`

#### tool\_choice `string | object` [​](#tool-choice-string-object)

Controls whether/how the model calls tools.

Tool choice mode`string`

* `none`: do not call tools; generate text directly
* `auto`: the model may decide to call one or more tools
* `required`: the model must call one or more tools
Allowed tools`object`

Used to **restrict the available tool subset** (after providing a full set in `tools`, allow the model to choose only within a subset).

* tool\_choice.type `string`

Fixed to `allowed_tools`.

* tool\_choice.mode `string`

  + `auto`: the model may freely choose among allowed tools or not call tools
  + `required`: the model must call one of the allowed tools
* tool\_choice.tools `array`

List of allowed tool definitions (can mix function / mcp, etc.). Example:

json

```
[
  { "type": "function", "name": "get_weather" },
  { "type": "mcp", "server_label": "deepwiki" }
]
```

Hosted tool choice`object`

Force a **built-in tool (Hosted / Built‑in tools)** call.

* tool\_choice.type `string`

  Allowed values:

  + `web_search_preview`
  + `computer_use_preview`
Function tool choice`object`

Force a specific **custom function** call.

* tool\_choice.type `string`

Fixed to `function`.

* tool\_choice.name `string`

Function name.

MCP tool choice`object`

Force a specific **MCP remote tool** call.

* tool\_choice.type `string`

Fixed to `mcp`.

* tool\_choice.server\_label `string`

MCP server identifier.

* tool\_choice.name `string`

MCP tool name to call.

Custom tool choice`object`

Force a specific **custom tool** call.

* tool\_choice.type `string`

Fixed to `custom`.

* tool\_choice.name `string`

Custom tool name to call.

Specific apply\_patch tool choice`object`

Force the model to call the **apply\_patch** tool.

* tool\_choice.type `string`

Fixed to `apply_patch`.

Specific shell tool choice`object`

Force the model to call the **shell** tool.

* tool\_choice.type `string`

Fixed to `shell`.

#### tools `array` [​](#tools-array)

List of callable tools.

#### Possible `tools[i]` types [​](#possible-tools-i-types-1)

Function tool (function tool definition) `object`

* type `string`: `function`
* name `string`: function name
* parameters `object` (JSON Schema): function parameter definition
* strict `boolean` (default `true`): strict mode
* description `string`: function description
Web search (generally available) `object`

* type `string` : `web_search` or `web_search_2025_08_26`
* filters `object` : search filters
  + allowed\_domains `array[string]` (default `[]`): allowed domain allowlist (subdomains allowed)
* search\_context\_size `string` (default `medium`): `low` / `medium` / `high`: search context size
* user\_location `object` : approximate user location
  + type `string` : `approximate`
  + city `string`: city name
  + country `string` : 2-letter ISO (e.g. `US`)
  + region `string`: region/state code
  + timezone `string` : IANA TZ (e.g. `America/Los_Angeles`)
Web search preview `object`

* type `string`: `web_search_preview` or `web_search_preview_2025_03_11`
* search\_context\_size `string` : `low` / `medium` / `high`
* user\_location `object`: user location
  + type `string`: `approximate`
  + city `string`: city name
  + country `string` (2-letter ISO)
  + region `string`: region/state code
  + timezone `string` (IANA TZ)
Computer use preview (Computer Use tool) `object`

* type `string` : `computer_use_preview`
* display\_width `integer` : display width (pixels)
* display\_height `integer` : display height (pixels)
* environment `string` : environment type (e.g. `browser` / `mac` / `windows` / `ubuntu`)
Apply patch tool (apply patch) `object`

* type `string`: `apply_patch`
MCP tool (remote MCP tool) `object` (if enabled)

* type `string` : `mcp`
* server\_label `string` : MCP server label (for tool-call routing)
* server\_url `string` : remote MCP server
* authorization `string` : OAuth access token (for remote MCP server or service connector)
* allowed\_tools `array[string] | object` : allowed tools list or filter
  + **MCP allowed tools** `array[string]`
  + **MCP tool filter** `object`
    - read\_only `boolean` : filter by read-only tools
    - tool\_names `array[string]` : tool name allowlist
* require\_approval `string | object` : which tools require approval (example uses `never`; supports finer granularity)
  + `string`: `always` / `never`
  + `object`: approval filter (schema in docs)
Shell tool (generic Shell) `object`

* type `string` : `shell`

(Usually no extra configuration is needed; execution parameters are in the model output’s `shell_call.action`.)

Local shell tool (legacy local Shell) `object`

* type `string` : `local_shell`

(The official guidance notes that local shell is legacy; for new use cases, `shell` is recommended.)

Custom tool (custom tool definition; non-function “free input / optionally constrained format”) `object`

* type `string` : `custom`
* name `string` : tool name
* description `string` : tool description
* format `object` : input format config (defaults to free text)
  + **Text format** `object`: text format
    - type `string` : `text`: format type, fixed to text
  + **Grammar format** `object`: grammar format
    - type `string` : `grammar`: format type, fixed to grammar
    - syntax `string` : `lark` / `regex`: grammar syntax
    - definition `string` : grammar definition

#### top\_logprobs `integer` [​](#top-logprobs-integer)

Top-N probabilities for each token (0–20).

#### top\_p `number` [​](#top-p-number)

Nucleus sampling parameter.

#### truncation `string` [​](#truncation-string)

Truncation strategy: `auto` / `disabled`.

#### usage `object` [​](#usage-object)

Token usage information.

* input\_tokens `integer`: number of input tokens
* input\_tokens\_details `object`: input token details
  + cached\_tokens `integer`: number of cached tokens
* output\_tokens `integer`: number of output tokens
* output\_tokens\_details `object`: output token details
  + reasoning\_tokens `integer`: number of reasoning tokens
* total\_tokens `integer`: total number of tokens

#### user `string | null` (Deprecated) [​](#user-string-null-deprecated)

Deprecated. Defaults to `null`. Use `prompt_cache_key` / `safety_identifier` instead.

### output[i]: Possible Output item types [​](#output-i-possible-output-item-types)

Output message (output message) `object`

* type `string`: fixed to `message`.
* id `string`: message item ID.
* role `string`: fixed to `assistant`.
* status `string`: `in_progress` / `completed` / `incomplete`.
* content `array`: list of content parts.

#### Possible `message.content[j]` types [​](#possible-message-content-j-types)

A) Output text `object`

* type `string`: fixed to `output_text`.
* text `string`: model output text.
* annotations `array`: citation/annotation list.
* logprobs `array`: token probability info (requires include).

B) Refusal `object`

* type `string`: fixed to `refusal`.
* refusal `string`: refusal explanation.

##### Possible `Output text.annotations[k]` types [​](#possible-output-text-annotations-k-types)

1. File citation `object`

* type `string`: fixed to `file_citation`.
* file\_id `string`: file ID.
* filename `string`: file name.
* index `integer`: file index.

2. URL citation `object`

* type `string`: fixed to `url_citation`.
* url `string`: page URL.
* title `string`: page title.
* start\_index `integer`: citation start position.
* end\_index `integer`: citation end position.

3. Container file citation `object`

* type `string`: fixed to `container_file_citation`.
* container\_id `string`: container ID.
* file\_id `string`: file ID.
* filename `string`: file name.
* start\_index `integer`: citation start position.
* end\_index `integer`: citation end position.

4. File path `object`

* type `string`: fixed to `file_path`.
* file\_id `string`: file ID.
* index `integer`: file index.

##### Output text.logprobs[m] (token logprob schema) [​](#output-text-logprobs-m-token-logprob-schema)

* token `string`: token text.
* logprob `number`: log probability.
* bytes `array`: byte representation.
* top\_logprobs `array`: candidate tokens and logprobs.
Reasoning (reasoning item) `object`

* type `string`: fixed to `reasoning`.
* id `string`: reasoning item ID.
* summary `array`: reasoning summary parts.
  + type `string`: fixed to `summary_text`.
  + text `string`: summary text.
* content `array`: optional reasoning body parts.
  + type `string`: fixed to `reasoning_text`.
  + text `string`: reasoning body text.
* encrypted\_content `string`: encrypted reasoning content (requires include).
* status `string`: `in_progress` / `completed` / `incomplete`.
Function tool call (function call request) `object`

* type `string`: fixed to `function_call`.
* id `string`: call item ID.
* call\_id `string`: correlated call ID.
* name `string`: function name.
* arguments `string`: JSON string arguments.
* status `string`: `in_progress` / `completed` / `incomplete`.
Web search tool call (web search call result) `object`

* type `string`: fixed to `web_search_call`.
* id `string`: search call ID.
* status `string`: search call status.
* action `object`: specific action.
  + Search action `object`
    - type `string`: action type (search).
    - query `string`: query (deprecated).
    - queries `array`: query list.
    - sources `array`: source list (requires include).
  + Open page action `object`
    - type `string`: `open_page`.
    - url `string`: opened URL.
  + Find action `object`
    - type `string`: `find`.
    - url `string`: page searched.
    - pattern `string`: find pattern.
Compaction item `object`

Generated by `v1/responses/compact`. Used to compress long conversations into an opaque encrypted summary and can be fed back into later `input`.

* type `string`: `compaction`
* id `string`: compaction item ID
* encrypted\_content `string`: compressed summary (encrypted, opaque)
* created\_by `string`: identifier of the entity that created this item
Local shell call (local shell call) `object`

* type `string`: fixed to `local_shell_call`
* id `string`: unique identifier for the tool call
* call\_id `string`: call ID
* status `string`: call status
* action `object`: execution action config
  + type `string`: `exec`: action type, fixed to executing a command
  + command `array`: command to execute (array form)
  + env `map`: environment variables
  + timeout\_ms `integer`: timeout (ms)
  + user `string`: execution user
  + working\_directory `string`: working directory path
Computer tool call (Computer Use call) `object`

* type `string`: fixed to `computer_call`.
* id `string`: call ID.
* call\_id `string`: correlated call ID.
* status `string`: call status.
* pending\_safety\_checks `array`: pending safety checks.
* action `object`: specific action.

###### Action types (possible `action` variants) [​](#action-types-possible-action-variants-1)

###### Click `object` [​](#click-object-1)

* type `string`: `click`
* x `number`
* y `number`
* button `string` : `left` / `right` / `middle`

###### Double click `object` [​](#double-click-object-1)

* type `string`: `double_click`
* x `integer`
* y `integer`

###### Move `object` [​](#move-object-1)

* type `string`: `move`
* x `integer`
* y `integer`

###### Screenshot `object` [​](#screenshot-object-1)

* type `screenshot`: `move`

###### Drag `object` [​](#drag-object-1)

* type `string`: `drag`
* path `array`: `drag`
  + x `integer`
  + y `integer`

###### Scroll `object` [​](#scroll-object-1)

* type `string`: `scroll`
* x `integer` (scroll anchor; some implementations provide it)
* y `integer`
* scroll\_x `integer`
* scroll\_y `integer`

###### Type `object` [​](#type-object-1)

* type `string`: `type`
* text `string`

###### Keypress `object` [​](#keypress-object-1)

* type `string`: `keypress`
* keys `array` (key combo, e.g. `["CTRL","L"]`)

###### Wait `object` [​](#wait-object-1)

* type `string`: `wait`
Shell tool call `object`

* type `string`: `shell_call`
* call\_id `string`
* id `string`
* status `string`: `in_progress` / `completed` / `incomplete`
* action `object`: shell commands and limits
  + commands `array`: list of commands to run in order
  + max\_output\_length `integer`: max captured stdout+stderr UTF-8 chars
  + timeout\_ms `integer`: timeout in ms
* created\_by `string`: entity ID that created this tool call
Shell tool call output `object`

* type `string`: fixed to `shell_call_output`
* call\_id `string`: call ID
* id `string`: unique identifier for the output item
* max\_output\_length `integer`: max output length limit
* output `array`: list of stdout/stderr chunks; each element:
  + stdout `string`: stdout content
  + stderr `string`: stderr content
  + outcome `object`: execution outcome (union type)
    - Timeout outcome `object`: timeout outcome
      * type `string`: `timeout`: outcome type, fixed to timeout
    - Exit outcome `object`: exit outcome
      * type `string`: `exit`: outcome type, fixed to exit
      * exit\_code `integer`: exit code
* created\_by `string`: identifier of the entity that created this item
Apply patch tool call (apply patch call) `object`

Used to create/delete/update files via a diff patch.

* type `string`: fixed to `apply_patch_call`
* call\_id `string`: call ID
* id `string`: unique identifier for the call
* status `string`: `in_progress` / `completed`: call status
* created\_by `string`: creator identifier
* operation `object`: operation (union type)

###### Possible operation types [​](#possible-operation-types-1)

1. Create file `object`: create file operation

* type `string`: `create_file`: operation type, fixed to create file
* path `string`: relative to workspace root
* diff `string`: unified diff content

2. Delete file `object`: delete file operation

* type `string`: `delete_file`: operation type, fixed to delete file
* path `string`: file path

3. Update file `object`: update file operation

* type `string`: `update_file`: operation type, fixed to update file
* path `string`: file path
* diff `string`: unified diff content
Apply patch tool call output `object`

* type `string`: fixed to `apply_patch_call_output`
* call\_id `string`: call ID
* id `string`: unique identifier for the output item
* status `string`: `completed` / `failed`: execution status
* output `string`: human-readable logs/errors
* created\_by `string`: creator identifier
MCP tool call `object`

* type `string`: fixed to `mcp_call`
* id `string`: unique identifier for the tool call
* server\_label `string`: MCP server label
* name `string`: tool name
* arguments `string`: JSON string arguments
* approval\_request\_id `string`: ID for subsequent approval response
* output `string`: tool output
* error `string`: error message
* status `string`: `in_progress` / `completed` / `incomplete` / `calling` / `failed`: call status
MCP list tools `object`

* type `string`: fixed to `mcp_list_tools`
* id `string`: unique identifier for the call
* server\_label `string`: MCP server label
* error `string`: error message
* tools `array`: tool list; each element:
  + name `string`: tool name
  + description `string`: tool description
  + annotations `object`: tool annotations
  + input\_schema `object`: JSON Schema input parameter definition
MCP approval request `object`

* type `string`: fixed to `mcp_approval_request`
* id `string`: unique approval request ID
* server\_label `string`: MCP server label
* name `string`: requested tool name to run
* arguments `string`: tool arguments as a JSON string
Custom tool call (custom tool call) `object`

The model initiates a call to a “custom tool” (you must execute it on your side).

* type `string`: fixed to `custom_tool_call`
* call\_id `string`: call ID
* name `string`: tool name
* input `string`: input parameters
* id `string`: unique identifier for the call

## Response (streaming) [​](#response-streaming)

When `stream: true`, `POST /v1/responses` does not return the full Response object in one shot. Instead, it continuously pushes a sequence of **Streaming events** via **SSE (Server-Sent Events)**. ([platform.openai.com](https://platform.openai.com/docs/guides/streaming-responses))

### Transport format (SSE) [​](#transport-format-sse)

* HTTP responses are typically `Content-Type: text/event-stream`
* The server sends multiple events in order
* Each event, at the “wire protocol” level, typically looks like this (example):

text

```
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":"Hello","sequence_number":12}
```

> Note: SSE also supports an `event: ...` line, but in Responses streaming semantics, the event type is determined by the JSON `type` field. SDKs also parse each event directly into an object for consumption. ([platform.openai.com](https://platform.openai.com/docs/guides/streaming-responses))

### General notes on Streaming events [​](#general-notes-on-streaming-events)

* Each event includes:
  + `type`: event type string (e.g., `response.created`)
  + `sequence_number`: event sequence number for ordering (examples may start from 0 or 1)
* Many events include indexes/association fields such as `output_index`, `item_id`, `content_index` to precisely merge delta events back into the specific item in `output[]` and the specific content part within that item.

## Streaming events [​](#streaming-events)

> Below, each event lists fields in the same order as on the official reference page. The **exact structures** of objects like `response` / `item` / `part` / `annotation` match the earlier “non-streaming Response object / output items” section (or the corresponding official schemas).

### response.created [​](#response-created)

Emitted when the response is created.

Fields:

* response `object`: the created Response (the Response object described above)
* sequence\_number `integer`: event sequence number
* type `string`: fixed to `response.created`

### response.in\_progress [​](#response-in-progress)

Emitted while the response is being generated.

Fields:

* response `object`: in-progress Response
* sequence\_number `integer`
* type `string`: fixed to `response.in_progress`

### response.completed [​](#response-completed)

Emitted when the response completes (includes the final Response).

Fields:

* response `object`: completed Response (includes final `output`, `usage`, etc.)
* sequence\_number `integer`
* type `string`: fixed to `response.completed`

### response.failed [​](#response-failed)

Emitted when the response fails (includes error info).

Fields:

* response `object`: failed Response (`status="failed"`, non-empty `error`)
* sequence\_number `integer`
* type `string`: fixed to `response.failed`

### response.incomplete [​](#response-incomplete)

Emitted when the response ends as incomplete (e.g., hitting a limit).

Fields:

* response `object`: incomplete Response (`status="incomplete"`, `incomplete_details` may be non-empty)
* sequence\_number `integer`
* type `string`: fixed to `response.incomplete`

### response.output\_item.added [​](#response-output-item-added)

Emitted when a new output item is added.

Fields:

* item `object`: the newly added output item (message / tool call / reasoning, etc.; see `output[i]` above)
* output\_index `integer`: index of the item in `response.output[]`
* sequence\_number `integer`
* type `string`: fixed to `response.output_item.added`

### response.output\_item.done [​](#response-output-item-done)

Emitted when an output item is done.

Fields:

* item `object`: completed output item
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.output_item.done`

### response.content\_part.added [​](#response-content-part-added)

Emitted when a message’s `content[]` adds a new content part.

Fields:

* content\_index `integer`: index of the part in `message.content[]`
* item\_id `string`: ID of the owning output item (usually the message item’s `id`)
* output\_index `integer`: owning output item index
* part `object`: newly added content part (e.g., `output_text` / `refusal`; see above)
* sequence\_number `integer`
* type `string`: fixed to `response.content_part.added`

### response.content\_part.done [​](#response-content-part-done)

Emitted when a content part is done.

Fields:

* content\_index `integer`
* item\_id `string`
* output\_index `integer`
* part `object`: finalized content part
* sequence\_number `integer`
* type `string`: fixed to `response.content_part.done`

### response.output\_text.delta [​](#response-output-text-delta)

Delta event for output text.

Fields:

* content\_index `integer`: content part index that owns the text
* delta `string`: newly generated text fragment
* item\_id `string`: owning output item ID
* logprobs `array`: token probabilities (appears only with include/config; schema matches the logprobs definition above)
* output\_index `integer`: owning output item index
* sequence\_number `integer`
* type `string`: fixed to `response.output_text.delta`

### response.output\_text.done [​](#response-output-text-done)

Emitted when a text segment is finalized.

Fields:

* content\_index `integer`
* item\_id `string`
* logprobs `array`: token probabilities (as above; appears as needed)
* output\_index `integer`
* sequence\_number `integer`
* text `string`: final full text
* type `string`: fixed to `response.output_text.done`

### response.refusal.delta [​](#response-refusal-delta)

Delta event for refusal text.

Fields:

* content\_index `integer`
* delta `string`: refusal text delta
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.refusal.delta`

### response.refusal.done [​](#response-refusal-done)

Final refusal text event.

Fields:

* content\_index `integer`
* item\_id `string`
* output\_index `integer`
* refusal `string`: final refusal explanation
* sequence\_number `integer`
* type `string`: fixed to `response.refusal.done`

### response.function\_call\_arguments.delta [​](#response-function-call-arguments-delta)

Delta event for function call `arguments` (arguments is incrementally concatenated as a JSON string).

Fields:

* delta `string`: incremental arguments fragment
* item\_id `string`: ID of the function\_call item
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.function_call_arguments.delta`

### response.function\_call\_arguments.done [​](#response-function-call-arguments-done)

Final function call arguments event.

Fields:

* arguments `string`: final arguments (JSON string)
* item\_id `string`
* name `string`: function name
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.function_call_arguments.done`

### response.web\_search\_call.in\_progress [​](#response-web-search-call-in-progress)

Web search tool call start event.

Fields:

* item\_id `string`: ID of the web\_search\_call item
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.web_search_call.in_progress`

### response.web\_search\_call.searching [​](#response-web-search-call-searching)

Web search in-progress event.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.web_search_call.searching`

### response.web\_search\_call.completed [​](#response-web-search-call-completed)

Web search completed event (sources and similar fields require include).

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.web_search_call.completed`

### response.reasoning\_summary\_part.added [​](#response-reasoning-summary-part-added)

Emitted when a new reasoning summary part is added.

Fields:

* item\_id `string`: reasoning item ID
* output\_index `integer`
* part `object`: newly added summary part (e.g., `summary_text`)
* sequence\_number `integer`
* summary\_index `integer`: index of the summary part
* type `string`: fixed to `response.reasoning_summary_part.added`

### response.reasoning\_summary\_part.done [​](#response-reasoning-summary-part-done)

Emitted when a reasoning summary part is done.

Fields:

* item\_id `string`
* output\_index `integer`
* part `object`: finalized summary part
* sequence\_number `integer`
* summary\_index `integer`
* type `string`: fixed to `response.reasoning_summary_part.done`

### response.reasoning\_summary\_text.delta [​](#response-reasoning-summary-text-delta)

Delta event for reasoning summary text.

Fields:

* delta `string`: summary text delta
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* summary\_index `integer`
* type `string`: fixed to `response.reasoning_summary_text.delta`

### response.reasoning\_summary\_text.done [​](#response-reasoning-summary-text-done)

Final reasoning summary text event.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* summary\_index `integer`
* text `string`: final full summary text
* type `string`: fixed to `response.reasoning_summary_text.done`

### response.reasoning\_text.delta [​](#response-reasoning-text-delta)

Delta event for reasoning body text.

Fields:

* content\_index `integer`: reasoning content part index
* delta `string`
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.reasoning_text.delta`

### response.reasoning\_text.done [​](#response-reasoning-text-done)

Final reasoning body text event.

Fields:

* content\_index `integer`
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* text `string`: final full reasoning text
* type `string`: fixed to `response.reasoning_text.done`

### response.mcp\_call\_arguments.delta [​](#response-mcp-call-arguments-delta)

Delta event for MCP tool call arguments (JSON string incremental).

Fields:

* delta `string`: arguments delta (JSON string fragment)
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_call_arguments.delta`

### response.mcp\_call\_arguments.done [​](#response-mcp-call-arguments-done)

Final MCP tool call arguments event.

Fields:

* arguments `string`: final arguments (JSON string)
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_call_arguments.done`

### response.mcp\_call.completed [​](#response-mcp-call-completed)

Emitted when an MCP tool call completes successfully.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_call.completed`

### response.mcp\_call.failed [​](#response-mcp-call-failed)

Emitted when an MCP tool call fails.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_call.failed`

### response.mcp\_call.in\_progress [​](#response-mcp-call-in-progress)

Emitted while an MCP tool call is in progress.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_call.in_progress`

### response.mcp\_list\_tools.completed [​](#response-mcp-list-tools-completed)

Emitted when MCP list-tools completes successfully.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_list_tools.completed`

### response.mcp\_list\_tools.failed [​](#response-mcp-list-tools-failed)

Emitted when MCP list-tools fails.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_list_tools.failed`

### response.mcp\_list\_tools.in\_progress [​](#response-mcp-list-tools-in-progress)

Emitted while MCP list-tools is in progress.

Fields:

* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.mcp_list_tools.in_progress`

### response.output\_text.annotation.added [​](#response-output-text-annotation-added)

Delta event for adding an annotation to a text output’s annotations array.

Fields:

* annotation `object`: newly added annotation (schema matches the annotation types above / official schema)
* annotation\_index `integer`: index in the annotations array
* content\_index `integer`
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: fixed to `response.output_text.annotation.added`

### response.queued [​](#response-queued)

Emitted when the response enters the queued state.

Fields:

* response `object`: queued Response (same schema as Response object; examples may show only a subset)
* sequence\_number `integer`
* type `string`: fixed to `response.queued`

### response.custom\_tool\_call\_input.delta [​](#response-custom-tool-call-input-delta)

Delta event for custom tool input.

Fields:

* delta `string`: input delta fragment
* item\_id `string`: ID of the custom\_tool\_call item
* output\_index `integer`
* sequence\_number `integer`
* type `string`: event type identifier (fixed to `response.custom_tool_call_input.delta`)

### response.custom\_tool\_call\_input.done [​](#response-custom-tool-call-input-done)

Final custom tool input event.

Fields:

* input `string`: final full input
* item\_id `string`
* output\_index `integer`
* sequence\_number `integer`
* type `string`: event type identifier (fixed to `response.custom_tool_call_input.done`)

### error [​](#error)

Emitted when an error occurs during streaming.

Fields:

* code `string`: error code
* message `string`: error message
* param `string`: error parameter (may be null)
* sequence\_number `integer`
* type `string`: fixed to `error`

TypeScriptPythoncURL

TypeScript

```
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: 'https://zenmux.ai/api/v1',
  apiKey: '<ZENMUX_API_KEY>',
});

async function main() {
  const response = await openai.responses.create({
    model: "openai/gpt-5",
    input: "What is the meaning of life?"
  })

  print(response)
}

main();
```

Python

```
from openai import OpenAI

client = OpenAI(
    base_url="https://zenmux.ai/api/v1",
    api_key="<your_ZENMUX_API_KEY>",
)

response = client.responses.create(
    model: "openai/gpt-5",
    input: "What is the meaning of life?"
)

print(response)
```

cURL

```
curl https://zenmux.ai/api/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ZENMUX_API_KEY" \
  -d '{
    "model": "openai/gpt-5",
    "input": "What is the meaning of life?"
  }'
```

json

json

```
{
  "id": "resp_0140d07a600e72a30069733ecadb508194b7cd84f200b593c7",
  "object": "response",
  "created_at": 1769160394,
  "status": "completed",
  "background": false,
  "content_filters": [
    {
      "blocked": false,
      "source_type": "prompt",
      "content_filter_raw": null,
      "content_filter_results": {},
      "content_filter_offsets": {
        "start_offset": 0,
        "end_offset": 0,
        "check_offset": 0
      }
    },
    {
      "blocked": false,
      "source_type": "completion",
      "content_filter_raw": null,
      "content_filter_results": {},
      "content_filter_offsets": {
        "start_offset": 0,
        "end_offset": 0,
        "check_offset": 0
      }
    }
  ],
  "error": null,
  "incomplete_details": null,
  "instructions": null,
  "max_output_tokens": null,
  "max_tool_calls": null,
  "model": "openai/gpt-5",
  "output": [
    {
      "id": "rs_0140d07a600e72a30069733ecbf4c88194b2a1d173c1b500fa",
      "type": "reasoning",
      "summary": []
    },
    {
      "id": "msg_0140d07a600e72a30069733edc988881948160d23b617f9994",
      "type": "message",
      "status": "completed",
      "content": [
        {
          "type": "output_text",
          "annotations": [],
          "logprobs": [],
          "text": "There isn’t a single agreed-on meaning of life. Different lenses offer different answers:\n- Evolutionary: to survive, reproduce, and pass on genes.\n- Religious/spiritual: to know, serve, or unite with the divine.\n- Existential: life has no built-in meaning; we create it through choices.\n- Humanistic/psychological: meaning arises from relationships, growth, and contribution.\n\nFor most people, meaning tends to cluster around a few pillars:\n- Love and connection\n- Growth and mastery\n- Service and impact\n- Curiosity, beauty, and wonder\n\nIf you’re seeking your own, try:\n- Clarify values: list your top 5 and rank them.\n- Track aliveness: note when you feel most engaged and why.\n- Contribute: find a problem you care about and help, even in small ways.\n- Commit: choose a long-term project that matters to you and stick with it.\n\nMeaning is less a destination than a practice. If you share what matters to you, I can help you shape it into a clear life purpose."
        }
      ],
      "role": "assistant"
    }
  ],
  "parallel_tool_calls": true,
  "previous_response_id": null,
  "prompt_cache_key": null,
  "prompt_cache_retention": null,
  "reasoning": {
    "effort": "medium",
    "summary": null
  },
  "safety_identifier": null,
  "service_tier": "default",
  "store": true,
  "temperature": 1,
  "text": {
    "format": {
      "type": "text"
    },
    "verbosity": "medium"
  },
  "tool_choice": "auto",
  "tools": [],
  "top_logprobs": 0,
  "top_p": 1,
  "truncation": "disabled",
  "usage": {
    "input_tokens": 13,
    "input_tokens_details": {
      "cached_tokens": 0,
      "web_search": 0
    },
    "output_tokens": 801,
    "output_tokens_details": {
      "reasoning_tokens": 576
    },
    "total_tokens": 814
  },
  "user": null,
  "metadata": {}
}
```

---

