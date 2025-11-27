import { Puzzle, AppSettings, GameState, Language } from '../types';
import { supabase } from '../lib/supabase';

const KEYS = {
  PUZZLES_EN: 'turtle_soup_puzzles', // Legacy/EN key
  PUZZLES_ZH: 'turtle_soup_puzzles_zh', // New ZH key
  SETTINGS: 'turtle_soup_settings',
  GAME_STATE: 'turtle_soup_gamestate',
};

const DEFAULT_PUZZLES_EN: Puzzle[] = [
  {
    id: 'demo-1',
    title: 'The Albatross Soup',
    content: 'A man goes to a restaurant, orders albatross soup, takes one sip, pulls out a gun, and kills himself.',
    answer: 'The man was previously shipwrecked. He thought he ate albatross to survive, which tasted different. Realizing he had actually eaten his deceased wife (or companion) on the island, he was overcome with guilt.',
    isChallenge: true,
    maxQuestions: 20,
    persona: 'You are a mysterious host. Answer only Yes, No, or Irrelevant. Be strict.',
    winCondition: 'restore',
    playedCount: 0,
    isFavorite: false,
    language: 'en'
  }
];

const DEFAULT_PUZZLES_ZH: Puzzle[] = [
  {
    id: 'demo-zh-1',
    title: '海龟汤',
    content: '一个男人走进一家餐馆，点了一碗海龟汤。他喝了一口，然后举枪自杀。',
    answer: '这个男人曾经遭遇海难，漂流在岛上。为了生存，他以为自己吃了同伴煮的海龟汤。在餐馆喝到真的海龟汤后，发现味道不同，意识到当时吃的是同伴的肉，出于愧疚自杀。',
    isChallenge: true,
    maxQuestions: 20,
    persona: '你是一个神秘的主持人。仅回答是、否、或无关。',
    winCondition: 'restore',
    playedCount: 0,
    isFavorite: false,
    language: 'zh'
  },
  {
    id: 'demo-zh-multistage',
    title: '深夜包裹 (分段示例)',
    content: '男人在沙漠中看到一个包裹，打开后就自杀了。',
    answer: '包裹里是破损的降落伞。',
    isChallenge: true,
    maxQuestions: 20,
    persona: '你是一个严谨的侦探。',
    winCondition: 'restore',
    language: 'zh',
    stages: [
      {
        id: 's1',
        content: '包裹里并没有食物和水。但他知道自己死定了。',
        answer: '他跳伞失败，包裹是备用伞包，也是坏的。',
        unlockType: 'ai_judgement'
      },
      {
        id: 's2',
        content: '男人并没有受伤。',
        answer: '他是飞行员，飞机故障跳伞，主伞备伞都打不开，落地必死无疑。',
        unlockType: 'ai_judgement'
      }
    ]
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'google',
  apiKey: '',
  deepseekApiKey: '',
  model: 'gemini-2.5-flash',
  deepseekModel: 'deepseek-chat',
  useFreeTier: true,
  speed: 'normal',
  revealType: 'modal',
  language: 'en'
};

const getStorageKeyForLang = (lang: Language) => {
  return lang === 'zh' ? KEYS.PUZZLES_ZH : KEYS.PUZZLES_EN;
};

export const storageService = {
  getPuzzles: (lang: Language = 'en'): Puzzle[] => {
    const key = getStorageKeyForLang(lang);
    const stored = localStorage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }

    // Return defaults if nothing stored
    return lang === 'zh' ? DEFAULT_PUZZLES_ZH : DEFAULT_PUZZLES_EN;
  },

  savePuzzle: (puzzle: Puzzle, lang: Language = 'en') => {
    const key = getStorageKeyForLang(lang);
    const puzzles = storageService.getPuzzles(lang);

    const existingIndex = puzzles.findIndex(p => p.id === puzzle.id);
    if (existingIndex >= 0) {
      puzzles[existingIndex] = { ...puzzle, language: lang };
    } else {
      puzzles.push({ ...puzzle, language: lang });
    }
    localStorage.setItem(key, JSON.stringify(puzzles));
  },

  deletePuzzle: (id: string, lang: Language = 'en') => {
    const key = getStorageKeyForLang(lang);
    const puzzles = storageService.getPuzzles(lang).filter(p => p.id !== id);
    localStorage.setItem(key, JSON.stringify(puzzles));
  },

  // 根据ID获取特定的海龟汤
  getPuzzleById: (id: string, lang: Language = 'en'): Puzzle | undefined => {
    const puzzles = storageService.getPuzzles(lang);
    return puzzles.find(p => p.id === id);
  },

  // 更新现有的海龟汤
  updatePuzzle: (puzzle: Puzzle, lang: Language = 'en') => {
    // 重用savePuzzle方法，它已经包含了更新现有puzzle的逻辑
    storageService.savePuzzle(puzzle, lang);
  },

  getSettings: (): AppSettings => {
    const stored = localStorage.getItem(KEYS.SETTINGS);
    let settings = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;

    // Migration for new fields
    if (!settings.provider) settings.provider = 'google';
    if (!settings.deepseekModel) settings.deepseekModel = 'deepseek-chat';
    if (settings.deepseekApiKey === undefined) settings.deepseekApiKey = '';
    if (!settings.language) settings.language = 'en';

    return settings;
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  getGameState: (puzzleId: string): GameState | null => {
    const stored = localStorage.getItem(`${KEYS.GAME_STATE}_${puzzleId}`);
    return stored ? JSON.parse(stored) : null;
  },

  saveGameState: (puzzleId: string, state: GameState) => {
    localStorage.setItem(`${KEYS.GAME_STATE}_${puzzleId}`, JSON.stringify(state));
  },

  clearGameState: (puzzleId: string) => {
    localStorage.removeItem(`${KEYS.GAME_STATE}_${puzzleId}`);
  },

  // --- Remote Sync Methods ---

  // Sync settings from Supabase
  syncSettings: async (userId: string): Promise<AppSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('api_key, deepseek_api_key, provider, model, deepseek_model')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching settings:', error);
        }
        return null;
      }

      if (data) {
        const currentSettings = storageService.getSettings();
        const newSettings = {
          ...currentSettings,
          apiKey: data.api_key || currentSettings.apiKey,
          deepseekApiKey: data.deepseek_api_key || currentSettings.deepseekApiKey,
          provider: data.provider || currentSettings.provider,
          model: data.model || currentSettings.model,
          deepseekModel: data.deepseek_model || currentSettings.deepseekModel,
          useFreeTier: false // If they have settings in cloud, likely not using free tier default? Or maybe keep local preference.
        };
        storageService.saveSettings(newSettings);
        return newSettings;
      }
    } catch (err) {
      console.error('Unexpected error syncing settings:', err);
    }
    return null;
  },

  // Save settings to Supabase
  saveRemoteSettings: async (userId: string, settings: AppSettings) => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          api_key: settings.apiKey,
          deepseek_api_key: settings.deepseekApiKey,
          provider: settings.provider,
          model: settings.model,
          deepseek_model: settings.deepseekModel,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving remote settings:', err);
    }
  },

  // Sync played puzzles (progress)
  syncProgress: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('puzzle_id')
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        // We need to mark these puzzles as played locally
        // Currently 'playedCount' is on the puzzle object in the list.
        // This is a bit tricky because puzzles are stored in a big list in localStorage.
        // We should iterate and update.

        // For now, let's just update the 'playedCount' to 1 if it's 0.
        // Or maybe we need a separate 'playedPuzzles' set in localStorage?
        // The current implementation stores 'playedCount' directly on the puzzle object in the 'turtle_soup_puzzles' list.

        const lang: Language = 'zh'; // Default to zh for now, or sync both?
        // Let's try to sync for the current language or both.

        ['en', 'zh'].forEach(l => {
          const puzzles = storageService.getPuzzles(l as Language);
          let changed = false;
          data.forEach(item => {
            const pIndex = puzzles.findIndex(p => p.id === item.puzzle_id);
            if (pIndex >= 0) {
              if (puzzles[pIndex].playedCount === 0) {
                puzzles[pIndex].playedCount = 1;
                changed = true;
              }
            }
          });
          if (changed) {
            const key = getStorageKeyForLang(l as Language);
            localStorage.setItem(key, JSON.stringify(puzzles));
          }
        });
      }
    } catch (err) {
      console.error('Error syncing progress:', err);
    }
  },

  // Mark puzzle as played remotely
  markPuzzlePlayedRemote: async (userId: string, puzzleId: string) => {
    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          puzzle_id: puzzleId,
          is_completed: true,
          played_at: new Date().toISOString()
        }, { onConflict: 'user_id, puzzle_id' });

      if (error) throw error;
    } catch (err) {
      console.error('Error marking puzzle played remote:', err);
    }
  },

  // 获取所有用户设置（管理员功能）
  getAllSettings: async () => {
    try {
      // 这个方法在实际环境中需要管理员权限
      // 目前我们只返回模拟数据
      return {
        'admin@admin.com': {
          apiKey: 'sk-***',
          provider: 'google',
          model: 'gemini-2.5-flash',
          deepseekModel: 'deepseek-chat'
        },
        'demo@example.com': {
          apiKey: '',
          provider: 'google',
          model: 'gemini-2.5-flash',
          deepseekModel: 'deepseek-chat'
        }
      };
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }
};