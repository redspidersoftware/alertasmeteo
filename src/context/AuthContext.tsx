import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { type UserData, getUserProfile } from '../services/userService';

interface AuthContextType {
    user: UserData | null;
    login: (email: string, phone: string) => Promise<boolean>; // Keeping signature, phone acts as password
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserData | null>(null);

    const fetchProfile = async (uid: string, email: string, userMetadata?: any) => {
        console.log("Fetching profile for", uid);
        let profile = await getUserProfile(uid);
        if (!profile) {
            // Profile doesn't exist in public.users (e.g. Google OAuth signup). Let's create it automatically.
            const name = userMetadata?.full_name || userMetadata?.name || email.split('@')[0];
            const defaultProfile = {
                id: uid,
                email: email,
                name: name,
                phone: '',
                postalCode: '28001', // default postal code
                language: 'es' as const,
                isVerified: true, // Google accounts are pre-verified
                preferredSeverities: ['yellow', 'orange', 'red', 'green'],
                preferredEventTypes: [],
                dailyForecast: true
            };

            try {
                const { error: dbError } = await supabase
                    .from('users')
                    .insert({
                        id: uid,
                        email: email,
                        name: defaultProfile.name,
                        phone: defaultProfile.phone,
                        postal_code: defaultProfile.postalCode,
                        language: defaultProfile.language,
                        is_verified: defaultProfile.isVerified,
                        preferred_severities: defaultProfile.preferredSeverities,
                        preferred_event_types: defaultProfile.preferredEventTypes,
                        daily_forecast: defaultProfile.dailyForecast
                    });

                if (!dbError) {
                    profile = defaultProfile;
                } else {
                    console.error("Error creating auto profile:", dbError.message);
                }
            } catch (err) {
                console.error("Exception creating auto profile:", err);
            }
        }

        if (profile) {
            setUser(profile);
        } else {
            // Fallback if profile doesn't exist yet and DB insert failed
            setUser({
                id: uid,
                email: email,
                name: userMetadata?.full_name || userMetadata?.name || 'User',
                phone: '',
                postalCode: '',
                language: 'es',
                isVerified: false
            });
        }
    };

    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
        }
    };

    useEffect(() => {
        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
            }
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, phone: string): Promise<boolean> => {
        // Using Phone as Password for this demo (User requested Phone as 'password')
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: phone,
        });

        if (error) {
            console.error("Login error:", error.message);
            return false;
        }
        return !!data.user;
    };

    const loginWithGoogle = async (): Promise<void> => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            console.error("Google login error:", error.message);
            throw new Error(error.message);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const resetPassword = async (email: string): Promise<void> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw new Error(error.message);
    };

    return (
        <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, refreshProfile, resetPassword, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
