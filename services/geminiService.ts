import { GoogleGenAI, Chat } from "@google/genai";
import { Message, Puzzle, Language } from "../types";

let client: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Initialize the Gemini Client
export const initGemini = (apiKey: string) => {
  if (!apiKey) return;
  client = new GoogleGenAI({ apiKey });
};

// Start a new game session
export const startSession = async (puzzle: Puzzle, modelName: string = 'gemini-2.5-flash', previousHistory: Message[] = [], lang: Language = 'en') => {
  if (!client) throw new Error("API Key not set");

  const baseInstructions = lang === 'zh' 
    ? `
      你是一个“海龟汤”（情境猜谜）游戏的主持人。
      
      这是汤面（谜题）："${puzzle.content}"
      这是汤底（真相）："${puzzle.answer}"
      这是你的角色/指令："${puzzle.persona || '仅回答是、否、或无关。除非玩家几乎猜出了真相，否则不要解释。'}"
      
      规则：
      1. 用户是提问的玩家。
      2. 你必须根据“汤底”回答他们的问题。
      3. 你的回答主要应该是“是”、“否”或“无关”。
      4. 如果问题的预设是错误的，你可以说“前提错误”。
      5. 如果用户非常接近真相，或者问了一个复杂的问题且部分正确，你可以稍微澄清，但要保持神秘。
      6. 如果用户正确猜出了“汤底”的核心，请以“回答正确！”开头。
      7. 不要揭示完整答案，除非用户猜对了或者明确放弃。
    `
    : `
      You are the Host of a Lateral Thinking Puzzle (Turtle Soup).
      
      Here is the puzzle scenario (Soup Surface): "${puzzle.content}"
      Here is the hidden truth (Soup Bottom): "${puzzle.answer}"
      Here is your persona/instruction: "${puzzle.persona || 'Answer strictly with Yes, No, or Irrelevant. Do not explain unless the user has practically solved it.'}"
      
      Rules:
      1. The user is the player asking questions.
      2. You must answer their questions based on the "Soup Bottom".
      3. Your answers should primarily be "Yes", "No", or "Irrelevant". 
      4. If the question implies a false premise, you can say "False premise".
      5. If the user is getting very close or asks a complex question that is partially right, you can clarify slightly, but remain cryptic.
      6. If the user guesses the core of the "Soup Bottom" correctly, start your response with "CORRECT!".
      7. Do not reveal the full answer until the user has guessed it or explicitly gives up.
    `;

  chatSession = client.chats.create({
    model: modelName,
    config: {
      systemInstruction: baseInstructions,
      temperature: 0.7, 
    },
    history: previousHistory.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });

  return chatSession;
};

// Send a message to the AI
export const sendMessage = async (text: string): Promise<string> => {
  if (!chatSession) throw new Error("Session not initialized");
  
  try {
    const response = await chatSession.sendMessage({ message: text });
    return response.text || "I couldn't understand that.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// Mock function for "Free Tier" (Offline Logic)
export const mockResponse = async (text: string, puzzle: Puzzle, lang: Language): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency
  
  const lowerText = text.toLowerCase();
  
  if (lang === 'zh') {
     if (lowerText.includes('死') || lowerText.includes('杀') || lowerText.includes('血')) {
        return "是，死亡是关键。";
     }
     if (lowerText.includes('吃') || lowerText.includes('喝') || lowerText.includes('食物')) {
        return "是，与饮食有关。";
     }
     const responses = ["否。", "是。", "无关。", "请问得更具体一点。", "不完全是。"];
     return responses[Math.floor(Math.random() * responses.length)] + " (演示模式)";
  }

  // English Mock
  if (lowerText.includes('die') || lowerText.includes('kill') || lowerText.includes('suicide')) {
    return "Yes, death is relevant.";
  }
  if (lowerText.includes('food') || lowerText.includes('eat') || lowerText.includes('drink')) {
    return "Yes, consumption is key.";
  }
  
  const responses = ["No.", "Yes.", "Irrelevant.", "Please be more specific.", "No, not exactly."];
  return responses[Math.floor(Math.random() * responses.length)] + " (Demo Mode)";
};