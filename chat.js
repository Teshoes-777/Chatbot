async function sendMessage() {
  const input = document.getElementById("userInput").value;
  const responseElement = document.getElementById("response");
  responseElement.innerText = "Se trimite...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });

    const data = await response.json();
    responseElement.innerText = data.reply;
  } catch (err) {
    responseElement.innerText = "Eroare: " + err.message;
  }
}
