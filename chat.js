
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "OpenAI-Project": process.env.PROJECT_ID,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  try {
    // Creează un thread
    const thread = await openai.beta.threads.create();

    // Trimite mesaj
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // Rulează assistant-ul
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // Așteaptă finalizare
    let runStatus = null;
    while (true) {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (runStatus.status === "completed") break;
      if (["failed", "expired"].includes(runStatus.status)) throw new Error("Run failed");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Preia mesaj
    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data.find(m => m.role === "assistant")?.content?.[0]?.text?.value;

    res.status(200).json({ reply });
  } catch (error) {
    console.error("EROARE GPT:", error.message);
    res.status(500).json({ error: error.message });
  }
}
