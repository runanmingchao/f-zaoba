import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db, getUserKey } from "@/lib/db";
import { companions, worlds, conversations, messages, textbooks, exercises } from "@/lib/db/schema";
import { buildSocraticPrompt } from "@/lib/llm/prompt-templates";
import { streamChat } from "@/lib/llm";
import { decrypt } from "@/lib/utils/encryption";
import { nanoid } from "nanoid";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { companionId, companionIds, message, conversationId, textbookId, worldId, provider, mode: rawMode } = await req.json();

  // Resolve to normalized array (1-3 companions)
  const ids: string[] = companionIds || (companionId ? [companionId] : []);
  if (ids.length === 0 || ids.length > 3 || !message) {
    return new Response("Need 1-3 companionIds and message", { status: 400 });
  }

  // Fetch all requested companions
  const selectedCompanions = db.select().from(companions)
    .where(inArray(companions.id, ids))
    .all();

  if (selectedCompanions.length !== ids.length) {
    return new Response("Some companions not found", { status: 404 });
  }

  // Maintain original order
  const ordered = ids.map(id => selectedCompanions.find(c => c.id === id)!);

  // Get world narrative (use specified world, or first available)
  let worldNarrative = "";
  if (worldId) {
    const w = db.select().from(worlds)
      .where(and(eq(worlds.id, worldId), eq(worlds.userId, session.userId)))
      .all()[0];
    worldNarrative = w?.narrativeMd || "";
  } else {
    const first = db.select().from(worlds)
      .where(eq(worlds.userId, session.userId))
      .all()[0];
    worldNarrative = first?.narrativeMd || "";
  }

  // Get textbook content & exercises
  let textbookContent = "";
  let exerciseList: { id: string; question: string; answer: string; topic: string | null }[] = [];
  if (textbookId) {
    const tb = db.select().from(textbooks)
      .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
      .all()[0];
    if (tb?.parsedContent) textbookContent = tb.parsedContent.slice(0, 8000);

    exerciseList = db.select().from(exercises)
      .where(and(eq(exercises.textbookId, textbookId), eq(exercises.userId, session.userId)))
      .all();
  }

  // Get API key
  const keyEntry = getUserKey(session.userId, provider);
  if (!keyEntry) {
    return new Response("请先在设置页面配置 API Key", { status: 400 });
  }
  const apiKey = await decrypt(keyEntry.encryptedKey);

  // Create or get conversation
  let convId = conversationId;
  let mode = (rawMode as string) || "progressive";
  if (!convId) {
    convId = nanoid();
    db.insert(conversations).values({
      id: convId,
      userId: session.userId,
      companionId: ids[0],
      worldId: worldId || null,
      title: message.slice(0, 50),
      mode: mode as "progressive" | "aggressive" | "exercise",
    }).run();
  } else {
    const existing = db.select({ mode: conversations.mode }).from(conversations)
      .where(eq(conversations.id, convId))
      .all()[0];
    if (existing?.mode) mode = existing.mode;
  }

  // Exercise mode requires exercises; fall back to aggressive if none
  if (mode === "exercise" && exerciseList.length === 0) {
    mode = "aggressive";
  }

  // Save user message (without companionId)
  db.insert(messages).values({
    id: nanoid(),
    conversationId: convId,
    role: "user",
    content: message,
  }).run();

  // Build conversation history (for context)
  const rawHistory = db.select().from(messages)
    .where(eq(messages.conversationId, convId))
    .all()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Exclude last user message from history to avoid duplication with the explicit message below
  const historyForLLM = rawHistory.slice(0, -1).slice(-29)
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Round-robin: pick the next teacher based on who spoke last
  const lastAssistant = [...rawHistory].reverse().find(m => m.role === "assistant" && m.companionId);
  let nextIndex = 0;
  if (lastAssistant?.companionId) {
    const lastIdx = ordered.findIndex(c => c.id === lastAssistant.companionId);
    if (lastIdx >= 0) nextIndex = (lastIdx + 1) % ordered.length;
  }
  const currentCompanion = ordered[nextIndex];

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "start", companions: ordered.map(c => ({ id: c.id, name: c.name })) });

        const llmConfig = {
          provider: keyEntry.provider, apiKey,
          model: keyEntry.model || undefined,
          baseUrl: keyEntry.baseUrl || undefined,
        };

        // Speak for a single companion, return the full response text
        async function speakForCompanion(companion: { id: string; name: string; personaMd: string }, isBonus: boolean): Promise<string> {
          const names = ordered.map(c => c.name);
          let systemPrompt = buildSocraticPrompt(companion.personaMd, worldNarrative);

          const otherNames = names.filter(n => n !== companion.name);
          if (otherNames.length > 0) {
            if (isBonus) {
              systemPrompt += `\n\n## 共同教学\n你正在与${otherNames.join("、")}一起进行圆桌教学。刚才另一位老师特意邀请你补充发言，请你从自己的角度简短补充。补充完后把话题抛回给学生。`;
            } else {
              systemPrompt += `\n\n## 共同教学\n你正在与${otherNames.join("、")}一起进行圆桌教学。你们轮流发言。现在轮到你了。偶尔（极少情况下）你可以在回复末尾邀请另一位老师补充一句——但只能偶尔这样做。通常情况直接结束并抛回问题给学生。`;
            }
          }

          if (textbookContent) {
            systemPrompt += `\n\n## 当前学习教材\n\n学生正在学习以下教材内容，请围绕教材内容展开苏格拉底式对话：\n\n${textbookContent}`;
          }

          if (exerciseList.length > 0) {
            const exSummary = exerciseList.map((e, i) =>
              `${i + 1}. [${e.topic || "综合"}] ${e.question}` +
              (e.answer ? `\n   参考答案：${e.answer.slice(0, 150)}${e.answer.length > 150 ? "…" : ""}` : "")
            ).join("\n\n");

            systemPrompt += `\n\n## 可用习题库（${exerciseList.length}题）\n\n以下是与该教材配套的习题。请在教学中适时使用：\n- 当学生掌握了一个知识点后，从题库中选一道相关题目来测试他\n- 不要直接给答案，用苏格拉底式追问引导他思考\n- 题目编号和知识点标签可帮你快速筛选\n\n${exSummary}\n\n**出题规则：** 你不需要一次用完所有题。根据教学节奏，在合适的时机选1道题考学生。每节课出1-3道题即可。出题时要说"让我们来做一道练习"之类的过渡语。`;
          }

          // Mode-specific instructions
          if (mode === "aggressive") {
            systemPrompt += `\n\n## 教学模式：快节奏研讨\n\n学生已经预习过本节内容，掌握了基本概念。你的教学节奏应该明显加快：\n- 不要从零开始解释概念，直接进入深层讨论\n- 减少铺垫性提问，多问"为什么"和"所以呢"类的高阶问题\n- 可以适度给出总结性陈述，而不是每个知识点都用问题引导\n- 仍然保持苏格拉底式的思辨精神，但节奏紧凑\n- 每次回复控制在较短篇幅，让学生有更多发言机会`;
          } else if (mode === "exercise") {
            systemPrompt += `\n\n## 教学模式：习题课\n\n学生已经学完本章内容，现在进入习题练习阶段。你的角色从引导者转变为习题教练。\n\n规则：\n1. **选一道题** — 从上面的"可用习题库"中选一道题，把题目展示给学生。每次只出一道。\n2. **等学生回答** — 学生提交答案后，判断对错：\n   - 如果正确：给予肯定，简要总结该题涉及的知识点，然后进入下一题\n   - 如果错误：不要直接给答案，指出问题所在，引导重新思考；如果学生仍然不会，给出详细讲解和正确答案\n3. **循环推进** — 讲完一道，出下一道。每节课完成3-5道题。\n4. **选题策略** — 从简单到困难，从核心知识点到边缘应用，逐步递进\n5. 仍然保持你的先贤人设和语气风格\n6. 如果学生表示不想继续做题了，做一个简短的课堂总结后结束`;
          }

          let text = "";
          send({ type: "speaking", companionId: companion.id, companionName: companion.name });

          await streamChat(llmConfig, [
            { role: "system", content: systemPrompt },
            ...historyForLLM,
            { role: "user", content: message },
          ], (chunk) => {
            text += chunk;
            send({ type: "chunk", companionId: companion.id, companionName: companion.name, text: chunk });
          }, req.signal);

          db.insert(messages).values({
            id: nanoid(),
            conversationId: convId,
            companionId: companion.id,
            role: "assistant",
            content: text,
          }).run();

          historyForLLM.push({ role: "assistant", content: `**${companion.name}**: ${text}` });
          send({ type: "done_speaking", companionId: companion.id, companionName: companion.name, fullText: text });
          return text;
        }

        // --- Main turn ---
        const mainText = await speakForCompanion(currentCompanion, false);

        // --- Bonus turn: detect invitation to another teacher ---
        const bonusInvited = detectInvitation(mainText, ordered.filter(c => c.id !== currentCompanion.id));
        if (bonusInvited) {
          const bonusCompanion = ordered.find(c => c.id === bonusInvited.id);
          if (bonusCompanion) await speakForCompanion(bonusCompanion, true);
        }

        send({ type: "done", conversationId: convId });
        controller.close();
      } catch (error) {
        console.error("Chat stream error:", error);
        send({ type: "error", error: "服务器内部错误，请稍后重试" });
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

function detectInvitation(text: string, others: { id: string; name: string }[]): { id: string; name: string } | null {
  const tail = text.slice(-400);
  for (const c of others) {
    const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escaped}\\s*(?:老师|先生)?\\s*(?:[^。！？\\n]{0,40})(?:怎么看|你说呢|你觉得|如何看|有何|什么看法|补充|也说|怎么想|认为|讲|聊|觉得|以为|说说|看法|高见|见解|意见)`);
    if (pattern.test(tail)) return c;
  }
  return null;
}
