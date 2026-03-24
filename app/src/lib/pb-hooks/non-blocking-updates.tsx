'use client';

import { pb } from '@/lib/pocketbase';

/**
 * Initiates a create or update operation for a record.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(collectionName: string, id: string, data: any) {
  pb.collection(collectionName).update(id, data).catch(error => {
    console.error(`[PB Error] Failed to set document in "${collectionName}" (ID: ${id}):`, error);
    throw error;
  });
}

/**
 * Initiates a create operation for a collection.
 * Does NOT await the write operation internally.
 */
export function addDocumentNonBlocking(collectionName: string, data: any) {
  if (!collectionName) {
    console.error("[PB Error] addDocumentNonBlocking called with empty collectionName! Data:", data);
    return Promise.reject(new Error("Collection name is required"));
  }
  console.log(`[PB Debug] Attempting to add document to "${collectionName}"`, data);
  return pb.collection(collectionName).create(data)
    .catch(error => {
      console.error(`[PB Error] Failed to add document to "${collectionName}". Data:`, data, "Error:", error);
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
      console.error(`[PB Error] Failed to update document in "${collectionName}" (ID: ${id}):`, error);
      console.error("Update attempted:", data);
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
      console.error(`[PB Error] Failed to delete document from "${collectionName}" (ID: ${id}):`, error);
      throw error;
    });
}

