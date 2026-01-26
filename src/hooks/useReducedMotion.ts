/**
 * useReducedMotion Hook
 * 
 * Detects if the user has enabled prefers-reduced-motion in their system settings.
 * Returns true if animations should be disabled.
 * 
 * **Validates: Requirements 9.4**
 */

import { useEffect, useState } from 'react';

/**
 * Hook to detect prefers-reduced-motion media query
 * 
 * @returns {boolean} true if user prefers reduced motion, false otherwise
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener (use addEventListener for better browser support)
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
