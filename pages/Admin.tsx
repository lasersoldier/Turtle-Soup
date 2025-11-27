import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/adminService';
import { storageService } from '../services/storageService';
import { Button } from '../components/Button';

export default function Admin() {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [admins, setAdmins] = useState<string[]>([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalGames: 0,
        totalSettings: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [emailInput, setEmailInput] = useState('');
    const [settingKey, setSettingKey] = useState('');
    const [settingValue, setSettingValue] = useState('');
    const [adminEmail, setAdminEmail] = useState('');

    useEffect(() => {
        if (!user || !isAdmin) {
            navigate('/');
            return;
        }

        const loadAdminData = async () => {
            try {
                // 获取管理员列表
                const adminList = await adminService.getAdminList();
                setAdmins(adminList);

                // 获取统计信息
                const allSettings = await storageService.getAllSettings();
                const totalSettings = Object.keys(allSettings).length;
                
                setStats({
                    totalUsers: totalSettings,
                    totalGames: totalSettings,
                    totalSettings
                });

            } catch (error) {
                console.error('Error loading admin data:', error);
                setError('加载管理员数据时出错');
            } finally {
                setLoading(false);
            }
        };

        loadAdminData();
    }, [user, isAdmin, navigate]);

    const handleMakeAdmin = async (email: string) => {
        try {
            if (!email) {
                alert('请输入邮箱地址');
                return;
            }

            const success = await adminService.setUserRoleByEmail(email, 'admin');
            if (success) {
                alert(`已成功将 ${email} 设置为管理员`);
                // 刷新管理员列表
                const adminList = await adminService.getAdminList();
                setAdmins(adminList);
                setEmailInput('');
            } else {
                alert('设置管理员失败，请检查邮箱地址是否正确或联系系统管理员');
            }
        } catch (error) {
            console.error('Error making user admin:', error);
            alert('设置管理员时发生错误');
        }
    };

    const handleRemoveAdmin = async (email: string) => {
        try {
            if (email === user?.email) {
                alert('不能移除自己的管理员权限');
                return;
            }

            const success = await adminService.setUserRole(email, 'user');
            if (success) {
                alert(`已成功移除 ${email} 的管理员权限`);
                // 刷新管理员列表
                const adminList = await adminService.getAdminList();
                setAdmins(adminList);
            } else {
                alert('移除管理员权限失败');
            }
        } catch (error) {
            console.error('Error removing admin:', error);
            alert('移除管理员权限时发生错误');
        }
    };

    const handleAddSystemSetting = async () => {
        try {
            if (!settingKey || !settingValue) {
                alert('请输入设置键和值');
                return;
            }

            // 这里可以添加系统设置逻辑
            alert(`设置 ${settingKey} = ${settingValue} 已保存`);
            setSettingKey('');
            setSettingValue('');
        } catch (error) {
            console.error('Error adding system setting:', error);
            alert('添加系统设置时发生错误');
        }
    };

    if (!user || !isAdmin) {
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 text-white p-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-center mb-8">管理员面板</h1>
                    <div className="text-center">加载中...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* 头部 */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-4">管理员面板</h1>
                    <p className="text-gray-300">欢迎，{user.email}</p>
                    <Button 
                        onClick={() => navigate('/')}
                        className="mt-4"
                    >
                        返回首页
                    </Button>
                </div>

                {error && (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 统计卡片 */}
                    <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold mb-4">系统统计</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-300">{stats.totalUsers}</div>
                                <div className="text-sm text-gray-300">总用户数</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-300">{stats.totalGames}</div>
                                <div className="text-sm text-gray-300">总游戏数</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-300">{stats.totalSettings}</div>
                                <div className="text-sm text-gray-300">总设置数</div>
                            </div>
                        </div>
                    </div>

                    {/* 管理员列表 */}
                    <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold mb-4">管理员列表</h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {admins.map((email, index) => (
                                <div key={index} className="flex justify-between items-center bg-white bg-opacity-10 rounded p-3">
                                    <span className="text-sm">{email}</span>
                                    {email !== user.email && (
                                        <Button
                                            onClick={() => handleRemoveAdmin(email)}
                                            className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600"
                                        >
                                            移除
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 border-t border-white border-opacity-20 pt-4">
                            <h3 className="text-sm font-semibold mb-2">添加管理员</h3>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="输入邮箱地址"
                                    className="flex-1 px-3 py-2 rounded bg-white bg-opacity-10 border border-white border-opacity-20 text-white placeholder-gray-300"
                                />
                                <Button
                                    onClick={() => handleMakeAdmin(emailInput)}
                                    className="px-4 py-2"
                                >
                                    添加
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* 系统设置 */}
                    <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold mb-4">系统设置</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">设置键</label>
                                <input
                                    type="text"
                                    value={settingKey}
                                    onChange={(e) => setSettingKey(e.target.value)}
                                    placeholder="例如: maxGamesPerDay"
                                    className="w-full px-3 py-2 rounded bg-white bg-opacity-10 border border-white border-opacity-20 text-white placeholder-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">设置值</label>
                                <input
                                    type="text"
                                    value={settingValue}
                                    onChange={(e) => setSettingValue(e.target.value)}
                                    placeholder="例如: 10"
                                    className="w-full px-3 py-2 rounded bg-white bg-opacity-10 border border-white border-opacity-20 text-white placeholder-gray-300"
                                />
                            </div>
                            <Button
                                onClick={handleAddSystemSetting}
                                className="w-full"
                            >
                                保存设置
                            </Button>
                        </div>
                    </div>

                    {/* 用户管理 */}
                    <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold mb-4">用户管理</h2>
                        <div className="space-y-3">
                            <Button
                                onClick={() => alert('用户管理功能开发中...')}
                                className="w-full"
                            >
                                查看所有用户
                            </Button>
                            <Button
                                onClick={() => alert('用户统计功能开发中...')}
                                className="w-full"
                            >
                                用户活动统计
                            </Button>
                            <Button
                                onClick={() => alert('数据导出功能开发中...')}
                                className="w-full"
                            >
                                导出用户数据
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}