/**
 * Analytics Hook
 * 
 * React hook for easy analytics tracking in components
 */

import { useEffect, useRef } from 'react';
import analyticsService from '../services/analytics';

/**
 * Screen tracking hook
 */
export function useScreenTracking(screenName, properties = {}) {
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Screen view track et
    analyticsService.trackScreenView(screenName, properties);

    // Cleanup: Screen exit track et
    return () => {
      const duration = Date.now() - startTimeRef.current;
      analyticsService.trackEvent('screen_exit', {
        screenName,
        duration
      });
    };
  }, [screenName]);
}

/**
 * Performance tracking hook
 */
export function usePerformanceTracking(metricName) {
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();

    return () => {
      const duration = Date.now() - startTimeRef.current;
      analyticsService.trackPerformance(`${metricName}_duration`, duration);
    };
  }, [metricName]);
}

/**
 * Scroll tracking hook
 */
export function useScrollTracking(screenName) {
  const lastScrollDepthRef = useRef(0);

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollDepth = Math.round(
      ((contentOffset.y + layoutMeasurement.height) / contentSize.height) * 100
    );

    // Her %25'te bir track et
    if (scrollDepth >= lastScrollDepthRef.current + 25) {
      lastScrollDepthRef.current = scrollDepth;
      analyticsService.trackScroll(screenName, scrollDepth);
    }
  };

  return { handleScroll };
}

/**
 * Error tracking hook
 */
export function useErrorTracking() {
  const trackError = (error, context = {}) => {
    analyticsService.trackError(error, context);
  };

  return { trackError };
}

/**
 * General analytics hook
 */
export function useAnalytics() {
  return {
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackScreenView: analyticsService.trackScreenView.bind(analyticsService),
    trackProductView: analyticsService.trackProductView.bind(analyticsService),
    trackAddToCart: analyticsService.trackAddToCart.bind(analyticsService),
    trackRemoveFromCart: analyticsService.trackRemoveFromCart.bind(analyticsService),
    trackPurchase: analyticsService.trackPurchase.bind(analyticsService),
    trackSearch: analyticsService.trackSearch.bind(analyticsService),
    trackFilter: analyticsService.trackFilter.bind(analyticsService),
    trackClick: analyticsService.trackClick.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackPerformance: analyticsService.trackPerformance.bind(analyticsService),
  };
}

