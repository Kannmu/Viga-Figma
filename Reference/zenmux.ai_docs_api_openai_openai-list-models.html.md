# Table of Contents

- [API | ZenMux | Documentation](#api-zenmux-documentation)

---

# API | ZenMux | Documentation

> Source: [https://zenmux.ai/docs/api/openai/openai-list-models.html](https://zenmux.ai/docs/api/openai/openai-list-models.html)

# List Models [​](#list-models)

```
GET https://zenmux.ai/api/v1/models
```

This endpoint is used to retrieve information about the OpenAI-compatible models supported by the platform.

## Request params [​](#request-params)

This endpoint does not require any request parameters.

## Returns [​](#returns)

Returns a JSON object containing information for all available models.

#### data `array` [​](#data-array)

An array of models, containing detailed information for all available models.

#### object `string` [​](#object-string)

The object type, fixed as `"list"`.

### data object [​](#data-object)

#### id `string` [​](#id-string)

The model’s unique identifier, in the format `<provider>/<model_name>`.

#### object `string` [​](#object-string-1)

The object type, fixed as `"model"`.

#### display\_name `string` [​](#display-name-string)

The model’s display name, used for UI presentation.

#### created `integer` [​](#created-integer)

The model creation timestamp (Unix timestamp).

#### owned\_by `string` [​](#owned-by-string)

The model provider.

#### input\_modalities `array` [​](#input-modalities-array)

The input modalities supported by the model. Possible values include:

* `"text"` - Text input
* `"image"` - Image input
* `"video"` - Video input
* `"audio"` - Audio input
* `"file"` - File input

#### output\_modalities `array` [​](#output-modalities-array)

The output modalities supported by the model. Possible values include:

* `"text"` - Text output
* `"image"` - Image output
* `"video"` - Video output
* `"audio"` - Audio output
* `"file"` - File output

#### capabilities `object` [​](#capabilities-object)

The model’s capabilities.

##### capabilities.reasoning `boolean` [​](#capabilities-reasoning-boolean)

Whether reasoning is supported. `true` means reasoning is supported; `false` means it is not.

#### context\_length `integer` [​](#context-length-integer)

The context length limit, i.e., the maximum number of tokens the model can process.

#### pricings `object` [​](#pricings-object)

The pricing object, containing pricing configurations for different types of usage.

##### pricings.prompt `array` [​](#pricings-prompt-array)

Pricing configuration array for processing input text.

##### pricings.completion `array` [​](#pricings-completion-array)

Pricing configuration array for generated output text.

##### pricings.input\_cache\_read `array` [​](#pricings-input-cache-read-array)

Pricing configuration array for reading input data from cache.

##### pricings.input\_cache\_write\_5\_min `array` [​](#pricings-input-cache-write-5-min-array)

Pricing configuration array for writing to cache with a 5-minute retention.

##### pricings.input\_cache\_write\_1\_h `array` [​](#pricings-input-cache-write-1-h-array)

Pricing configuration array for writing to cache with a 1-hour retention.

##### pricings.input\_cache\_write `array` [​](#pricings-input-cache-write-array)

Pricing configuration array for writing to cache.

##### pricings.web\_search `array` [​](#pricings-web-search-array)

Pricing configuration array for invoking web search (optional; supported by some models).

##### pricings.internal\_reasoning `array` [​](#pricings-internal-reasoning-array)

Pricing configuration array for the model’s internal reasoning process (optional; supported by some advanced reasoning models). Additional charges apply when the model enables internal chain-of-thought or detailed reasoning processes.

##### pricings.video `array` [​](#pricings-video-array)

Pricing configuration array for video output processing (optional; models that support video understanding). Billed by video duration, resolution, or frame count.

##### pricings.image `array` [​](#pricings-image-array)

Pricing configuration array for image output processing (optional; models that support image understanding). Typically billed by image count, resolution, or pixel count.

##### pricings.audio `array` [​](#pricings-audio-array)

Pricing configuration array for audio output processing (optional; models that support audio understanding). Billed by audio duration or processing volume.

##### pricings.audio\_and\_video `array` [​](#pricings-audio-and-video-array)

Pricing configuration array for generating video content with audio (optional; models that support multimodal audio-video understanding). Applies to scenarios that require analyzing both video frames and audio content. Note: there are two video generation scenarios—silent video uses `pricings.video`, while video with audio uses `pricings.audio_and_video`.

### Pricing item schema [​](#pricing-item-schema)

Each pricing array within the `pricings` object (such as `completion`, `prompt`, etc.) contains one or more pricing configuration objects. Each pricing configuration object includes the following fields:

#### value `number` [​](#value-number)

The discounted effective price. Free services show as 0.

#### unit `string` [​](#unit-string)

The pricing unit. Possible values include:

* `"perMTokens"` - Per million tokens
* `"perCount"` - Per call
* `"perSecond"` - Per second (for time-based billing scenarios such as audio and video)

#### currency `string` [​](#currency-string)

The currency type, fixed as `"USD"`, meaning US dollars.

#### conditions `object` [​](#conditions-object)

Pricing conditions (optional), commonly used for tiered pricing.

##### conditions.prompt\_tokens `object` [​](#conditions-prompt-tokens-object)

Token-usage condition for the input content provided by the user.

##### conditions.completion\_tokens `object` [​](#conditions-completion-tokens-object)

Token-usage condition for tokens consumed when the model generates the response.

#### Pricing conditions schema [​](#pricing-conditions-schema)

When a pricing configuration includes the `conditions` field, it defines the specific conditions under which the price applies. The condition objects for `prompt_tokens` and `completion_tokens` include the following fields:

##### unit `string` [​](#unit-string-1)

The token unit, fixed as `"kTokens"`, meaning thousand tokens (1000 tokens).

##### gte `number` [​](#gte-number)

Minimum token count (inclusive). The actual token count must be ≥ this value.

#### lte `number` [​](#lte-number)

Maximum token count (inclusive). The actual token count must be ≤ this value.

#### gt `number` [​](#gt-number)

Minimum token count (exclusive). The actual token count must be > this value.

##### lt `number` [​](#lt-number)

Maximum token count (exclusive). The actual token count must be < this value; null indicates no upper bound.

json

json

```
{
  "data": [
    {
      "id": "anthropic/claude-sonnet-4.5",
      "object": "model",
      "display_name": "Anthropic: Claude Sonnet 4.5",
      "created": 1759196009,
      "owned_by": "anthropic",
      "input_modalities": ["text", "image", "file"],
      "output_modalities": ["text"],
      "capabilities": {
        "reasoning": true
      },
      "context_length": 200000,
      "pricings": {
        "completion": [
          {
            "value": 15,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 0,
                "lt": 200
              }
            }
          },
          {
            "value": 22.5,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 200
              }
            }
          }
        ],
        "input_cache_read": [
          {
            "value": 0.3,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 0,
                "lt": 200
              }
            }
          },
          {
            "value": 0.6,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 200
              }
            }
          }
        ],
        "input_cache_write_1_h": [
          {
            "value": 6,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 0,
                "lt": 200
              }
            }
          },
          {
            "value": 12,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 200
              }
            }
          }
        ],
        "input_cache_write_5_min": [
          {
            "value": 3.75,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 0,
                "lt": 200
              }
            }
          },
          {
            "value": 7.5,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 200
              }
            }
          }
        ],
        "prompt": [
          {
            "value": 3,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 0,
                "lt": 200
              }
            }
          },
          {
            "value": 6,
            "unit": "perMTokens",
            "currency": "USD",
            "conditions": {
              "prompt_tokens": {
                "unit": "kTokens",
                "gte": 200
              }
            }
          }
        ],
        "web_search": [
          {
            "value": 0.01,
            "unit": "perCount",
            "currency": "USD"
          }
        ]
      }
    },
    {
      "id": "openai/gpt-5.2",
      "object": "model",
      "display_name": "OpenAI: GPT-5.2",
      "created": 1765438613,
      "owned_by": "openai",
      "input_modalities": ["image", "text", "file"],
      "output_modalities": ["text"],
      "capabilities": {
        "reasoning": true
      },
      "context_length": 400000,
      "pricings": {
        "completion": [
          {
            "value": 14,
            "unit": "perMTokens",
            "currency": "USD"
          }
        ],
        "input_cache_read": [
          {
            "value": 0.175,
            "unit": "perMTokens",
            "currency": "USD"
          }
        ],
        "prompt": [
          {
            "value": 1.75,
            "unit": "perMTokens",
            "currency": "USD"
          }
        ],
        "web_search": [
          {
            "value": 0.01,
            "unit": "perCount",
            "currency": "USD"
          }
        ]
      }
    }
  ],
  "object": "list"
}
```

cURL

cURL

```
curl https://zenmux.ai/api/v1/models
```

---

