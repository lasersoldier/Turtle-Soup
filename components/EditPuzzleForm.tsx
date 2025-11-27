import React, { useState, useEffect } from 'react';
import { Puzzle, PuzzleStage, Language } from '../types';
import { useTranslations } from '../utils/translations';
import { Button } from './Button';
import { Plus, Trash2 } from 'lucide-react';

interface EditPuzzleFormProps {
  puzzle: Puzzle;
  onSave: (updatedPuzzle: Puzzle) => void;
  onCancel: () => void;
  language: Language;
}

export const EditPuzzleForm: React.FC<EditPuzzleFormProps> = ({ puzzle, onSave, onCancel, language }) => {
  const t = useTranslations(language);
  const [formData, setFormData] = useState<Partial<Puzzle>>({});
  const [stages, setStages] = useState<PuzzleStage[]>([]);

  // 初始化表单数据
  useEffect(() => {
    if (puzzle) {
      setFormData({
        title: puzzle.title,
        content: puzzle.content,
        answer: puzzle.answer,
        isChallenge: puzzle.isChallenge,
        maxQuestions: puzzle.maxQuestions,
        persona: puzzle.persona,
        winCondition: puzzle.winCondition,
      });
      setStages(puzzle.stages || []);
    }
  }, [puzzle]);

  const addStage = () => {
    setStages([
      ...stages,
      {
        id: Date.now().toString(),
        content: '',
        answer: '',
        unlockType: 'ai_judgement',
        maxQuestions: formData.isChallenge ? 10 : undefined,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.answer) return;

    // 验证阶段数据
    if (stages.length > 0) {
      for (const s of stages) {
        if (!s.content || !s.answer) {
          alert(language === 'zh' ? '请完善所有阶段的汤面和汤底' : 'Please fill in scenario and truth for all stages');
          return;
        }
      }
    }

    const updatedPuzzle: Puzzle = {
      ...puzzle,
      title: formData.title!,
      content: formData.content!,
      answer: formData.answer!,
      isChallenge: !!formData.isChallenge,
      maxQuestions: formData.isChallenge ? Number(formData.maxQuestions) : undefined,
      persona: formData.persona,
      winCondition: formData.winCondition as any,
      stages: stages.length > 0 ? stages : undefined
    };

    onSave(updatedPuzzle);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-mystery-800 p-6 rounded-xl border border-mystery-700">
      <div>
        <label className="block text-sm font-medium text-mystery-300 mb-1">{t.titleLabel}</label>
        <input 
          required
          type="text" 
          value={formData.title || ''} 
          onChange={e => setFormData({...formData, title: e.target.value})}
          className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-mystery-300 mb-1">{t.scenarioLabel}</label>
        <textarea 
          required
          rows={3}
          value={formData.content || ''} 
          onChange={e => setFormData({...formData, content: e.target.value})}
          className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-mystery-300 mb-1">{t.truthLabel}</label>
        <textarea 
          required
          rows={3}
          value={formData.answer || ''} 
          onChange={e => setFormData({...formData, answer: e.target.value})}
          className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4 bg-mystery-900/50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="isChallenge"
            checked={formData.isChallenge || false}
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
                  value={formData.maxQuestions || 20} 
                  onChange={e => setFormData({...formData, maxQuestions: parseInt(e.target.value)})}
                  className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-1.5 text-white"
               />
          </div>
        )}
      </div>

      {/* 阶段部分 */}
      <div className="space-y-4 border-l-2 border-mystery-700 pl-4 mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-mystery-200">{t.stagesSection}</h3>
          <Button type="button" size="sm" variant="secondary" onClick={addStage}>
            <Plus className="w-3 h-3 mr-1" /> {t.addStage}
          </Button>
        </div>
        
        {stages.map((stage, index) => (
          <div key={stage.id || index} className="bg-mystery-900/50 p-4 rounded-lg border border-mystery-700 relative">
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
              {/* 每个阶段的问题限制（仅在挑战模式下显示） */}
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
          value={formData.persona || ''} 
          onChange={e => setFormData({...formData, persona: e.target.value})}
          className="w-full bg-mystery-900 border border-mystery-600 rounded-lg p-2.5 text-white"
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">{t.cancelEdit}</Button>
        <Button type="submit" className="flex-1">{t.saveBtn}</Button>
      </div>
    </form>
  );
};
