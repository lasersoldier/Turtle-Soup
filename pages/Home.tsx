import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Puzzle } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Plus, Settings, Play, Trash2, Trophy, Languages, Edit2, LogOut, Shield, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/adminService';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { signOut, isAdmin, user, userRole } = useAuth();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Reload puzzles whenever language changes
    setPuzzles(storageService.getPuzzles(language));
    
    // Debug: Show user permission info
    if (user) {
      const debugMessage = `用户: ${user.email}\n权限状态: ${userRole}\n是否为管理员: ${isAdmin}\nApp Metadata: ${JSON.stringify(user.app_metadata)}\nUser Metadata: ${JSON.stringify(user.user_metadata)}`;
      setDebugInfo(debugMessage);
      console.log('=== 用户权限调试信息 ===');
      console.log('用户:', user);
      console.log('当前角色:', userRole);
      console.log('是否管理员:', isAdmin);
      console.log('App Metadata:', user.app_metadata);
      console.log('User Metadata:', user.user_metadata);
    }
  }, [language, user, userRole, isAdmin]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    // Crucial: Stop propagation immediately
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      storageService.deletePuzzle(deleteId, language);
      setPuzzles(storageService.getPuzzles(language));
      setDeleteId(null);
    }
  };

  const handlePlayClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/game/${id}`);
  };

  const handleEditClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/create?edit=true&puzzleId=${id}`);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="min-h-screen bg-mystery-900 p-4 md:p-8">
      <Modal
        isOpen={!!deleteId}
        title={t.attention}
        message={t.deleteConfirm}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-mystery-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
              {t.appTitle}
            </h1>
            <p className="text-mystery-400 mt-1">{t.appSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button variant="ghost" onClick={toggleLanguage} className="bg-mystery-800 border border-mystery-700">
              <Languages className="w-4 h-4 mr-2" />
              {language === 'en' ? 'English' : '中文'}
            </Button>
            {isAdmin && (
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin')} 
                className="bg-amber-600 hover:bg-amber-700 text-white border border-amber-500"
                title={language === 'zh' ? '管理员面板' : 'Admin Panel'}
              >
                <Shield className="w-4 h-4 mr-2" />
                {language === 'zh' ? '管理' : 'Admin'}
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => navigate('/create')} className="flex-1 md:flex-none">
                <Plus className="w-4 h-4 mr-2" /> {t.createSoup}
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/settings')} className="flex-1 md:flex-none">
              <Settings className="w-4 h-4 mr-2" /> {t.settings}
            </Button>
            <Button variant="ghost" onClick={signOut} className="bg-mystery-800 border border-mystery-700 text-red-400 hover:text-red-300">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Puzzle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {puzzles.map((puzzle) => (
            <div
              key={puzzle.id}
              onClick={() => navigate(`/game/${puzzle.id}`)}
              className="group bg-mystery-800 border border-mystery-700 rounded-xl p-5 hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
            >
              {puzzle.isChallenge && (
                <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> {language === 'zh' ? '挑战' : 'Challenge'}
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-mystery-100 mb-2 pr-12">{puzzle.title}</h3>
                <p className="text-mystery-400 text-sm line-clamp-3 mb-4 font-light">
                  {puzzle.content}
                </p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-mystery-700/50 relative">
                <span className="text-xs text-mystery-500 bg-mystery-900 px-2 py-1 rounded">
                  {puzzle.maxQuestions ? `${puzzle.maxQuestions} ${language === 'zh' ? '次提问' : 'Questions Max'}` : (language === 'zh' ? '无限提问' : 'Unlimited')}
                </span>

                {/* Action Buttons Wrapper - Added relative and z-index */}
                <div
                  className="flex gap-2 relative z-30"
                  onClick={(e) => e.stopPropagation()} // Stop propagation for the container too
                >
                  {isAdmin && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => handleEditClick(e, puzzle.id)}
                      className="h-8 w-8 p-0 hover:scale-110 transition-transform"
                      title={language === 'zh' ? '编辑' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={(e) => handlePlayClick(e, puzzle.id)}
                    className="h-8 w-8 p-0 bg-accent text-white hover:scale-110 transition-transform"
                    title={language === 'zh' ? '开始' : 'Play'}
                  >
                    <Play className="w-4 h-4 ml-0.5" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => handleDeleteClick(e, puzzle.id)}
                      className="h-8 w-8 p-0 hover:scale-110 transition-transform"
                      title={language === 'zh' ? '删除' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {puzzles.length === 0 && (
            <div className="col-span-full text-center py-12 bg-mystery-800/50 rounded-xl border border-dashed border-mystery-700">
              <p className="text-mystery-400">{t.noPuzzles}</p>
            </div>
          )}
        </div>

        {/* Debug Info Panel */}
        {debugInfo && (
          <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 rounded-lg p-4 max-w-md text-xs text-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-bold">调试信息</span>
            </div>
            <pre className="whitespace-pre-wrap break-words">{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
};