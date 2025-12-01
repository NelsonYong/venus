# Image Generation Support

This document describes how to use image generation models in the application.

## Overview

The application now supports image generation models like `gpt-image-1`, `dall-e-3`, `dall-e-2`, and other OpenAI-compatible image generation APIs.

## How It Works

### Model Detection

The system automatically detects whether a model is an image generation model based on its name. Models matching these patterns are treated as image models:

- `dall-e`
- `dalle`
- `gpt-image`
- `imagen`
- `stable-diffusion`
- `midjourney`
- `flux`
- `/image`
- `-image-`

### Automatic Routing

When you select an image generation model in the chat interface, the system automatically:

1. Detects that it's an image model
2. Routes the request to the image generation API instead of the text generation API
3. Extracts the prompt from your message
4. Generates the image using the AI SDK's `generateImage` function
5. Returns the image as part of the chat response

## API Endpoints

### Chat API (Automatic Detection)

**Endpoint:** `POST /api/chat`

When you use an image generation model through the chat interface, it automatically handles the image generation:

```typescript
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "A beautiful sunset over mountains"
        }
      ]
    }
  ],
  "userId": "user-123",
  "modelId": "gpt-image-1"
}
```

### Direct Image Generation API

**Endpoint:** `POST /api/generate-image`

For more control over image generation parameters:

```typescript
{
  "prompt": "A beautiful sunset over mountains",
  "userId": "user-123",
  "modelId": "gpt-image-1",
  "size": "1024x1024",        // Optional: specific size
  "aspectRatio": "16:9",      // Optional: aspect ratio (alternative to size)
  "n": 1,                     // Optional: number of images to generate
  "seed": 1234567890,         // Optional: seed for reproducibility
  "providerOptions": {        // Optional: provider-specific options
    "openai": {
      "style": "vivid",
      "quality": "hd"
    }
  }
}
```

**Response:**

```typescript
{
  "success": true,
  "images": [
    {
      "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
      "providerMetadata": { /* provider-specific metadata */ }
    }
  ],
  "warnings": [],
  "providerMetadata": { /* overall metadata */ }
}
```

## Supported Models

### OpenAI Models

- `dall-e-3`: High-quality image generation
- `dall-e-2`: Fast image generation with multiple image support
- `gpt-image-1`: Latest image generation model (if available)
- `gpt-image-1-mini`: Faster, smaller version

### Custom Models

You can configure any OpenAI-compatible image generation API by:

1. Adding a new AI provider in your settings
2. Configuring the API endpoint
3. Using a model name that matches one of the image model patterns

## Configuration

### Environment Variables

For preset OpenAI models:

```env
OPENAI_API_KEY=your-api-key
```

### Custom Providers

Add custom image generation providers through the UI:

1. Go to Settings → AI Providers
2. Add a new provider
3. Set the provider type to `openai` (or custom)
4. Configure the API endpoint
5. Add the API key
6. The system will auto-discover image models

## Examples

### Basic Image Generation

```typescript
// Chat interface automatically handles this
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'A cat wearing sunglasses' }]
      }
    ],
    userId: 'user-123',
    modelId: 'dall-e-3'
  })
});
```

### Advanced Image Generation

```typescript
// Direct API for more control
const response = await fetch('/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A futuristic city at night',
    userId: 'user-123',
    modelId: 'dall-e-3',
    size: '1792x1024',
    providerOptions: {
      openai: {
        style: 'vivid',
        quality: 'hd'
      }
    }
  })
});
```

### Multiple Images

```typescript
const response = await fetch('/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Abstract art',
    userId: 'user-123',
    modelId: 'dall-e-2',
    n: 4  // Generate 4 images
  })
});
```

## Billing

Image generation is tracked for billing purposes:

- Each image generation counts as tokens (estimated)
- Non-preset models are subject to billing limits
- Usage is recorded in the billing system

## Error Handling

Common errors:

- `400 Bad Request`: Missing prompt or invalid parameters
- `401 Unauthorized`: Missing or invalid user ID
- `404 Not Found`: Model not found or not accessible
- `429 Too Many Requests`: Billing limit exceeded
- `500 Internal Server Error`: Image generation failed

## Implementation Details

### Model Adapter

The `createImageModelAdapter` function in `lib/model-adapter.ts` creates the appropriate image model client based on the provider:

```typescript
export function createImageModelAdapter(config: ModelConfig) {
  const provider = config.provider.toLowerCase();
  
  switch (provider) {
    case 'openai':
      const openaiClient = createOpenAI({
        apiKey: config.isPreset ? process.env.OPENAI_API_KEY : config.apiKey,
        baseURL: config.isPreset ? undefined : config.apiEndpoint,
      });
      return openaiClient.image(config.name);
    
    default:
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiEndpoint,
      });
      return client.image(config.name);
  }
}
```

### Image Model Detection

The `isImageModel` function checks if a model name matches known image generation patterns:

```typescript
export function isImageModel(modelName: string): boolean {
  const lowerName = modelName.toLowerCase();
  return IMAGE_MODEL_PATTERNS.some(pattern => lowerName.includes(pattern));
}
```

## Future Enhancements

- [ ] Support for image editing (DALL-E variations)
- [ ] Support for image upscaling
- [ ] Image history and gallery
- [ ] Batch image generation
- [ ] Advanced prompt engineering tools
- [ ] Integration with other image models (Midjourney, Stable Diffusion)

