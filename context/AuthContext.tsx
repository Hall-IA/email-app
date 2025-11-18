'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) {
                console.error('Session error:', error);
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                localStorage.clear();
                sessionStorage.clear();
                setLoading(false);
                return;
            }

            if (session?.user) {
                try {
                    const { data: existingProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (profileError || !existingProfile) {
                        console.error('Profile error:', profileError);
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                        localStorage.clear();
                        sessionStorage.clear();
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error('Profile check error:', err);
                    await supabase.auth.signOut();
                    setSession(null);
                    setUser(null);
                    localStorage.clear();
                    sessionStorage.clear();
                    setLoading(false);
                    return;
                }
            }

            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch(async (err) => {
            console.error('Failed to get session:', err);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            localStorage.clear();
            sessionStorage.clear();
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            (async () => {
                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    localStorage.clear();
                    sessionStorage.clear();
                    setLoading(false);
                    return;
                }

                if (event === 'SIGNED_IN' && session?.user) {
                    try {
                        const { data: existingProfile } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('id', session.user.id)
                            .maybeSingle();

                        if (!existingProfile) {
                            await supabase.from('profiles').insert({
                                id: session.user.id,
                                email: session.user.email || '',
                                full_name: session.user.user_metadata?.full_name || null,
                            });
                        }
                    } catch (err) {
                        console.error('Profile creation error:', err);
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                        localStorage.clear();
                        sessionStorage.clear();
                        setLoading(false);
                        return;
                    }
                }

                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            })();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string, fullName: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();

            setUser(null);
            setSession(null);

            localStorage.clear();
            sessionStorage.clear();

            window.location.href = '/';
        } catch (err) {
            console.error('Failed to sign out:', err);

            setUser(null);
            setSession(null);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
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
