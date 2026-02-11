import React from 'react';
import { useTracking } from '@/context/TrackingContext';
import { Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

const LiveTracker: React.FC<{ className?: string }> = ({ className }) => {
  const { 
    isTracking, 
    location, 
    error, 
    lastUpdate, 
    lastServerSync, 
    startTracking, 
    stopTracking 
  } = useTracking();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-500" />
            Live Status
          </h3>
          <p className="text-xs text-gray-500 hidden sm:block">Share location</p>
        </div>
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isTracking ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isTracking ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="space-y-4">
        <div className={`flex items-center p-3 rounded-lg ${
          isTracking ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-3 ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="font-medium text-sm">
            {isTracking ? 'You are Online & Tracking' : 'You are Offline'}
          </span>
        </div>

        {isTracking && location && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-sm space-y-2"
          >
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Latitude:</span>
              <span className="font-mono">{location.lat.toFixed(6)}</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Longitude:</span>
              <span className="font-mono">{location.lng.toFixed(6)}</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400 border-t pt-2 dark:border-gray-700">
              <span>Last Update:</span>
              <span>{lastUpdate ? lastUpdate.toLocaleTimeString() : '-'}</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Server Sync:</span>
              <span>{lastServerSync ? lastServerSync.toLocaleTimeString() : 'Pending...'}</span>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTracker;
