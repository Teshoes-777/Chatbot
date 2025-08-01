// api/chat.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: { "OpenAI-Beta": "assistants=v2" }
});

export default async function handler(req, res) {
  // 1) Always respond to OPTIONS (CORS preflight)
  res.setHeader("Access-Control-Allow-Origin", "https://orthoflex.ro");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Preflight: just return the CORS headers
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).end("Method Not Allowed");
  }

  const { message: userMessage } = req.body;
  if (!userMessage) {
    return res.status(400).json({ reply: "Eroare: mesajul este gol." });
  }

  try {
    // … your existing thread/run logic here …
    const thread = await client.beta.threads.create();
    await client.beta.threads.messages.create(thread.id, {
      role: "user", content: userMessage
    });
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID
    });
    let status;
    do {
      const r = await client.beta.threads.runs.retrieve(thread.id, run.id);
      status = r.status;
      if (status === "completed") break;
      if (["failed","expired"].includes(status)) throw new Error(`Run ${status}`);
      await new Promise(r => setTimeout(r, 500));
    } while (true);
    const msgs = await client.beta.threads.messages.list(thread.id);
    const assistantMsg = msgs.data.find(m => m.role === "assistant");
    const reply = assistantMsg?.content[0].text.value ?? "Nu am un răspuns.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("GPT ERROR:", err);
    return res.status(500).json({ reply: `Eroare GPT: ${err.message}` });
  }
}
