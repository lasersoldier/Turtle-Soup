import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { AppSettings, AIProvider } from '../types';
import { Button } from '../components/Button';
import { ArrowLeft, Key, Lock, Zap, Server } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { user } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        storageService.saveSettings(settings);
        if (user) {
            await storageService.saveRemoteSettings(user.id, settings);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="min-h-screen bg-mystery-900 p-4 md:p-8">
            <div className="max-w-xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 pl-0">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t.backHome}
                </Button>

                <h1 className="text-2xl font-bold text-white mb-6">{t.settings}</h1>

                <div className="bg-mystery-800 rounded-xl border border-mystery-700 overflow-hidden">
                    {/* Free Tier Toggle */}
                    <div className="p-6 border-b border-mystery-700 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-400" /> {t.demoMode}
                            </h3>
                            <p className="text-sm text-mystery-400 mt-1">
                                {t.demoModeDesc}
                            </p>
                        </div>
                        <div
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.useFreeTier ? 'bg-accent' : 'bg-mystery-600'}`}
                            onClick={() => setSettings({ ...settings, useFreeTier: !settings.useFreeTier })}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.useFreeTier ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    {/* API Configuration */}
                    <div className={`p-6 transition-opacity ${settings.useFreeTier ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
                            <Key className="w-4 h-4 text-accent" /> {t.apiKeyConfig}
                        </h3>

                        <div className="space-y-4">
                            {/* Provider Selector */}
                            <div>
                                <label className="block text-sm font-medium text-mystery-300 mb-1">{t.providerLabel}</label>
                                <div className="relative">
                                    <Server className="absolute left-3 top-2.5 w-4 h-4 text-mystery-500" />
                                    <select
                                        value={settings.provider}
                                        onChange={e => setSettings({ ...settings, provider: e.target.value as AIProvider })}
                                        className="w-full bg-mystery-900 border border-mystery-600 rounded-lg pl-10 pr-4 py-2 text-white"
                                    >
                                        <option value="google">Google Gemini</option>
                                        <option value="deepseek">DeepSeek (OpenAI Compatible)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Google Config */}
                            {settings.provider === 'google' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-mystery-300 mb-1">{t.apiKeyLabel}</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-mystery-500" />
                                            <input
                                                type="password"
                                                value={settings.apiKey}
                                                onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                                                placeholder="sk-..."
                                                className="w-full bg-mystery-900 border border-mystery-600 rounded-lg pl-10 pr-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-mystery-300 mb-1">{t.modelLabel}</label>
                                        <select
                                            value={settings.model}
                                            onChange={e => setSettings({ ...settings, model: e.target.value })}
                                            className="w-full bg-mystery-900 border border-mystery-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                                            <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Smart)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* DeepSeek Config */}
                            {settings.provider === 'deepseek' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-mystery-300 mb-1">{t.deepseekKeyLabel}</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-mystery-500" />
                                            <input
                                                type="password"
                                                value={settings.deepseekApiKey}
                                                onChange={e => setSettings({ ...settings, deepseekApiKey: e.target.value })}
                                                placeholder="sk-..."
                                                className="w-full bg-mystery-900 border border-mystery-600 rounded-lg pl-10 pr-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-mystery-300 mb-1">{t.modelLabel}</label>
                                        <select
                                            value={settings.deepseekModel}
                                            onChange={e => setSettings({ ...settings, deepseekModel: e.target.value })}
                                            className="w-full bg-mystery-900 border border-mystery-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            <option value="deepseek-chat">DeepSeek-V3 (Chat)</option>
                                            <option value="deepseek-reasoner">DeepSeek-R1 (Reasoner)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <p className="text-xs text-mystery-500 mt-2">
                                {t.apiKeyDesc}
                            </p>
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                    {saved ? t.saved : t.saveSettings}
                </Button>
            </div>
        </div>
    );
};