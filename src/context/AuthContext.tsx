import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { type UserData, getUserProfile } from '../services/userService';

interface AuthContextType {
    user: UserData | null;
    login: (email: string, phone: string) => Promise<boolean>; // Keeping signature, phone acts as password
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserData | null>(null);

    const fetchProfile = async (uid: string, email: string) => {
        console.log("Fetching profile for", uid);
        const profile = await getUserProfile(uid);
        if (profile) {
            setUser(profile);
        } else {
            // Fallback if profile doesn't exist yet (race condition on signup)
            setUser({
                id: uid, // Add ID to UserData type if missing
                email: email,
                name: 'User',
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
            await fetchProfile(session.user.id, session.user.email!);
        }
    };

    useEffect(() => {
        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
            }
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
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

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshProfile, isAuthenticated: !!user }}>
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
