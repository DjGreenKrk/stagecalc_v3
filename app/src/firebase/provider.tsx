'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { initializeFirebaseApp } from '.';

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<{children: ReactNode}> = ({
  children
}) => {
  const [services, setServices] = useState<{
    firebaseApp: FirebaseApp,
    firestore: Firestore,
    auth: Auth,
  } | null>(null);

  const [userAuthState, setUserAuthState] = useState<UserHookResult>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    // Delay initialization to allow pages like /login to load without WebSockets first
    const timer = setTimeout(() => {
      try {
        const app = initializeFirebaseApp();
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        
        // Ensure offline persistence is enabled
        enableIndexedDbPersistence(firestore)
          .catch((err) => {
            if (err.code == 'failed-precondition') {
              console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code == 'unimplemented') {
              console.warn('The current browser does not support all of the features required to enable persistence.');
            }
          });

        setServices({ firebaseApp: app, auth, firestore });

        const unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            setUserAuthState({ user, isUserLoading: false, userError: null });
          },
          (error) => {
            console.error("FirebaseProvider: onAuthStateChanged error:", error);
            setUserAuthState({ user: null, isUserLoading: false, userError: error });
          }
        );
        return () => unsubscribe();
      } catch (error) {
        console.error("FirebaseProvider: Initialization error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error instanceof Error ? error : new Error('Failed to initialize Firebase') });
      }
    }, 0); // setTimeout with 0ms delay defers execution until after the current call stack clears

    return () => clearTimeout(timer);
  }, []);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    return {
      areServicesAvailable: !!services,
      firebaseApp: services?.firebaseApp || null,
      firestore: services?.firestore || null,
      auth: services?.auth || null,
      ...userAuthState,
    };
  }, [services, userAuthState]);
  
  if (userAuthState.isUserLoading) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Ładowanie...</p>
      </div>
    )
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  return context;
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) {
    throw new Error('Auth service not available. Check FirebaseProvider props.');
  }
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
   if (!firestore) {
    throw new Error('Firestore service not available. Check FirebaseProvider props.');
  }
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
   if (!firebaseApp) {
    throw new Error('Firebase App not available. Check FirebaseProvider props.');
  }
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
