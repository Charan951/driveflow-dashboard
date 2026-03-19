
import React, { useContext } from 'react';
import { TrackingContext } from '@/context/TrackingContext';
import { Navigation } from 'lucide-react';

const LiveTracker: React.FC<{ className?: string }> = ({ className }) => {
  const context = useContext(TrackingContext);

  if (!context) {
    return <div>Loading...</div>; // Or some other fallback
  }

  const { 
    isTracking, 
    error, 
    startTracking, 
    stopTracking 
  } = context;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Live Status</h3>
        </div>
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            isTracking ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              isTracking ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className={`flex items-center p-2 rounded-md ${
        isTracking ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
      }`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-xs font-medium">
          {isTracking ? 'Online & Tracking' : 'Offline'}
        </span>
      </div>

      {error && (
        <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded-md mt-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default LiveTracker;
