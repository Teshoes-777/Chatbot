// api/chat.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    // opt into Assistants v2 so assistant_id is accepted
    "OpenAI-Beta": "assistants=v2"
  }
});

export default async function handler(req, res) {
  // Only POST is allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { message: userMessage } = req.body;
  if (!userMessage) {
    return res.status(400).json({ reply: "Eroare: mesajul este gol." });
  }

  try {
    // 1) create a new thread
    const thread = await client.beta.threads.create();

    // 2) post the user’s message
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage
    });

    // 3) kick off a run with your assistant
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // 4) poll until completion
    let status;
    do {
      const r = await client.beta.threads.runs.retrieve(thread.id, run.id);
      status = r.status;
      if (status === "completed") break;
      if (["failed", "expired"].includes(status)) {
        throw new Error(`Run ${status}`);
      }
      await new Promise((r) => setTimeout(r, 500));
    } while (true);

    // 5) fetch messages & extract assistant’s reply
    const msgs = await client.beta.threads.messages.list(thread.id);
    const assistantMsg = msgs.data.find((m) => m.role === "assistant");
    const reply =
      assistantMsg?.content[0].text.value ?? "Nu am un răspuns.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("GPT ERROR:", err);
    return res
      .status(500)
      .json({ reply: `Eroare GPT: ${err.message}` });
  }
}
