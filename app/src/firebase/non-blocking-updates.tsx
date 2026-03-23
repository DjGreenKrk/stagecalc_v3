'use client';

import { pb } from '@/lib/pocketbase';

/**
 * Initiates a create or update operation for a record.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(collectionName: string, id: string, data: any) {
  pb.collection(collectionName).update(id, data).catch(error => {
    console.error(`Error updating document ${collectionName}/${id}:`, error);
    throw error;
  });
}

/**
 * Initiates a create operation for a collection.
 * Does NOT await the write operation internally.
 */
export function addDocumentNonBlocking(collectionName: string, data: any) {
  return pb.collection(collectionName).create(data)
    .catch(error => {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    });
}

/**
 * Initiates an update operation for a record.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(collectionName: string, id: string, data: any) {
  pb.collection(collectionName).update(id, data)
    .catch(error => {
      console.error(`Error updating document ${collectionName}/${id}:`, error);
      throw error;
    });
}

/**
 * Initiates a delete operation for a record.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(collectionName: string, id: string) {
  pb.collection(collectionName).delete(id)
    .catch(error => {
      console.error(`Error deleting document ${collectionName}/${id}:`, error);
      throw error;
    });
}

