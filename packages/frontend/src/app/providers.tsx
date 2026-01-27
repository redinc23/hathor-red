import type { ReactNode } from 'react';

import { FeatureFlagsProvider } from '@/features/feature-flags';
import { ErrorBoundary, Fallback } from '@/shared/ui/error-boundary';
import { MonitoringProvider } from '@/shared/lib/monitoring';
import { PerformanceMetrics } from '@/shared/lib/performance';

const analytics =
  (globalThis as unknown as { analytics?: { track: (event: string, payload: unknown) => void } })
    .analytics || {
    track: () => {}
  };

type AppProvidersProps = {
  children: ReactNode;
  user?: { id?: string };
};

export const AppProviders = ({ children, user }: AppProvidersProps) => (
  <ErrorBoundary fallback={<Fallback />}>
    <MonitoringProvider
      dsn={import.meta.env.VITE_SENTRY_DSN}
      environment={import.meta.env.MODE}
      release={import.meta.env.VITE_RELEASE}
    >
      <PerformanceMetrics
        reportWebVitals={(metric) => {
          // Send to analytics pipeline
          analytics.track('web_vital', metric);
        }}
      >
        <FeatureFlagsProvider
          sdkKey={import.meta.env.VITE_FLAGSMITH_KEY}
          identity={user?.id}
        >
          {children}
        </FeatureFlagsProvider>
      </PerformanceMetrics>
    </MonitoringProvider>
  </ErrorBoundary>
);
