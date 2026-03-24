'use client';
import { pb } from '@/lib/pocketbase';

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(email: string, password: string): void {
  pb.collection('users').authWithPassword(email, password)
    .catch(error => {
      console.error("PocketBase login error:", error);
    });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(email: string, password: string, additionalData: any = {}): void {
  pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    ...additionalData
  })
    .then(() => {
      return pb.collection('users').authWithPassword(email, password);
    })
    .catch(error => {
      console.error("PocketBase signup error:", error);
    });
}

/** Placeholder for anonymous sign-in if needed, though PB doesn't have it natively. */
export function initiateAnonymousSignIn(): void {
  // Legacy Firebase code has been removed.
  console.warn("PocketBase does not support anonymous sign-in natively. Consider using a guest account or skipping auth.");
}
