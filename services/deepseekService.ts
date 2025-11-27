import { Message } from "../types";

export const callDeepSeek = async (
  apiKey: string,
  model: string,
  messages: Message[],
  systemInstruction: string
): Promise<string> => {
  if (!apiKey) throw new Error("DeepSeek API Key is missing");

  // DeepSeek API Endpoint
  const endpoint = "https://api.deepseek.com/chat/completions";

  // Prepare messages: System instruction first, then history
  const apiMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role, // DeepSeek uses 'assistant'
      content: m.text
    }))
  ];

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response content.";

  } catch (error: any) {
    console.error("DeepSeek Request Failed:", error);
    throw error;
  }
};