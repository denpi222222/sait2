import { useEffect, useRef } from 'react';

/**
 * Safe interval hook that automatically cleans up and prevents memory leaks
 * @param callback Function to call on each interval
 * @param delay Delay in milliseconds, null to pause
 * @param deps Dependencies array to control when interval should restart
 */
export function useSafeInterval(
  callback: () => void,
  delay: number | null,
  deps: React.DependencyList = []
) {
  const savedCallback = useRef<() => void>();
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }

    // Clear any existing interval
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }

    // Set up new interval if delay is not null
    if (delay !== null) {
      intervalId.current = setInterval(tick, delay);
    }

    // Cleanup function
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [delay, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, []);
}

/**
 * Conditional interval hook - only runs when condition is true
 * @param callback Function to call on each interval
 * @param delay Delay in milliseconds
 * @param condition Whether the interval should be active
 * @param deps Additional dependencies
 */
export function useConditionalInterval(
  callback: () => void,
  delay: number,
  condition: boolean,
  deps: React.DependencyList = []
) {
  useSafeInterval(callback, condition ? delay : null, [condition, ...deps]);
}

export default useSafeInterval;
