import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { storageService } from '../services/storageService';
import { adminService } from '../services/adminService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    userRole: 'admin' | 'user' | 'guest';
    signOut: () => Promise<void>;
    refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRole, setUserRole] = useState<'admin' | 'user' | 'guest'>('guest');

    // 获取用户角色
    const getUserRole = async (userId: string) => {
        try {
            const role = await adminService.getUserRole(userId);
            setUserRole(role);
            setIsAdmin(role === 'admin');
        } catch (error) {
            console.error('Error fetching user role:', error);
            setUserRole('guest');
            setIsAdmin(false);
        }
    };

    // 刷新用户角色
    const refreshUserRole = async () => {
        if (user) {
            await getUserRole(user.id);
        }
    };

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // 获取用户角色
                getUserRole(session.user.id);
                // Sync data on initial load if logged in
                Promise.all([
                    storageService.syncSettings(session.user.id),
                    storageService.syncProgress(session.user.id)
                ]).then(() => setLoading(false));
            } else {
                setUserRole('guest');
                setIsAdmin(false);
                setLoading(false);
            }
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // 获取用户角色
                getUserRole(session.user.id);
                // Sync data on login
                storageService.syncSettings(session.user.id);
                storageService.syncProgress(session.user.id);
            } else {
                setUserRole('guest');
                setIsAdmin(false);
            }

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        setUserRole('guest');
        setIsAdmin(false);
        await supabase.auth.signOut();
    };

    const value = {
        user,
        session,
        loading,
        isAdmin,
        userRole,
        signOut,
        refreshUserRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
