import { supabase } from '../lib/supabase';

export interface UserData {
    id?: string; // Supabase UUID
    name: string;
    email: string;
    phone: string;
    postalCode: string;
    language?: 'es' | 'en';
    isVerified?: boolean;
}

// Validation logic remains the same
export const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone: string): boolean => {
    return /^(\+34|0034|34)?[6789]\d{8}$/.test(phone.replace(/\s/g, ''));
};

export const validatePostalCode = (cp: string): boolean => {
    if (!/^\d{5}$/.test(cp)) return false;
    const province = parseInt(cp.substring(0, 2), 10);
    return province >= 1 && province <= 52;
};

// --- SUPABASE INTEGRATION ---

export const saveUser = async (userData: UserData): Promise<void> => {
    // 1. Sign Up the user in Supabase Auth
    // We treat the "Phone" as the password for this specific app request
    // IMPORTANT: The profile is now created automatically by a Database Trigger in Supabase!

    const { error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.phone, // Password = Phone
        options: {
            emailRedirectTo: window.location.origin,
            data: {
                name: userData.name,
                phone: userData.phone,
                postal_code: userData.postalCode,
                language: userData.language || 'es'
            }
        }
    });

    if (authError) {
        console.error("Signup error:", authError);
        throw new Error(authError.message);
    }
};

export const getUsers = async (): Promise<UserData[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        postalCode: u.postal_code, // Map snake_case to camelCase
        language: u.language,
        isVerified: u.is_verified
    }));
};

export const getUserProfile = async (uid: string): Promise<UserData | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        postalCode: data.postal_code,
        language: data.language,
        isVerified: data.is_verified
    };
};

export const verifyUser = async (email: string): Promise<boolean> => {
    // Determine UID from email (requires Admin rights usually)
    // OR we change this function to just accept the verification call if we know the user
    // Since this is client-side, we can't easily verify BY EMAIL without exposing a text search.
    // However, for this demo "Simulation", we will try to find the user in the public list 
    // (if RLS allows) or fail.

    // Better Approach for Demo:
    // We fetch the user by email (if policy allows) and then update.

    const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (data && data.id) {
        const { error: updateError } = await supabase
            .from('users')
            .update({ is_verified: true })
            .eq('id', data.id);

        return !updateError;
    }
    return false;
};
