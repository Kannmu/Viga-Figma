# Table of Contents

- [Structured Outputs | ZenMux | Documentation](#structured-outputs-zenmux-documentation)

---

# Structured Outputs | ZenMux | Documentation

> Source: [https://zenmux.ai/docs/guide/advanced/structured-output.html](https://zenmux.ai/docs/guide/advanced/structured-output.html)

# Structured Outputs [​](#structured-outputs)

ZenMux provides Structured Outputs to ensure model responses strictly follow the [JSON Schema](https://json-schema.org/) format you define. When you have a fixed requirement for structured data, this feature is exactly what you need.

ZenMux supports structured outputs across multiple API protocols:

* **OpenAI Chat Completion API**: via the `response_format` parameter
* **OpenAI Responses API**: via the `text.format` parameter
* **Anthropic Messages API**: via the `output_config.format` parameter (recommended) or tool calling
* **Google Vertex AI API**: via the `responseMimeType` + `responseSchema` parameters

## OpenAI Chat Completion API [​](#openai-chat-completion-api)

### Parameter Reference [​](#parameter-reference)

**response\_format**

* Set `{ "type": "json_object" }`: the output is valid JSON, but a specific structure or set of fields is not guaranteed.
* Set `{ "type": "json_schema", "json_schema": {...} }`: stricter control over the JSON output structure, providing stronger type and structural guarantees.

1. Use `json_object` mode

Request structure:

json

```
{
  "response_format": {
    "type": "json_object"
  }
}
```

Response structure: `content` returns valid JSON

json

```
{
    "model": "openai/gpt-5-nano",
    "choices": [
        {
            "message": {
                // The actual content is a JSON string; for readability, it is shown here as JSON
                "content": {
                    "description": "I am ChatGPT, an AI assistant built by OpenAI. I help answer questions, brainstorm ideas, draft text, explain concepts, debug code, and learn topics. I use patterns from training data to generate helpful, clear responses while recognizing limits and inviting follow-up questions. I adapt tone and detail to your needs."
                }
            }
            ....
        }
    ]
    ....
}
```

2. Use `json_schema` mode

Define the input using the standard [JSON Schema](https://json-schema.org/) format:

json

```
{
  "response_format": {
    "type": "json_schema",
    // Standard json_schema payload
    "json_schema": {
      "name": "role",
      "description": "Introduce yourself",
      "schema": {
        "type": "object",
        "description": "Your messages",
        "properties": {
          "name": {
            "type": "string",
            "description": "your name"
          },
          "city": {
            "type": "string",
            "description": "where your city"
          },
          "desc": {
            "type": "string",
            "description": "description"
          }
        },
        "required": ["name", "city", "desc"],
        "additionalProperties": false
      }
    }
  }
}
```

The returned `content` will follow the specified schema and provide JSON data:

json

```
{
    "model": "openai/gpt-5-nano",
    "choices": [
        {
            "message": {
                // The actual content is a JSON string; for readability, it is shown here as JSON
                "content": {
                    "name": "ChatGPT",
                    "city": "Internet",
                    "desc": "I am ChatGPT, an AI language model created by OpenAI. I help with questions, ideas, writing, and problem-solving. I learn from patterns in text and aim to be helpful, accurate, and respectful. I don't have personal experiences, but I strive to understand your needs and respond clearly and kindly today."
                }
                ...
            }
        }
    ],
    ...
}
```

### API Call Examples [​](#api-call-examples)

PythonTypeScript

python

```
from openai import OpenAI

# 1. Initialize the OpenAI client
client = OpenAI(
    # 2. Point the base URL to the ZenMux endpoint
    base_url="https://zenmux.ai/api/v1", 
    # 3. Replace with the API Key from the ZenMux user console
    api_key="<your ZENMUX_API_KEY>", 
)

# 4. Send the request
completion = client.chat.completions.create(
    # 5. Specify the model you want to use, in the format "provider/model-name"
    model="openai/gpt-5", 
    messages=[
        {
            "role": "user",
            "content": "Hi, who are you? Describe yourself using about 50 words. Use JSON response format?"
        }
    ],
    # Option 1: The output is valid JSON, but a specific structure or set of fields is not guaranteed.
    # response_format = {
    #      "type": "json_object"
    #  }
    # Option 2: More strictly control the JSON output structure, providing stronger type and structural guarantees
    response_format = { 
        "type": "json_schema", 
        "json_schema": {
            "name": "role",
            "description": "Introduce yourself",
            "schema": {
                "type": "object",
                "description": "Your messages",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "your name"
                    },
                    "city": {
                        "type": "string",
                        "description": "where your city"
                    },
                    "desc": {
                        "type": "string",
                        "description": "description"
                    }
                },
                "required": ["name", "city", "desc"],
                "additionalProperties": False
            }
        }
    }
)

print(completion.choices[0].message.content)
```

ts

```
import OpenAI from "openai";

// 1. Initialize the OpenAI client
const openai = new OpenAI({
  // 2. Point the base URL to the ZenMux endpoint
  baseURL: "https://zenmux.ai/api/v1", 
  // 3. Replace with the API Key from the ZenMux user console
  apiKey = "<your ZENMUX_API_KEY>", 
});

async function main() {
  // 4. Send the request
  const completion = await openai.chat.completions.create({
    // 5. Specify the model you want to use, in the format "provider/model-name"
    model: "openai/gpt-5",
    messages: [
      {
        role: "user",
        content:
          "Hi, who are you? Describe yourself using about 50 words. Use JSON response format?",
      },
    ],
    // Option 1: The output is valid JSON, but a specific structure or set of fields is not guaranteed.
    // response_format: {
    //     "type": "json_object"
    // }
    // Option 2: More strictly control the JSON output structure, providing stronger type and structural guarantees
    response_format: {
      type: "json_schema", 
      json_schema: {
        name: "role",
        description: "Introduce yourself",
        schema: {
          type: "object",
          description: "Your messages",
          properties: {
            name: {
              type: "string",
              description: "your name",
            },
            city: {
              type: "string",
              description: "where your city",
            },
            desc: {
              type: "string",
              description: "description",
            },
          },
          required: ["name", "city", "desc"],
          additionalProperties: false,
        },
      },
    },
  });

  console.log(completion.choices[0].message.content);
}

main();
```

## OpenAI Responses API [​](#openai-responses-api)

The OpenAI Responses API uses the `text.format` parameter to control structured outputs, rather than `response_format`.

### Parameter Reference [​](#parameter-reference-1)

**text.format**

* Set `{ "type": "text" }`: plain text output (default)
* Set `{ "type": "json_object" }`: JSON mode, guarantees the output is valid JSON
* Set `{ "type": "json_schema", "json_schema": {...} }`: Structured Outputs, strictly follow the JSON Schema

### API Call Examples [​](#api-call-examples-1)

PythonTypeScriptcURL

python

```
from openai import OpenAI

# 1. Initialize the OpenAI client
client = OpenAI(
    # 2. Point the base URL to the ZenMux endpoint
    base_url="https://zenmux.ai/api/v1", 
    # 3. Replace with the API Key from the ZenMux user console
    api_key="<your ZENMUX_API_KEY>", 
)

# 4. Send the request using the Responses API
response = client.responses.create(
    # 5. Specify the model you want to use
    model="openai/gpt-5", 
    input="Hi, who are you? Describe yourself using about 50 words.",
    # Option 1: JSON mode
    # text={
    #     "format": { "type": "json_object" }
    # }
    # Option 2: Structured Outputs (recommended)
    text={ 
        "format": { 
            "type": "json_schema", 
            "name": "role",
            "description": "Introduce yourself",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "your name"
                    },
                    "city": {
                        "type": "string",
                        "description": "where your city"
                    },
                    "desc": {
                        "type": "string",
                        "description": "description"
                    }
                },
                "required": ["name", "city", "desc"],
                "additionalProperties": False
            }
        }
    }
)

# Get the output text
for item in response.output:
    if item.type == "message":
        for content in item.content:
            if content.type == "output_text":
                print(content.text)
```

ts

```
import OpenAI from "openai";

// 1. Initialize the OpenAI client
const openai = new OpenAI({
  // 2. Point the base URL to the ZenMux endpoint
  baseURL: "https://zenmux.ai/api/v1", 
  // 3. Replace with the API Key from the ZenMux user console
  apiKey: "<your ZENMUX_API_KEY>", 
});

async function main() {
  // 4. Send the request using the Responses API
  const response = await openai.responses.create({
    // 5. Specify the model you want to use
    model: "openai/gpt-5", 
    input: "Hi, who are you? Describe yourself using about 50 words.",
    // Option 1: JSON mode
    // text: {
    //   format: { type: "json_object" }
    // }
    // Option 2: Structured Outputs (recommended)
    text: {
      format: {
        type: "json_schema", 
        name: "role",
        description: "Introduce yourself",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "your name",
            },
            city: {
              type: "string",
              description: "where your city",
            },
            desc: {
              type: "string",
              description: "description",
            },
          },
          required: ["name", "city", "desc"],
          additionalProperties: false,
        },
      },
    },
  });

  // Get the output text
  for (const item of response.output) {
    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type === "output_text") {
          console.log(content.text);
        }
      }
    }
  }
}

main();
```

bash

```
curl https://zenmux.ai/api/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ZENMUX_API_KEY" \
  -d '{
    "model": "openai/gpt-5",
    "input": "Hi, who are you? Describe yourself using about 50 words.",
    "text": {
      "format": {
        "type": "json_schema",
        "name": "role",
        "description": "Introduce yourself",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "description": "your name" },
            "city": { "type": "string", "description": "where your city" },
            "desc": { "type": "string", "description": "description" }
          },
          "required": ["name", "city", "desc"],
          "additionalProperties": false
        }
      }
    }
  }'
```

## Anthropic Messages API [​](#anthropic-messages-api)

Anthropic Claude models support two approaches to structured output:

1. **JSON output (recommended)**: specify a JSON Schema directly via the `output_config.format` parameter
2. **Tool calling**: define a tool and force the model to call it to obtain structured data

### Option 1: JSON Output (`output_config`) [​](#option-1-json-output-output-config)

This is Anthropic’s recommended approach, using `output_config.format` to directly control Claude’s response format.

**Parameter Reference**

* `output_config.format.type`: set to `"json_schema"`
* `output_config.format.schema`: JSON Schema that defines the output structure

PythonTypeScriptcURL

python

```
import anthropic

# 1. Initialize the Anthropic client
client = anthropic.Anthropic(
    # 2. Replace with the API Key from the ZenMux user console
    api_key="<your ZENMUX_API_KEY>", 
    # 3. Point the base URL to the ZenMux endpoint
    base_url="https://zenmux.ai/api/anthropic"
)

# 4. Send the request and specify structured output via output_config
message = client.messages.create(
    model="anthropic/claude-sonnet-4.5", 
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Hi, who are you? Describe yourself using about 50 words."
        }
    ],
    output_config={ 
        "format": { 
            "type": "json_schema", 
            "schema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "your name"
                    },
                    "city": {
                        "type": "string",
                        "description": "where your city"
                    },
                    "desc": {
                        "type": "string",
                        "description": "description about yourself"
                    }
                },
                "required": ["name", "city", "desc"],
                "additionalProperties": False
            }
        }
    }
)

# 5. Get structured JSON directly
import json
result = json.loads(message.content[0].text)
print(result)
```

ts

```
import Anthropic from "@anthropic-ai/sdk";

// 1. Initialize the Anthropic client
const anthropic = new Anthropic({
  // 2. Replace with the API Key from the ZenMux user console
  apiKey: "<your ZENMUX_API_KEY>", 
  // 3. Point the base URL to the ZenMux endpoint
  baseURL: "https://zenmux.ai/api/anthropic", 
});

async function main() {
  // 4. Send the request and specify structured output via output_config
  const message = await anthropic.messages.create({
    model: "anthropic/claude-sonnet-4.5", 
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "Hi, who are you? Describe yourself using about 50 words.",
      },
    ],
    output_config: {
      format: {
        type: "json_schema", 
        schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "your name",
            },
            city: {
              type: "string",
              description: "where your city",
            },
            desc: {
              type: "string",
              description: "description about yourself",
            },
          },
          required: ["name", "city", "desc"],
          additionalProperties: false,
        },
      },
    },
  });

  // 5. Get structured JSON directly
  const result = JSON.parse(message.content[0].text);
  console.log(result);
}

main();
```

bash

```
curl https://zenmux.ai/api/anthropic/v1/messages \
  -H "x-api-key: $ZENMUX_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Hi, who are you? Describe yourself using about 50 words."
      }
    ],
    "output_config": {
      "format": {
        "type": "json_schema",
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "description": "your name" },
            "city": { "type": "string", "description": "where your city" },
            "desc": { "type": "string", "description": "description about yourself" }
          },
          "required": ["name", "city", "desc"],
          "additionalProperties": false
        }
      }
    }
  }'
```

**Example Output**

A valid JSON payload is returned in `response.content[0].text`:

json

```
{
  "name": "Claude",
  "city": "San Francisco",
  "desc": "I am Claude, an AI assistant made by Anthropic. I help with analysis, writing, coding, and answering questions. I aim to be helpful, harmless, and honest in all interactions."
}
```

### Option 2: Tool Calling (Tool Use) [​](#option-2-tool-calling-tool-use)

You can also obtain structured data that conforms to a specified JSON Schema by defining a tool and forcing the model to call it.

**How it works**

1. Define a tool whose `input_schema` describes your expected output structure
2. Set `tool_choice` to `{"type": "tool", "name": "tool-name"}` to force the model to call that tool
3. Extract the structured data from the returned `tool_use` content block

PythonTypeScriptcURL

python

```
import anthropic

# 1. Initialize the Anthropic client
client = anthropic.Anthropic(
    # 2. Replace with the API Key from the ZenMux user console
    api_key="<your ZENMUX_API_KEY>", 
    # 3. Point the base URL to the ZenMux endpoint
    base_url="https://zenmux.ai/api/anthropic"
)

# 4. Define a tool to describe the expected output structure
tools = [
    {
        "name": "introduce_yourself", 
        "description": "Introduce yourself with structured information",
        "strict": True, # Enable strict mode to ensure parameter types are correct
        "input_schema": { 
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "your name"
                },
                "city": {
                    "type": "string",
                    "description": "where your city"
                },
                "desc": {
                    "type": "string",
                    "description": "description about yourself"
                }
            },
            "required": ["name", "city", "desc"],
            "additionalProperties": False
        }
    }
]

# 5. Send the request and force tool invocation
message = client.messages.create(
    model="anthropic/claude-sonnet-4.5", 
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "tool", "name": "introduce_yourself"}, 
    messages=[
        {
            "role": "user",
            "content": "Hi, who are you? Describe yourself using about 50 words."
        }
    ]
)

# 6. Extract structured output
for block in message.content:
    if block.type == "tool_use":
        print(block.input)  # Structured JSON data
```

ts

```
import Anthropic from "@anthropic-ai/sdk";

// 1. Initialize the Anthropic client
const anthropic = new Anthropic({
  // 2. Replace with the API Key from the ZenMux user console
  apiKey: "<your ZENMUX_API_KEY>", 
  // 3. Point the base URL to the ZenMux endpoint
  baseURL: "https://zenmux.ai/api/anthropic", 
});

async function main() {
  // 4. Define a tool to describe the expected output structure
  const tools = [
    {
      name: "introduce_yourself", 
      description: "Introduce yourself with structured information",
      strict: true, // Enable strict mode to ensure parameter types are correct
      input_schema: {
        type: "object" as const,
        properties: {
          name: {
            type: "string",
            description: "your name",
          },
          city: {
            type: "string",
            description: "where your city",
          },
          desc: {
            type: "string",
            description: "description about yourself",
          },
        },
        required: ["name", "city", "desc"],
        additionalProperties: false,
      },
    },
  ];

  // 5. Send the request and force tool invocation
  const message = await anthropic.messages.create({
    model: "anthropic/claude-sonnet-4.5", 
    max_tokens: 1024,
    tools: tools,
    tool_choice: { type: "tool", name: "introduce_yourself" }, 
    messages: [
      {
        role: "user",
        content: "Hi, who are you? Describe yourself using about 50 words.",
      },
    ],
  });

  // 6. Extract structured output
  for (const block of message.content) {
    if (block.type === "tool_use") {
      console.log(block.input); // Structured JSON data
    }
  }
}

main();
```

bash

```
curl https://zenmux.ai/api/anthropic/v1/messages \
  -H "x-api-key: $ZENMUX_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
    "max_tokens": 1024,
    "tools": [
      {
        "name": "introduce_yourself",
        "description": "Introduce yourself with structured information",
        "strict": true,
        "input_schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "description": "your name" },
            "city": { "type": "string", "description": "where your city" },
            "desc": { "type": "string", "description": "description about yourself" }
          },
          "required": ["name", "city", "desc"],
          "additionalProperties": false
        }
      }
    ],
    "tool_choice": { "type": "tool", "name": "introduce_yourself" },
    "messages": [
      {
        "role": "user",
        "content": "Hi, who are you? Describe yourself using about 50 words."
      }
    ]
  }'
```

### Comparison [​](#comparison)

| Feature | JSON Output (`output_config`) | Tool Calling (Tool Use) |
| --- | --- | --- |
| Parameter location | `output_config.format` | `tools` + `tool_choice` |
| Output location | `content[0].text` | `content[x].input` (tool\_use block) |
| Best for | Getting a structured response directly | Scenarios where tools must be used as well |
| Complexity | Simpler | Requires tool-calling handling |
| Recommendation | ✅ Recommended | Use for specific scenarios |

## Google Vertex AI API [​](#google-vertex-ai-api)

Google Vertex AI (Gemini models) implements structured outputs via `responseMimeType` and `responseSchema` inside `config`.

### Parameter Reference [​](#parameter-reference-2)

**config.responseMimeType**

* `text/plain` (default): plain text output
* `application/json`: JSON output

**config.responseSchema**

* JSON Schema that defines the output structure (must be used with `responseMimeType: "application/json"`)

### API Call Examples [​](#api-call-examples-2)

PythonTypeScript

python

```
from google import genai
from google.genai import types

# 1. Initialize the GenAI client
client = genai.Client(
    api_key="<your ZENMUX_API_KEY>", 
    vertexai=True,
    http_options=types.HttpOptions(
        api_version='v1',
        base_url='https://zenmux.ai/api/vertex-ai'
    ),
)

# 2. Define the output schema
response_schema = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "your name"
        },
        "city": {
            "type": "string",
            "description": "where your city"
        },
        "desc": {
            "type": "string",
            "description": "description"
        }
    },
    "required": ["name", "city", "desc"]
}

# 3. Send the request
response = client.models.generate_content(
    model="google/gemini-2.5-pro", 
    contents="Hi, who are you? Describe yourself using about 50 words.",
    config=types.GenerateContentConfig(
        response_mime_type="application/json", 
        response_schema=response_schema 
    )
)

print(response.text)
```

ts

```
import { GoogleGenAI } from "@google/genai";

// 1. Initialize the GenAI client
const client = new GoogleGenAI({
  apiKey: "<your ZENMUX_API_KEY>", 
  vertexai: true,
  httpOptions: {
    baseUrl: "https://zenmux.ai/api/vertex-ai", 
    apiVersion: "v1",
  },
});

async function main() {
  // 2. Define the output schema
  const responseSchema = {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "your name",
      },
      city: {
        type: "string",
        description: "where your city",
      },
      desc: {
        type: "string",
        description: "description",
      },
    },
    required: ["name", "city", "desc"],
  };

  // 3. Send the request
  const response = await client.models.generateContent({
    model: "google/gemini-2.5-pro", 
    contents: "Hi, who are you? Describe yourself using about 50 words.",
    config: {
      responseMimeType: "application/json", 
      responseSchema: responseSchema, 
    },
  });

  console.log(response.text);
}

main();
```

### Using Enum Types [​](#using-enum-types)

Vertex AI also supports the `text/x.enum` MIME type for classification tasks, where the output will be one of the enum values defined in the schema:

python

```
from google import genai
from google.genai import types

client = genai.Client(
    api_key="<你的 ZENMUX_API_KEY>",
    vertexai=True,
    http_options=types.HttpOptions(
        api_version='v1',
        base_url='https://zenmux.ai/api/vertex-ai'
    ),
)

# Enum schema
sentiment_schema = {
    "type": "string",
    "enum": ["positive", "negative", "neutral"]
}

response = client.models.generate_content(
    model="google/gemini-2.5-flash",
    contents="Analyze the sentiment: 'I love this product!'",
    config=types.GenerateContentConfig(
        response_mime_type="text/x.enum", 
        response_schema=sentiment_schema
    )
)

print(response.text)  # Output: positive
```

---

