import { NextResponse } from "next/server";

const SUPPORTED_PROVIDERS = [
  { id: "anthropic", name: "Anthropic (Claude)", defaultModel: "claude-sonnet-4-20250514" },
  { id: "openai", name: "OpenAI (GPT)", defaultModel: "gpt-4o" },
  { id: "gemini", name: "Google (Gemini)", defaultModel: "gemini-2.5-flash" },
];

export async function GET() {
  return NextResponse.json({
    providers: SUPPORTED_PROVIDERS,
    presetCompanions: [
      { id: "preset_socrates", name: "苏格拉底" },
      { id: "preset_zhugeliang", name: "诸葛亮" },
      { id: "preset_wangyangming", name: "王阳明" },
    ],
    features: {
      diary: true,
      groupchat: true,
      flashcards: true,
      textbookUpload: true,
    },
  });
}
