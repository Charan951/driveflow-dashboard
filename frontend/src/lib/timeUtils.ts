/**
 * Utility functions for time-based operations
 */

/**
 * Get time-based greeting in IST (Indian Standard Time)
 * @returns Appropriate greeting based on current IST time
 */
export const getTimeBasedGreeting = (): string => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const hour = istTime.getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning! 🌅';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon! ☀️';
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening! 🌆';
  } else {
    return 'Good Night! 🌙';
  }
};

/**
 * Get current time in IST
 * @returns Date object representing current IST time
 */
export const getCurrentISTTime = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};

/**
 * Format time in IST
 * @param date - Date to format (defaults to current time)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string in IST
 */
export const formatISTTime = (
  date: Date = new Date(),
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }
): string => {
  return date.toLocaleTimeString('en-IN', options);
};