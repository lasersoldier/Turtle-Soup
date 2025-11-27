import { storageService } from "./storageService";
import { initGemini, startSession, sendMessage as sendGeminiMessage } from "./geminiService";
import { callDeepSeek } from "./deepseekService";
import { Puzzle, Message, Language } from "../types";

// Generate the System Prompt
export const generateSystemInstruction = (puzzle: Puzzle, lang: Language, currentStageIndex: number = 0): string => {
  // Determine current context based on stage
  let currentScenario = puzzle.content;
  let currentTruth = puzzle.answer;

  // If there are stages, determine what part of the story we are focusing on
  // Base puzzle is index 0 (technically Stage 1 in UI terms).
  // puzzle.stages[0] is UI Stage 2.
  if (puzzle.stages && puzzle.stages.length > 0) {
    if (currentStageIndex === 0) {
      // Base Stage
      currentScenario = puzzle.content;
      currentTruth = puzzle.answer; // Base answer
    } else {
      // Subsequent Stages
      // currentStageIndex 1 corresponds to puzzle.stages[0]
      const stage = puzzle.stages[currentStageIndex - 1];
      if (stage) {
         currentScenario = stage.content;
         currentTruth = stage.answer;
      }
    }
  }

  const isFinalStage = !puzzle.stages || currentStageIndex >= puzzle.stages.length;

  if (lang === 'zh') {
    return `
      你是一个“海龟汤”（情境猜谜）游戏的主持人。
      
      【当前游戏进度】：第 ${currentStageIndex + 1} 阶段
      【当前可见汤面】："${currentScenario}"
      【当前需还原的汤底/真相】："${currentTruth}"
      
      这是你的角色/指令："${puzzle.persona || '仅回答是、否、或无关。'}"
      
      规则：
      1. 用户正在试图还原【当前阶段】的真相。
      2. 即使你知道整个故事的全貌，请主要聚焦于判断用户是否猜中了【当前阶段】的真相。
      3. 回答主要应该是“是”、“否”或“无关”。
      4. 只有当用户明确猜中了【当前汤底】的核心要素时，请务必在回复的开头加上 "[[STAGE_CLEARED]]" 标记，然后说“回答正确”或“阶段完成”。
      5. 如果用户问到了下一阶段才该揭示的内容，请模糊回答或提示“时机未到”。
      6. 如果这是最后一个阶段，用户猜中后意味着整个游戏胜利。
    `;
  } else {
    return `
      You are the Host of a Lateral Thinking Puzzle (Turtle Soup).
      
      [Current Progress]: Stage ${currentStageIndex + 1}
      [Current Scenario]: "${currentScenario}"
      [Current Truth to Find]: "${currentTruth}"
      
      Your persona: "${puzzle.persona || 'Answer strictly with Yes, No, or Irrelevant.'}"
      
      Rules:
      1. The user is trying to solve the *current stage*.
      2. Focus on whether the user's guess matches the [Current Truth to Find].
      3. Answers should primarily be "Yes", "No", or "Irrelevant". 
      4. CRITICAL: When the user correctly guesses the core of the [Current Truth to Find], you MUST start your response with "[[STAGE_CLEARED]]" followed by "Correct".
      5. If the user asks about details belonging to a future stage, remain vague.
    `;
  }
};

// Unified Send Message Function
export const sendAIMessage = async (
  text: string, 
  puzzle: Puzzle, 
  history: Message[], 
  lang: Language,
  currentStageIndex: number
): Promise<string> => {
  const settings = storageService.getSettings();

  // 1. Mock Mode
  if (settings.useFreeTier) {
     const { mockResponse } = await import('./geminiService');
     // Enhanced mock logic for stages could go here, but keeping simple for now
     // Just auto-clear if they say "answer" in demo mode
     if (text.toLowerCase().includes('answer') || text.includes('答案')) {
         return "[[STAGE_CLEARED]] " + (lang === 'zh' ? "回答正确！" : "Correct!");
     }
     return mockResponse(text, puzzle, lang);
  }

  // 2. Google Gemini
  if (settings.provider === 'google') {
    if (!settings.apiKey) throw new Error("Google API Key missing");
    
    initGemini(settings.apiKey);
    
    // We pass the STAGE SPECIFIC instruction here
    const systemInstruction = generateSystemInstruction(puzzle, lang, currentStageIndex);
    
    // We create a fresh chat for the immediate response to ensure System Instruction is up to date with the Stage
    // However, we need to keep history.
    // NOTE: Gemini SDK `startSession` creates a persistent object. 
    // To support changing system instructions dynamically (per stage), we create a new chat instance 
    // with the full history + new system prompt.
    
    const client = new (await import("@google/genai")).GoogleGenAI({ apiKey: settings.apiKey });
    const chat = client.chats.create({
        model: settings.model,
        config: { systemInstruction },
        history: history.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }))
    });

    const result = await chat.sendMessage({ message: text });
    return result.text || '';
  }

  // 3. DeepSeek
  if (settings.provider === 'deepseek') {
    if (!settings.deepseekApiKey) throw new Error("DeepSeek API Key missing");
    
    const systemInstruction = generateSystemInstruction(puzzle, lang, currentStageIndex);
    const fullHistory = [...history, { id: 'temp', role: 'user' as const, text, timestamp: Date.now() }];
    
    return await callDeepSeek(
      settings.deepseekApiKey, 
      settings.deepseekModel, 
      fullHistory, 
      systemInstruction
    );
  }

  throw new Error("Unknown Provider");
};