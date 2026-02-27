import React, { useEffect, useState, useRef } from 'react';
import { Marker, MarkerProps } from 'react-leaflet';
import L from 'leaflet';

interface SmoothMarkerProps extends Omit<MarkerProps, 'position'> {
  position: [number, number];
}

export const SmoothMarker: React.FC<SmoothMarkerProps> = ({ position, ...props }) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  const currentPosRef = useRef(position);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const startPosRef = useRef(position);
  const targetPosRef = useRef(position);
  const duration = 2000; // 2 seconds animation to match update interval mostly

  useEffect(() => {
    currentPosRef.current = currentPosition;
  }, [currentPosition]);

  const [lat, lng] = position;

  useEffect(() => {
    // If position hasn't changed effectively, do nothing
    if (lat === targetPosRef.current[0] && lng === targetPosRef.current[1]) {
      return;
    }

    startPosRef.current = currentPosRef.current;
    targetPosRef.current = [lat, lng];
    startTimeRef.current = null;
    
    const animate = (time: number) => {
      if (startTimeRef.current === null) startTimeRef.current = time;
      const progress = (time - startTimeRef.current) / duration;
      
      if (progress < 1) {
        const currentLat = startPosRef.current[0] + (targetPosRef.current[0] - startPosRef.current[0]) * progress;
        const currentLng = startPosRef.current[1] + (targetPosRef.current[1] - startPosRef.current[1]) * progress;
        setCurrentPosition([currentLat, currentLng]);
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPosition(targetPosRef.current);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [lat, lng]); // Trigger when target position changes

  return <Marker position={currentPosition} {...props} />;
};
