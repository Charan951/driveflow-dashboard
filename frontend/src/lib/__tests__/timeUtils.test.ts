/**
 * Tests for time utility functions
 */

import { getTimeBasedGreeting, getCurrentISTTime, formatISTTime } from '../timeUtils';

// Mock Date to test different times
const mockDate = (hour: number, minute: number = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  // Adjust for IST offset (subtract 5.5 hours to simulate UTC time that would result in the desired IST time)
  const utcTime = new Date(date.getTime() - (5.5 * 60 * 60 * 1000));
  jest.spyOn(global, 'Date').mockImplementation(() => utcTime);
  return utcTime;
};

describe('timeUtils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTimeBasedGreeting', () => {
    it('should return Good Morning for early morning hours (5-11)', () => {
      mockDate(8); // 8 AM IST
      expect(getTimeBasedGreeting()).toBe('Good Morning! 🌅');
    });

    it('should return Good Afternoon for afternoon hours (12-16)', () => {
      mockDate(14); // 2 PM IST
      expect(getTimeBasedGreeting()).toBe('Good Afternoon! ☀️');
    });

    it('should return Good Evening for evening hours (17-20)', () => {
      mockDate(19); // 7 PM IST
      expect(getTimeBasedGreeting()).toBe('Good Evening! 🌆');
    });

    it('should return Good Night for night hours (21-4)', () => {
      mockDate(23); // 11 PM IST
      expect(getTimeBasedGreeting()).toBe('Good Night! 🌙');
    });

    it('should return Good Night for early morning hours (0-4)', () => {
      mockDate(2); // 2 AM IST
      expect(getTimeBasedGreeting()).toBe('Good Night! 🌙');
    });

    it('should handle boundary cases correctly', () => {
      // Test boundary at 5 AM (start of morning)
      mockDate(5);
      expect(getTimeBasedGreeting()).toBe('Good Morning! 🌅');

      // Test boundary at 12 PM (start of afternoon)
      mockDate(12);
      expect(getTimeBasedGreeting()).toBe('Good Afternoon! ☀️');

      // Test boundary at 5 PM (start of evening)
      mockDate(17);
      expect(getTimeBasedGreeting()).toBe('Good Evening! 🌆');

      // Test boundary at 9 PM (start of night)
      mockDate(21);
      expect(getTimeBasedGreeting()).toBe('Good Night! 🌙');
    });
  });

  describe('getCurrentISTTime', () => {
    it('should return current time adjusted for IST', () => {
      const mockNow = new Date('2024-01-01T12:00:00.000Z'); // UTC noon
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      const istTime = getCurrentISTTime();
      
      // IST is UTC+5:30, so noon UTC should be 5:30 PM IST
      expect(istTime.getHours()).toBe(17);
      expect(istTime.getMinutes()).toBe(30);
    });
  });

  describe('formatISTTime', () => {
    it('should format time in IST timezone', () => {
      const testDate = new Date('2024-01-01T12:00:00.000Z'); // UTC noon
      
      // This should format as IST time (5:30 PM)
      const formatted = formatISTTime(testDate);
      
      // The exact format may vary by locale, but it should contain the IST time
      expect(formatted).toMatch(/5:30|17:30/);
    });
  });
});