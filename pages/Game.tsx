
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { sendAIMessage } from '../services/aiService';
import { Puzzle, Message, GameState, GameStatus } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ArrowLeft, Send, Eye, EyeOff, AlertCircle, HelpCircle, Unlock, ChevronRight, RotateCcw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

import { useAuth } from '../contexts/AuthContext';

export const Game: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // Load Puzzle & Settings
  useEffect(() => {
    if (!id) return;
    const allPuzzles = storageService.getPuzzles(language);
    const found = allPuzzles.find(p => p.id === id);
    if (!found) {
      navigate('/');
      return;
    }
    setPuzzle(found);

    // Initialize questions left based on stage 1 (global maxQuestions)
    if (found.isChallenge && found.maxQuestions) {
      setQuestionsLeft(found.maxQuestions);
    }

    // Restore state
    const savedState = storageService.getGameState(id);
    if (savedState) {
      setMessages(savedState.history);

      // Basic restoration. 
      // Note: If savedState tracks specific questions left, we could use that. 
      // Currently using a simplified calculation or reset. 
      // Ideally, state should store `questionsLeft` directly. 
      // For now, we restore from calculation:
      if (found.isChallenge && found.maxQuestions) {
        // Simple logic: Reset to max if re-loading, or calculate used? 
        // Better: let's trust the logic that decrements during play. 
        // If we strictly want to persist 'questions left', we should add it to GameState.
        // For now, we recalculate based on saved usage count if available, or just max - used.
        setQuestionsLeft(found.maxQuestions - savedState.questionsUsed);
      }

      if (savedState.history.length > 0) setStatus(GameStatus.PLAYING);
      if (savedState.isSolved) setStatus(GameStatus.WON);
      setCurrentStageIndex(savedState.currentStageIndex || 0);
    }
  }, [id, navigate, language]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save state
  useEffect(() => {
    if (!puzzle || !id) return;
    // Calculate used questions roughly for stats, though local `questionsLeft` is the truth source for gameplay
    const questionsUsed = puzzle.maxQuestions && questionsLeft !== null
      ? puzzle.maxQuestions - questionsLeft
      : messages.filter(m => m.role === 'user').length;

    const state: GameState = {
      isPlaying: status === GameStatus.PLAYING,
      currentPuzzleId: id,
      history: messages,
      questionsUsed,
      isSolved: status === GameStatus.WON,
      currentStageIndex,
      unlockedClues: [],
    };
    storageService.saveGameState(id, state);

    // Sync progress if won
    if (status === GameStatus.WON) {
      // Update local puzzle object
      puzzle.playedCount = (puzzle.playedCount || 0) + 1;
      storageService.updatePuzzle(puzzle, language);

      // Sync to cloud
      if (user) {
        storageService.markPuzzlePlayedRemote(user.id, id);
      }
    }
  }, [messages, status, puzzle, questionsLeft, id, currentStageIndex, language, user]);

  const handleStart = async () => {
    if (!puzzle) return;
    const settings = storageService.getSettings();

    try {
      setIsLoading(true);
      setError(null);

      if (!settings.useFreeTier) {
        if (settings.provider === 'google' && !settings.apiKey) throw new Error("Google API Key missing.");
        if (settings.provider === 'deepseek' && !settings.deepseekApiKey) throw new Error("DeepSeek API Key missing.");
      }

      setStatus(GameStatus.PLAYING);

      if (messages.length === 0) {
        const welcome: Message = {
          id: 'system-1',
          role: 'model',
          text: language === 'zh'
            ? `汤已备好。情况如下：“${puzzle.content}”。请提问。`
            : `The soup is served. The situation is: "${puzzle.content}". You may ask your questions.`,
          timestamp: Date.now()
        };
        setMessages([welcome]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start session");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRestart = () => {
    if (!id || !puzzle) return;

    // Clear saved state
    storageService.clearGameState(id);

    // Reset local state
    setMessages([]);
    setStatus(GameStatus.IDLE);
    setCurrentStageIndex(0);
    setError(null);
    setShowAnswer(false);
    setShowRestartModal(false);

    if (puzzle.isChallenge && puzzle.maxQuestions) {
      setQuestionsLeft(puzzle.maxQuestions);
    } else {
      setQuestionsLeft(null);
    }
  };

  const advanceStage = () => {
    if (!puzzle) return;

    const totalStages = 1 + (puzzle.stages ? puzzle.stages.length : 0);
    const nextStageIndex = currentStageIndex + 1;

    if (nextStageIndex >= totalStages) {
      setStatus(GameStatus.WON);
    } else {
      setCurrentStageIndex(nextStageIndex);

      // Logic for next stage
      const nextStageConfig = puzzle.stages?.[nextStageIndex - 1]; // -1 because index 0 is Base Stage

      // 1. Add system message
      const nextStageContent = nextStageConfig ? nextStageConfig.content : "";
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        text: `🔓 ${t.stageComplete} \n${nextStageContent}`,
        timestamp: Date.now()
      }]);

      // 2. Reset Questions if in Challenge Mode
      if (puzzle.isChallenge && nextStageConfig && nextStageConfig.maxQuestions) {
        setQuestionsLeft(nextStageConfig.maxQuestions);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !puzzle) return;
    if (status !== GameStatus.PLAYING) return;

    if (questionsLeft !== null && questionsLeft <= 0) {
      setError(t.gameOver);
      setStatus(GameStatus.LOST);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Decrement question count (snapshot variable for check)
    let currentQLeft = questionsLeft;
    if (questionsLeft !== null) {
      setQuestionsLeft(prev => {
        const newVal = prev ? prev - 1 : 0;
        currentQLeft = newVal;
        return newVal;
      });
    }

    try {
      // Use unified AI Service, passing current stage index
      const responseText = await sendAIMessage(userMsg.text, puzzle, messages, language, currentStageIndex);

      // Check for Stage Clear Signal
      let cleanResponse = responseText;
      let isStageCleared = false;

      if (responseText.includes('[[STAGE_CLEARED]]')) {
        isStageCleared = true;
        cleanResponse = responseText.replace('[[STAGE_CLEARED]]', '').trim();
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanResponse,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);

      // Handle Progression
      if (isStageCleared) {
        advanceStage();
      } else if (questionsLeft === 1 && puzzle.isChallenge) {
        // This was the last question (now it became 0), and it wasn't cleared.
        setStatus(GameStatus.LOST);
      }

    } catch (err: any) {
      setError("Failed to get response: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!puzzle) return <div className="p-8 text-center">{t.loading}</div>;

  const hasMoreStages = puzzle.stages && currentStageIndex < puzzle.stages.length;

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-mystery-900 border-x border-mystery-800 relative">
      <Modal
        isOpen={showRestartModal}
        title={t.attention}
        message={t.restartConfirm}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        isDestructive={true}
        onConfirm={confirmRestart}
        onCancel={() => setShowRestartModal(false)}
      />

      {/* Header - Increased Z-Index */}
      <header className="flex items-center justify-between p-4 border-b border-mystery-700 bg-mystery-800/80 backdrop-blur-sm z-50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-mystery-100 truncate">{puzzle.title}</h1>
            {questionsLeft !== null && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${questionsLeft < 5 ? 'bg-red-900 text-red-200' : 'bg-mystery-700 text-mystery-300'}`}>
                {t.questionsLeft}: {questionsLeft}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowRestartModal(true)} title={t.restartGame} className="text-white hover:bg-mystery-700">
            <RotateCcw className="w-5 h-5" />
          </Button>
          {status !== GameStatus.IDLE && (
            <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)} title={t.toggleSoupBottom} className="text-white hover:bg-mystery-700">
              {showAnswer ? <EyeOff className="w-5 h-5 text-red-400" /> : <Eye className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </header>

      {/* Soup Surface / Stages */}
      <div className="p-4 bg-mystery-800 border-b border-mystery-700 shadow-lg max-h-[40vh] overflow-y-auto z-40 relative">
        {/* Base Stage */}
        <div className="bg-mystery-900/50 p-4 rounded-lg border border-mystery-600 mb-2">
          <h2 className="text-xs uppercase tracking-wider text-mystery-400 mb-1">{t.soupSurface}</h2>
          <p className="text-mystery-100 leading-relaxed text-sm md:text-base">{puzzle.content}</p>
        </div>

        {/* Unlocked Stages */}
        {puzzle.stages && puzzle.stages.map((stage, index) => {
          // Adjust logic: currentStageIndex 0 = Base. 
          // If currentStageIndex is 1, it means we have unlocked stage[0].
          if (index < currentStageIndex) {
            return (
              <div key={stage.id} className="bg-mystery-900/50 p-4 rounded-lg border border-accent/30 mb-2 relative animate-in fade-in slide-in-from-top-2">
                <div className="absolute -top-2 -right-2 bg-accent/20 rounded-full p-1 border border-accent/50">
                  <Unlock className="w-3 h-3 text-accent" />
                </div>
                <h2 className="text-xs uppercase tracking-wider text-accent mb-1">{t.stageLabel(index)}</h2>
                <p className="text-mystery-100 leading-relaxed text-sm md:text-base">{stage.content}</p>
              </div>
            );
          }
          return null;
        })}

        {/* Next Stage Manual Skip (Only if NOT Challenge Mode) */}
        {hasMoreStages && !puzzle.isChallenge && status === GameStatus.PLAYING && (
          <div className="mt-2 flex justify-center">
            <Button variant="secondary" size="sm" onClick={advanceStage}>
              <ChevronRight className="w-4 h-4 mr-2" />
              {t.skipToNextStage}
            </Button>
          </div>
        )}

        {showAnswer && (
          <div className="mt-4 bg-red-900/20 p-4 rounded-lg border border-red-900/50 animate-in fade-in slide-in-from-top-2">
            <h2 className="text-xs uppercase tracking-wider text-red-400 mb-1">{t.soupBottom}</h2>
            <p className="text-red-100 leading-relaxed">{puzzle.answer}</p>
            {puzzle.stages && (
              <div className="mt-2 pt-2 border-t border-red-900/30">
                <h3 className="text-xs text-red-300 font-bold mb-1">Stage Answers:</h3>
                <ul className="list-disc pl-4 text-xs text-red-200">
                  {puzzle.stages.map((s, i) => <li key={i}>{t.stageLabel(i)}: {s.answer}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {status === GameStatus.WON && (
          <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-center font-bold animate-in zoom-in-95">
            {t.congratulations}
          </div>
        )}

        {status === GameStatus.LOST && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-center font-bold animate-in zoom-in-95">
            {t.gameOver}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 text-red-200 px-4 py-2 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {status === GameStatus.IDLE && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-mystery-500 opacity-60">
            <HelpCircle className="w-16 h-16 mb-4" />
            <p>{t.startInvestigation}</p>
            <Button onClick={handleStart} className="mt-4">{t.startGame}</Button>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm md:text-base shadow-sm ${msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-none'
                  : msg.role === 'system'
                    ? 'bg-transparent text-accent border border-accent/30 text-center w-full my-2 italic'
                    : 'bg-mystery-700 text-mystery-100 rounded-bl-none'
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-mystery-700/50 rounded-2xl px-4 py-3 rounded-bl-none flex gap-1">
              <span className="w-2 h-2 bg-mystery-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-mystery-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-mystery-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-mystery-800 border-t border-mystery-700 z-10">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== GameStatus.PLAYING || isLoading}
            placeholder={status === GameStatus.PLAYING ? t.askQuestionPlaceholder : t.startGamePlaceholder}
            className="flex-1 bg-mystery-900 border border-mystery-600 rounded-lg px-4 py-3 text-mystery-100 placeholder-mystery-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!input.trim() || status !== GameStatus.PLAYING || isLoading}
            className="w-12 px-0 flex items-center justify-center shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};