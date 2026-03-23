'use client';

import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { RecordModel } from 'pocketbase';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * React hook to subscribe to a single PocketBase record in real-time.
 * 
 * @template T Optional type for document data.
 * @param {string | null | undefined} collectionName - Collection name.
 * @param {string | null | undefined} id - Record ID.
 * @param {object} options - PocketBase fetch options.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  collectionName: string | null | undefined,
  id: string | null | undefined,
  options: any = {}
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!collectionName || !id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Initial fetch
    pb.collection(collectionName).getOne<RecordModel>(id, options)
      .then((record) => {
        setData(record as unknown as StateDataType);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.status === 404) {
          setData(null);
        } else {
          console.error(`useDoc error (${collectionName}/${id}):`, err);
          setError(err);
        }
        setIsLoading(false);
      });

    // Real-time subscription
    const unsubscribePromise = pb.collection(collectionName).subscribe(id, (e) => {
      if (e.action === 'delete') {
        setData(null);
      } else {
        setData(e.record as unknown as StateDataType);
      }
    }, options);

    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe());
    };
  }, [collectionName, id, JSON.stringify(options)]);

  return { data, isLoading, error };
}