import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface LLMConfig {
  provider: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-v4-pro",
  qwen: "qwen-plus",
  minimax: "MiniMax-M2.7",
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  moonshot: "https://api.moonshot.cn/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  grok: "https://api.x.ai/v1",
  minimax: "https://api.minimaxi.com/v1",
};

export async function chat(
  config: LLMConfig,
  messages: { role: "user" | "assistant" | "system"; content: string }[],
): Promise<string> {
  let fullText = "";
  await streamChat(config, messages, (text) => { fullText += text; });
  return fullText;
}

export async function streamChat(
  config: LLMConfig,
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const provider = config.provider.toLowerCase();
  const model = config.model || DEFAULT_MODELS[provider] || "gpt-4o";

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: config.apiKey });
    const systemMsg = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const stream = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemMsg?.content,
      messages: chatMessages,
      stream: true,
    });

    let fullText = "";
    for await (const event of stream) {
      if (signal?.aborted) break;
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
    }
    return fullText;
  }

  if (provider === "gemini") {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const genModel = genAI.getGenerativeModel({ model });

    const systemMsg = messages.find(m => m.role === "system");
    const history = messages.filter(m => m.role !== "system").slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const lastMsg = messages.filter(m => m.role !== "system").slice(-1)[0];

    const chat = genModel.startChat({
      systemInstruction: systemMsg?.content,
      history,
    });

    const result = await chat.sendMessageStream(lastMsg.content);
    let fullText = "";
    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      const text = chunk.text();
      fullText += text;
      onChunk(text);
    }
    return fullText;
  }

  // OpenAI-compatible (openai, deepseek, qwen, moonshot, zhipu, grok, custom...)
  const baseUrl = config.baseUrl || DEFAULT_BASE_URLS[provider];
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: baseUrl });
  const oaiStream = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    stream: true,
    max_tokens: 4096,
  });

  let fullText = "";
  for await (const chunk of oaiStream) {
    if (signal?.aborted) break;
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      onChunk(delta);
    }
  }
  return fullText;
}
