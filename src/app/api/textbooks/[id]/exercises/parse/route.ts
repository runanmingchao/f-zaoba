import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, getUserKey } from "@/lib/db";
import { exercises, textbooks } from "@/lib/db/schema";
import { chat } from "@/lib/llm";
import { decrypt } from "@/lib/utils/encryption";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { stripThinking } from "@/lib/utils/strip-thinking";

// 新增：检查题目答案偏差
function checkAnswerDeviation(question: string, answer: string): { isDeviated: boolean; reason?: string } {
  if (!answer || answer.trim() === "") {
    return { isDeviated: false }; // 空答案不算偏差
  }
  // 宽松模式：只检查明显不相关
  const qLength = question.length;
  const aLength = answer.length;
  // 答案长度是题目的3倍以上可能有问题
  if (aLength > qLength * 3) {
    return { isDeviated: true, reason: "答案长度明显超出题目范围" };
  }
  // 答案太短（少于5个字）可能是无效答案
  if (aLength < 5 && aLength > 0) {
    return { isDeviated: true, reason: "答案过于简短" };
  }
  return { isDeviated: false };
}

const DUAL_PARSE_PROMPT = `你是一位专业的教学习题解析助手。用户同时上传了习题文档和答案文档，请对照两份文档，将题目和答案一一配对，输出结构化的习题列表。

## 教材信息
教材名称：{title}
教材章节结构（供知识点参考）：
{chapters}

## 解析要求

请仔细阅读两份文档，对照后将每道题解析为以下JSON格式：

\`\`\`json
[
  {
    "question": "题目完整内容（来自习题文档）",
    "answer": "对应的完整答案（来自答案文档，如果找不到对应答案则为空字符串）",
    "topic": "该题对应的知识点（请从教材章节结构中匹配最相关的知识点，格式如：第一章·正义的定义）"
  }
]
\`\`\`

## 重要规则
1. 用编号（一/二、1/2/3、(1)(2)等）和内容相似度来配对题目和答案
2. 习题文档中的每道题都要提取，不要遗漏
3. 如果某道题在答案文档中找不到对应答案，answer留空
4. 如果答案文档中有答案但习题文档中找不到对应题目，忽略它
5. topic必须从教材章节结构中选取或推断，不要随意编造
6. 忽略题目和答案的编号前缀，只保留正文
7. 返回纯JSON数组，不要包含任何其他文字

请开始解析。`;

const SINGLE_PARSE_PROMPT = `你是一位专业的教学习题解析助手。用户上传了一份习题文档，请将其解析成结构化的习题列表。

## 教材信息
教材名称：{title}
教材章节结构（供知识点参考）：
{chapters}

## 解析要求

请仔细阅读用户提供的习题文档内容，将每道题解析为以下JSON格式：

\`\`\`json
[
  {
    "question": "题目完整内容",
    "answer": "如果文档中已包含答案则提取，否则为空字符串",
    "topic": "该题对应的知识点（请从教材章节结构中匹配最相关的知识点，格式如：第一章·正义的定义）"
  }
]
\`\`\`

## 重要规则
1. 如果文档中同一道题既有题目又有答案，合并为一条记录
2. 如果文档中只有题目没有答案，answer字段留空
3. topic必须从教材章节结构中选取或推断，不要随意编造
4. 忽略题目编号（一、1.、(1)等形式），只取题目文本
5. 返回纯JSON数组，不要包含任何其他文字

请开始解析。`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: textbookId } = await params;

  const tb = db.select().from(textbooks)
    .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
    .all()[0];
  if (!tb) return NextResponse.json({ error: "Textbook not found" }, { status: 404 });

  const body = await req.json();
  const questionsContent: string = (body.questionsContent || body.content || "").trim();
  // Support legacy single-file and new multi-file answers format
  let answersContent = "";
  if (Array.isArray(body.answersContents) && body.answersContents.length > 0) {
    answersContent = body.answersContents
      .map((a: { name: string; content: string }) => `### ${a.name}\n\n${a.content}`)
      .join("\n\n---\n\n");
  } else {
    answersContent = (body.answersContent || "").trim();
  }

  if (!questionsContent && !answersContent) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  // Get API key
  const keyEntry = getUserKey(session.userId, body.provider);
  if (!keyEntry) {
    return NextResponse.json({ error: "请先在设置页面配置 API Key" }, { status: 400 });
  }
  const apiKey = await decrypt(keyEntry.encryptedKey);
  const llmConfig = {
    provider: keyEntry.provider,
    apiKey,
    model: keyEntry.model || undefined,
    baseUrl: keyEntry.baseUrl || undefined,
  };

  // Update status to parsing
  db.update(textbooks)
    .set({
      parseStatus: "parsing",
      parseProgress: 0,
      parseError: null,
      lastParseAt: new Date(),
    })
    .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
    .run();

  // Build chapter info from textbook headings
  let chapterInfo = "未提供章节结构";
  if (tb.parsedContent) {
    const chapterLines = tb.parsedContent
      .split("\n")
      .filter(l => /^#{1,3}\s/.test(l))
      .slice(0, 30);
    if (chapterLines.length > 0) chapterInfo = chapterLines.join("\n");
  }

  const isDual = !!(questionsContent && answersContent);

  const systemPrompt = "你是一位专业的教学习题解析助手。请严格按照JSON格式返回结果。";
  const template = isDual ? DUAL_PARSE_PROMPT : SINGLE_PARSE_PROMPT;
  let userMessage = template
    .replace("{title}", tb.title)
    .replace("{chapters}", chapterInfo);

  if (isDual) {
    userMessage += `\n\n## 习题文档\n\n${questionsContent.slice(0, 10000)}\n\n## 答案文档\n\n${answersContent.slice(0, 10000)}`;
  } else {
    userMessage += `\n\n文档名称：${body.docName || "习题文档"}\n\n文档内容：\n\n${questionsContent.slice(0, 15000)}`;
  }

  try {
    const response = await chat(llmConfig, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ]);

    let jsonStr = response.trim();
    jsonStr = stripThinking(jsonStr).trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: "AI 返回格式异常，请重试" }, { status: 500 });
    }

    // Handle legacy answer-matching mode
    if (body.type === "answers" && !questionsContent) {
      const unanswered = db.select().from(exercises)
        .where(and(eq(exercises.textbookId, textbookId), eq(exercises.userId, session.userId)))
        .all()
        .filter(e => !e.answer || e.answer.trim() === "");

      let updated = 0;
      for (const item of parsed) {
        if (item.questionId && item.answer) {
          const ex = unanswered.find(e => e.id === item.questionId);
          if (ex) {
            db.update(exercises).set({ answer: item.answer }).where(eq(exercises.id, item.questionId)).run();
            updated++;
          }
        }
      }
      return NextResponse.json({ matched: updated, total: parsed.length });
    }

    // Insert all parsed exercises
    const inserted: { id: string; question: string; answer: string; topic: string | null }[] = [];
    const deviatedWarnings: { question: string; reason: string }[] = [];
    for (const item of parsed) {
      if (!item.question) continue;
      const id = nanoid();
      db.insert(exercises).values({
        id,
        textbookId,
        userId: session.userId,
        question: item.question,
        answer: item.answer || "",
        topic: item.topic || null,
      }).run();
      const created = db.select().from(exercises).where(eq(exercises.id, id)).all()[0];
      if (created) inserted.push(created);

      // 检查答案偏差
      if (item.answer) {
        const check = checkAnswerDeviation(item.question, item.answer);
        if (check.isDeviated) {
          deviatedWarnings.push({ question: item.question.slice(0, 50) + "...", reason: check.reason || "答案可能有偏差" });
        }
      }
    }

    // Update status to completed
    db.update(textbooks)
      .set({
        parseStatus: "completed",
        parseProgress: 100,
      })
      .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
      .run();

    return NextResponse.json({
      inserted: inserted.length,
      exercises: inserted,
      dual: isDual,
      deviatedWarnings: deviatedWarnings.length > 0 ? deviatedWarnings : undefined,
    }, { status: 201 });
  } catch (err: unknown) {
    // Update status to failed
    db.update(textbooks)
      .set({
        parseStatus: "failed",
        parseError: String(err),
      })
      .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
      .run();

    if (err instanceof SyntaxError) {
      return NextResponse.json({
        error: "AI 返回内容无法解析为 JSON，请尝试重新解析或手动添加",
        raw: (err as Error).message,
      }, { status: 500 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
