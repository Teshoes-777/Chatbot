// api/chat.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: { "OpenAI-Beta": "assistants=v2" }
});

export default async function handler(req, res) {
  // CORS preflight & common headers (as before)…
  res.setHeader("Access-Control-Allow-Origin", "https://orthoflex.ro");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).end("Method Not Allowed");
  }

  const { message: userMessage, threadId: incomingThreadId } = req.body;
  if (!userMessage) {
    return res.status(400).json({ error: "Mesajul este gol." });
  }

  try {
    // 1) create a thread only if we don’t already have one
    const thread = incomingThreadId
      ? { id: incomingThreadId }
      : await client.beta.threads.create();

    // 2) post the user message
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage
    });

    // 3) kick off inference with your assistant
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // 4) poll until done
    let status;
    do {
      const r = await client.beta.threads.runs.retrieve(thread.id, run.id);
      status = r.status;
      if (status === "completed") break;
      if (["failed", "expired"].includes(status)) throw new Error(`Run ${status}`);
      await new Promise((r) => setTimeout(r, 500));
    } while (true);

    // 5) fetch all messages, find the assistant’s reply
    const msgs = await client.beta.threads.messages.list(thread.id);
    const assistantMsg = msgs.data.find((m) => m.role === "assistant");
    const reply = assistantMsg?.content[0].text.value ?? "Nu am un răspuns.";

    // 6) return both the text and the thread ID
    return res.status(200).json({
      reply,
      threadId: thread.id
    });

  } catch (err) {
    console.error("GPT ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
