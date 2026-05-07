import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook genérico para carregar dados da API
 */
export function useFetchData<T>(
  fetchFn: () => Promise<T[]>,
  dependency: any[] = []
): UseDataState<T> & { refetch: () => Promise<void> } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, dependency);

  return { data, loading, error, refetch };
}

/**
 * Hook para criar dados
 */
export function useCreateData<T>(
  createFn: (item: Omit<T, 'id'>) => Promise<T>,
  onSuccess?: (item: T) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (item: Omit<T, 'id'>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await createFn(item);
        toast.success('Item criado com sucesso!');
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao criar item';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [createFn, onSuccess]
  );

  return { create, loading, error };
}

/**
 * Hook para atualizar dados
 */
export function useUpdateData<T extends { id: number }>(
  updateFn: (id: number, item: Partial<T>) => Promise<T>,
  onSuccess?: (item: T) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (id: number, item: Partial<T>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await updateFn(id, item);
        toast.success('Item atualizado com sucesso!');
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar item';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateFn, onSuccess]
  );

  return { update, loading, error };
}

/**
 * Hook para deletar dados
 */
export function useDeleteData(
  deleteFn: (id: number) => Promise<void>,
  onSuccess?: (id: number) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delete_ = useCallback(
    async (id: number) => {
      if (!confirm('Tem certeza que deseja deletar este item?')) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await deleteFn(id);
        toast.success('Item deletado com sucesso!');
        onSuccess?.(id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar item';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [deleteFn, onSuccess]
  );

  return { delete: delete_, loading, error };
}
