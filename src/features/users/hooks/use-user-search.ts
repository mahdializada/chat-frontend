'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { usersService } from '../services/users-service';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useUserSearch(term: string) {
  const debouncedTerm = useDebouncedValue(term.trim());
  return useQuery({
    queryKey: queryKeys.users(debouncedTerm),
    queryFn: () => usersService.search(debouncedTerm),
    enabled: debouncedTerm.length >= 2,
    staleTime: 30_000,
  });
}
