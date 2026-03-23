'use client';

import { useState, useEffect, useTransition } from 'react';
import { pb } from '@/lib/pocketbase';
import { RecordModel } from 'pocketbase';

/** Utility type to add an 'cid' (id) field to a given type T for consistency if needed, 
 * but PocketBase already has 'id'. We'll use WithId for compatibility. */
export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
  setData: React.Dispatch<React.SetStateAction<WithId<T>[] | null>>;
}

/**
 * React hook to subscribe to a PocketBase collection in real-time.
 * 
 * @template T Type for document data.
 * @param {string | null | undefined} collectionName - The name of the PocketBase collection.
 * @param {object} options - PocketBase list options (filters, sort, etc.)
 */
export function useCollection<T = any>(
  collectionName: string | null | undefined,
  options: any = {}
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!collectionName) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Initial fetch
    pb.collection(collectionName).getFullList<RecordModel>(options)
      .then((records) => {
        startTransition(() => {
          setData(records as unknown as ResultItemType[]);
        });
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(`useCollection error (${collectionName}):`, err);
        setError(err);
        setIsLoading(false);
      });

    // Real-time subscription
    const unsubscribePromise = pb.collection(collectionName).subscribe('*', (e) => {
      // Refresh the whole list on any change for simplicity, 
      // or we could optimistically update the state.
      // For now, let's just refetch to ensure correctness with filters/sort.
      pb.collection(collectionName).getFullList<RecordModel>(options)
        .then((records) => {
          startTransition(() => {
            setData(records as unknown as ResultItemType[]);
          });
        });
    }, options);

    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe());
    };
  }, [collectionName, JSON.stringify(options)]);

  return { data, isLoading: isLoading || isPending, error, setData };
}

