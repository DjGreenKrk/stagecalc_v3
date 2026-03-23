'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
export { pb };
import { AuthModel } from 'pocketbase';

export interface AuthContextState {
    user: AuthModel | null;
    isValid: boolean;
    isLoading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const PocketBaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthModel | null>(pb.authStore.model);
    const [isValid, setIsValid] = useState<boolean>(pb.authStore.isValid);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        // Initial sync
        setUser(pb.authStore.model);
        setIsValid(pb.authStore.isValid);
        setIsLoading(false);

        // Listen to auth changes
        const unsubscribe = pb.authStore.onChange((token, model) => {
            setUser(model);
            setIsValid(pb.authStore.isValid);
        });

        return () => unsubscribe();
    }, []);

    const logout = () => {
        pb.authStore.clear();
    };

    return (
        <AuthContext.Provider value={{ user, isValid, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within a PocketBaseProvider');
    }
    return context;
};

// Aliases for compatibility during migration if needed
export const useUser = () => {
    const { user, isLoading } = useAuth();
    return { user, isUserLoading: isLoading, userError: null };
};
