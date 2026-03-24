'use client';

// This file is a stub to prevent build errors during migration.
// Firebase has been removed from the project.
// If you need structured error handling for PocketBase, implement it in a separate lib.

export class FirestorePermissionError extends Error {
  constructor(context: any) {
    super('PocketBase Permission Error');
    this.name = 'PBError';
  }
}
