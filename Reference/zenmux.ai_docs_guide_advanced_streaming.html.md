# Table of Contents

- [Streaming | ZenMux | Documentation](#streaming-zenmux-documentation)

---

# Streaming | ZenMux | Documentation

> Source: [https://zenmux.ai/docs/guide/advanced/streaming.html](https://zenmux.ai/docs/guide/advanced/streaming.html)

# Streaming [​](#streaming)

ZenMux allows any model to return generated results incrementally in a streaming fashion, rather than returning the full response at once. Streaming output lets users see the first token from the model immediately, reducing wait time. This can significantly improve user experience, especially for real-time conversations and long-form generation.

You can enable streaming output by setting the `stream` parameter to `true` in your request. Below are two example approaches:

## Method 1: Use the OpenAI-compatible API (Recommended) [​](#method-1-use-the-openai-compatible-api-recommended)

PythonTypeScript

python

```
from openai import OpenAI

client = OpenAI(
    base_url="https://zenmux.ai/api/v1",
    api_key="<your ZENMUX_API_KEY>", 
)

stream = client.chat.completions.create(
    model="openai/gpt-5",
    messages=[
        {
            "role": "user",
            "content": "What is the meaning of life?" 
        }
    ],
    # Enable streaming mode by setting stream=True
    stream=True, 
)

# When streaming mode (stream=True) is enabled, the response shape changes.
# You need to iterate over the stream and consume each individual chunk
for chunk in stream: 
	delta = chunk.choices[0].delta # <-- Use the delta field
 
	if delta.content:
		print(delta.content, end="")
```

ts

```
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://zenmux.ai/api/v1",
  apiKey: "<your ZENMUX_API_KEY>", 
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "openai/gpt-5",
    messages: [
      {
        role: "user",
        content: "What is the meaning of life?",
      },
    ],
    // Enable streaming mode by setting stream: true
    stream: true, 
  });

  // When streaming mode (stream: true) is enabled, the response shape changes.
  // You need to iterate over the stream and consume each individual chunk
  for await (chunk of stream) { 
    delta = chunk.choices[0].delta // <-- Use the delta field
    
    if (delta.content) {
        console.log(delta.content)
    }
  }
}

main();
```

---

## Method 2: Call the ZenMux API Directly [​](#method-2-call-the-zenmux-api-directly)

Python (httpx)TypeScript (fetch)Shell (cURL)

python

```
import httpx
import json

async def stream_openai_chat_completion():
    api_key = "<your ZENMUX_API_KEY>"
    headers = {
        "Authorization": f"Bearer {api_key}",
    }
    payload = {
        "model": "openai/gpt-5",
        "messages": [
            {
                "role": "user",
                "content": "What is the meaning of life?"
            }
        ],
        "stream": True
    }

    async with httpx.AsyncClient() as client:
        async with client.stream(method="POST", url="https://zenmux.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=None) as response:
            response.raise_for_status()

            async for chunk in response.aiter_bytes():
                decoded_chunk = chunk.decode('utf-8')
                print(decoded_chunk)

if __name__ == "__main__":
    import asyncio
    asyncio.run(stream_openai_chat_completion())
```

typescript

```
fetch("https://zenmux.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer <your ZENMUX_API_KEY>", 
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "openai/gpt-5", 
    messages: [
      {
        role: "user",
        content: "What is the meaning of life?",
      },
    ],
    stream: true
  }),
})
  .then(async (response) => {
    const textDecoder = new TextDecoder();
    for await (const chunk of response.body) {
      const textChunk = textDecoder.decode(chunk);
      console.log(textChunk)
    }
  })
```

bash

```
curl "https://zenmux.ai/api/v1/chat/completions" \
  -H "Content-Type: application/json" \ 
  -H "Authorization: Bearer $ZENMUX_API_KEY" \
  -d '{  
    "model": "openai/gpt-5", 
    "messages": [ 
      { 
        "role": "user", 
        "content": "What is the meaning of life?" 
      } 
    ], 
    "stream": true
  }'
```

---

