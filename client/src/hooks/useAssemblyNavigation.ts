import { useMemo } from 'react';
import type { AssemblySummary } from '../types/assembly';

interface UseAssemblyNavigationReturn {
  prevAssembly: AssemblySummary | null;
  nextAssembly: AssemblySummary | null;
  currentIndex: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const useAssemblyNavigation = (
  currentId: string | undefined,
  sortedAssemblies: AssemblySummary[]
): UseAssemblyNavigationReturn => {
  const { currentIndex, prevAssembly, nextAssembly } = useMemo(() => {
    if (!currentId) {
      return { currentIndex: -1, prevAssembly: null, nextAssembly: null };
    }

    const index = sortedAssemblies.findIndex((a) => a.id === currentId);
    return {
      currentIndex: index,
      prevAssembly: index < sortedAssemblies.length - 1 ? sortedAssemblies[index + 1] : null,
      nextAssembly: index > 0 ? sortedAssemblies[index - 1] : null,
    };
  }, [currentId, sortedAssemblies]);

  return {
    prevAssembly,
    nextAssembly,
    currentIndex,
    hasPrevious: !!prevAssembly,
    hasNext: !!nextAssembly,
  };
};
