import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db, getUserKey } from "@/lib/db";
import { companions, worlds } from "@/lib/db/schema";
import { buildGroupChatPrompt } from "@/lib/llm/prompt-templates";
import { streamChat } from "@/lib/llm";
import { decrypt } from "@/lib/utils/encryption";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { topic, provider } = await req.json();
  if (!topic) return new Response("Missing topic", { status: 400 });

  const keyEntry = getUserKey(session.userId, provider);
  if (!keyEntry) {
    return new Response("请先在设置页面配置 API Key", { status: 400 });
  }
  const apiKey = await decrypt(keyEntry.encryptedKey);

  const userCompanions = db.select().from(companions)
    .where(eq(companions.userId, session.userId))
    .all();

  if (userCompanions.length < 2) {
    return new Response("需要至少两位同伴才能开始群聊", { status: 400 });
  }

  const world = db.select().from(worlds)
    .where(eq(worlds.userId, session.userId))
    .all()[0];

  const recentTopics = world?.narrativeMd?.slice(0, 500) || topic;

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "start", companions: userCompanions.map(c => ({ id: c.id, name: c.name })) });

        for (let i = 0; i < userCompanions.length; i++) {
          const c = userCompanions[i];
          const prompt = buildGroupChatPrompt(c.name, c.personaMd, recentTopics);

          const contextMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
            { role: "system", content: prompt },
          ];

          if (i === 0) {
            contextMessages.push({
              role: "user",
              content: `群聊主题：${topic}\n\n请你以${c.name}的身份，围绕这个主题在群里第一个发言，开启讨论。`
            });
          } else {
            contextMessages.push({
              role: "user",
              content: `群聊主题：${topic}\n\n前面已经有人发言了。请你以${c.name}的身份，自然地接话——可以补充、提问、或温和地提出不同角度。保持轻松自然的群聊氛围。`
            });
          }

          let responseText = "";
          send({ type: "speaking", companionId: c.id, companionName: c.name });

          await streamChat(
            { provider: keyEntry.provider, apiKey, model: keyEntry.model || undefined, baseUrl: keyEntry.baseUrl || undefined },
            contextMessages,
            (text) => {
              responseText += text;
              send({ type: "chunk", companionId: c.id, companionName: c.name, text });
            },
            req.signal
          );

          send({ type: "done_speaking", companionId: c.id, companionName: c.name, fullText: responseText });
        }

        send({ type: "done" });
        controller.close();
      } catch (error) {
        send({ type: "error", error: String(error) });
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
