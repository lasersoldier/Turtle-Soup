
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Puzzle, PuzzleStage } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { EditPuzzleForm } from '../components/EditPuzzleForm';
import { ArrowLeft, Upload, FileText, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ModalState {
    isOpen: boolean;
    title: string;
    message: string;
    isSuccess?: boolean;
}

export const Create: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });
  const [isEditMode, setIsEditMode] = useState(false);
  const [puzzleToEdit, setPuzzleToEdit] = useState<Puzzle | null>(null);
  
  // Single Form State
  const [formData, setFormData] = useState<Partial<Puzzle>>({
    title: '',
    content: '',
    answer: '',
    isChallenge: false,
    maxQuestions: 20,
    persona: '',
    winCondition: 'restore',
  });

  const [stages, setStages] = useState<PuzzleStage[]>([]);

  // Batch State
  const [csvText, setCsvText] = useState('');
  const [batchError, setBatchError] = useState('');

  const showModal = (title: string, message: string, isSuccess: boolean = false) => {
      setModalState({ isOpen: true, title, message, isSuccess });
  };

  // 检查是否处于编辑模式并加载要编辑的海龟汤
  useEffect(() => {
    const editParam = searchParams.get('edit');
    const puzzleId = searchParams.get('puzzleId');
    
    if (editParam === 'true' && puzzleId) {
      setIsEditMode(true);
      const puzzle = storageService.getPuzzleById(puzzleId, language);
      if (puzzle) {
        setPuzzleToEdit(puzzle);
      } else {
        showModal(t.error, t.puzzleNotFound || '未找到该海龟汤');
      }
    }
  }, [searchParams, language, t]);

  const handleModalClose = () => {
      setModalState(prev => ({ ...prev, isOpen: false }));
      if (modalState.isSuccess) {
          navigate('/');
      }
  };

  // 处理编辑保存
  const handleEditSave = (updatedPuzzle: Puzzle) => {
    try {
      storageService.updatePuzzle(updatedPuzzle, language);
      showModal(t.success, t.puzzleUpdated || '海龟汤已成功更新！', true);
    } catch (error) {
      showModal(t.error, t.updateFailed || '更新失败，请重试。');
    }
  };

  // 取消编辑
  const handleEditCancel = () => {
    setIsEditMode(false);
    setPuzzleToEdit(null);
    navigate('/');
  };

  const addStage = () => {
    setStages([
      ...stages,
      {
        id: Date.now().toString(),
        content: '',
        answer: '',
        unlockType: 'ai_judgement',
        maxQuestions: formData.isChallenge ? 10 : undefined, // Default 10 for new stages in challenge mode
      }
    ]);
  };

  const updateStage = (index: number, field: keyof PuzzleStage, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const removeStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.answer) return;

    // Validate stages
    if (stages.length > 0) {
       for (const s of stages) {
          if (!s.content || !s.answer) {
             showModal(t.attention, language === 'zh' ? '请完善所有阶段的汤面和汤底' : 'Please fill in scenario and truth for all stages');
             return;
          }
       }
    }

    const newPuzzle: Puzzle = {
      id: Date.now().toString(),
      title: formData.title!,
      content: formData.content!,
      answer: formData.answer!,
      isChallenge: !!formData.isChallenge,
      maxQuestions: formData.isChallenge ? Number(formData.maxQuestions) : undefined,
      persona: formData.persona,
      winCondition: formData.winCondition as any,
      playedCount: 0,
      isFavorite: false,
      authorId: 'local',
      language: language,
      stages: stages.length > 0 ? stages : undefined
    };

    storageService.savePuzzle(newPuzzle, language);
    navigate('/');
  };

  const handleBatchImport = () => {
    if (!csvText.trim()) return;
    try {
        const rows = csvText.split('\n').filter(r => r.trim());
        let count = 0;
        
        rows.forEach(row => {
            const cols = row.split('|').map(c => c.trim());
            if (cols.length < 3) return; // Min required: Title, Content, Answer
            
            // Format: Title | Content | Answer | IsChallenge | MaxQ | Persona | ...Stages
            const [
                title, 
                content, 
                answer, 
                isChallengeStr, 
                maxQStr, 
                personaStr, 
                ...stageParts
            ] = cols;

            // Parse Boolean for Challenge
            const isChallenge = ['yes', 'true', 'y', '是', '1'].includes((isChallengeStr || '').toLowerCase());
            
            // Parse Max Questions for Stage 1
            const maxQuestions = (isChallenge && maxQStr) ? parseInt(maxQStr) : undefined;
            
            // Parse Persona
            const persona = personaStr || undefined;
            
            // Parse Stages
            // Challenge Mode: 3 columns per stage [Content, Answer, MaxQ]
            // Normal Mode: 2 columns per stage [Content, Answer]
            const puzzleStages: PuzzleStage[] = [];
            const step = isChallenge ? 3 : 2;

            for (let i = 0; i < stageParts.length; i += step) {
                const sContent = stageParts[i];
                const sAnswer = stageParts[i+1];
                const sMaxQ = isChallenge ? stageParts[i+2] : undefined;

                if (sContent && sAnswer) {
                    puzzleStages.push({
                        id: `batch-${Date.now()}-${count}-${i}`,
                        content: sContent,
                        answer: sAnswer,
                        unlockType: 'ai_judgement',
                        maxQuestions: sMaxQ ? parseInt(sMaxQ) : undefined
                    });
                }
            }

            const puzzle: Puzzle = {
                id: Date.now().toString() + Math.random().toString().slice(2,6),
                title,
                content,
                answer,
                isChallenge,
                maxQuestions,
                persona,
                playedCount: 0,
                isFavorite: false,
                language: language,
                stages: puzzleStages.length > 0 ? puzzleStages : undefined
            };
            
            storageService.savePuzzle(puzzle, language);
            count++;
        });
        
        showModal(t.success, t.importSuccess(count), true);
    } catch (e) {
        setBatchError(t.importError);
    }
  };

  return (
    <div className="min-h-screen bg-mystery-900 p-4 md:p-8">
      <Modal 
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmLabel={t.confirm}
          onConfirm={handleModalClose}
          onCancel={handleModalClose}
          showCancel={false}
          isDestructive={false}
      />

      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => isEditMode ? handleEditCancel() : navigate('/')} className="mb-4 pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> {isEditMode ? t.cancelEdit : t.backHome}
        </Button>

        <div className="flex gap-4 border-b border-mystery-700 pb-4">
            <button 
                onClick={() => setMode('single')}
                className={`pb-2 text-sm font-medium transition-colors ${mode === 'single' ? 'text-accent border-b-2 border-accent' : 'text-mystery-400'}`}
            >
                {t.singleCreation}
            </button>
            <button 
                onClick={() => setMode('batch')}
                className={`pb-2 text-sm font-medium transition-colors ${mode === 'batch' ? 'text-accent border-b-2 border-accent' : 'text-mystery-400'}`}
            >
                {t.batchImport}
            </button>
        </div>

        {isEditMode && puzzleToEdit ? (
          <div>
            <h2 className="text-xl font-bold text-mystery-100 mb-4">{t.editPuzzle}</h2>
            <EditPuzzleForm 
              puzzle={puzzleToEdit} 
              onSave={handleEditSave} 
              onCancel={handleEditCancel} 
              language={language}
            />
          </div>
        ) : mode === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-6 bg-mystery-800 p-6 rounded-xl border border-mystery-700">
                <div>
                    <label className="block text-sm font-medium text-mystery-300 mb-1">{t.titleLabel}</label>
                    <input 
                        required
                        type="text" 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-mystery-300 mb-1">{t.scenarioLabel}</label>
                    <textarea 
                        required
                        rows={3}
                        value={formData.content} 
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-mystery-300 mb-1">{t.truthLabel}</label>
                    <textarea 
                        required
                        rows={3}
                        value={formData.answer} 
                        onChange={e => setFormData({...formData, answer: e.target.value})}
                        className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-mystery-900/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="isChallenge"
                            checked={formData.isChallenge}
                            onChange={e => setFormData({...formData, isChallenge: e.target.checked})}
                            className="rounded border-mystery-600 bg-mystery-900 text-accent focus:ring-accent w-4 h-4"
                        />
                        <label htmlFor="isChallenge" className="text-sm text-mystery-100 font-medium">{t.challengeMode}</label>
                    </div>
                    
                    {formData.isChallenge && (
                        <div>
                             <label className="block text-xs font-medium text-mystery-400 mb-1">{t.maxQuestions}</label>
                             <input 
                                type="number" 
                                value={formData.maxQuestions} 
                                onChange={e => setFormData({...formData, maxQuestions: parseInt(e.target.value)})}
                                className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-1.5 text-white"
                             />
                        </div>
                    )}
                </div>

                {/* Stages Section */}
                <div className="space-y-4 border-l-2 border-mystery-700 pl-4 mt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-mystery-200">{t.stagesSection}</h3>
                        <Button type="button" size="sm" variant="secondary" onClick={addStage}>
                            <Plus className="w-3 h-3 mr-1" /> {t.addStage}
                        </Button>
                    </div>
                    
                    {stages.map((stage, index) => (
                        <div key={index} className="bg-mystery-900/50 p-4 rounded-lg border border-mystery-700 relative">
                            <h4 className="text-xs uppercase text-accent mb-2">{t.stageLabel(index)}</h4>
                            <div className="absolute top-2 right-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => removeStage(index)} className="text-red-400 hover:text-red-300">
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-mystery-400 mb-1">{t.stageContent}</label>
                                    <textarea 
                                        rows={2}
                                        value={stage.content}
                                        onChange={e => updateStage(index, 'content', e.target.value)}
                                        className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-mystery-400 mb-1">{t.stageAnswer}</label>
                                    <textarea 
                                        rows={2}
                                        value={stage.answer}
                                        onChange={e => updateStage(index, 'answer', e.target.value)}
                                        className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2 text-sm text-white"
                                    />
                                </div>
                                {/* Per-stage question limit (Only if Challenge Mode is on) */}
                                {formData.isChallenge && (
                                    <div>
                                        <label className="block text-xs text-mystery-400 mb-1">{t.stageMaxQuestions}</label>
                                        <input 
                                            type="number"
                                            value={stage.maxQuestions || 10}
                                            onChange={e => updateStage(index, 'maxQuestions', parseInt(e.target.value))}
                                            className="w-24 bg-mystery-900 border border-mystery-600 rounded-lg p-1.5 text-sm text-white"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-mystery-300 mb-1">{t.hostPersona}</label>
                    <input 
                        type="text" 
                        placeholder={t.hostPersonaPlaceholder}
                        value={formData.persona} 
                        onChange={e => setFormData({...formData, persona: e.target.value})}
                        className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white"
                    />
                </div>

                <Button type="submit" className="w-full">{t.createBtn}</Button>
            </form>
        ) : (
            <div className="space-y-4 bg-mystery-800 p-6 rounded-xl border border-mystery-700">
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg text-sm text-accent-200">
                    <h4 className="font-bold flex items-center gap-2 mb-2"><FileText className="w-4 h-4"/> {t.formatGuide}</h4>
                    <p className="mb-2 text-xs opacity-80">{t.formatGuideText}</p>
                    <p className="mb-2 text-xs text-amber-200">{t.formatGuideSub}</p>
                    <code className="block bg-black/30 p-2 rounded font-mono text-xs break-all">
                        {t.formatExample}
                    </code>
                </div>
                
                <textarea 
                    rows={10}
                    placeholder={language === 'en' ? 
                        `Red Room | Man dies | Truth... | yes | 20 | Sarcastic | Stage2 Scenario | Stage2 Truth | 10` :
                        `红房子 | 汤面... | 汤底... | 是 | 20 | 幽默 | 阶段2汤面 | 阶段2汤底 | 10`
                    }
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-3 text-white font-mono text-sm"
                />
                
                {batchError && <p className="text-red-400 text-sm">{batchError}</p>}
                
                <Button onClick={handleBatchImport} className="w-full">
                    <Upload className="w-4 h-4 mr-2" /> {t.importBtn}
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};