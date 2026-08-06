import React from 'react';
import { WifiOff, RotateCw } from 'lucide-react';

interface NoInternetScreenProps {
  onRetry?: () => void;
}

/** Full-screen overlay shown whenever the browser reports it's offline. */
const NoInternetScreen: React.FC<NoInternetScreenProps> = ({ onRetry }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background px-6 text-center"
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-24 w-24 animate-ping rounded-full bg-destructive/20" />
        <span className="absolute inline-flex h-24 w-24 animate-pulse rounded-full bg-destructive/10" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <WifiOff className="h-9 w-9 text-destructive" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">No Internet Connection</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Please check your Wi-Fi or mobile data connection. We'll reconnect automatically once you're back online.
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RotateCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
};

export default NoInternetScreen;
