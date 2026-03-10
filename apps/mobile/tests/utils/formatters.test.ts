import {
  formatTimeLeft,
  formatTimestamp,
  formatDistance,
  formatDuration,
  formatTimeRemaining,
} from '@/utils/formatters';

describe('Formatters', () => {
  describe('formatTimeLeft', () => {
    it('should format minutes less than 60', () => {
      expect(formatTimeLeft(30)).toBe('30m');
      expect(formatTimeLeft(5)).toBe('5m');
    });

    it('should format hours and minutes', () => {
      expect(formatTimeLeft(90)).toBe('1h 30m');
      expect(formatTimeLeft(120)).toBe('2h 0m');
    });

    it('should format hours only when no remaining minutes', () => {
      expect(formatTimeLeft(60)).toBe('1h');
      expect(formatTimeLeft(120)).toBe('2h');
    });
  });

  describe('formatTimestamp', () => {
    it('should format "Just now" for recent times', () => {
      const now = new Date();
      expect(formatTimestamp(now)).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatTimestamp(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatTimestamp(twoHoursAgo)).toBe('2h ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatTimestamp(threeDaysAgo)).toBe('3d ago');
    });
  });

  describe('formatDistance', () => {
    it('should return "nearby" for distances less than 100m', () => {
      expect(formatDistance(50)).toBe('nearby');
      expect(formatDistance(99)).toBe('nearby');
    });

    it('should format kilometers', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(2500)).toBe('2.5 km');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes less than 60', () => {
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(45)).toBe('45m');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(150)).toBe('2h 30m');
    });

    it('should format hours only when no remaining minutes', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(120)).toBe('2h');
    });
  });

  describe('formatTimeRemaining', () => {
    it('should return "Expired" for past dates', () => {
      const past = new Date(Date.now() - 1000);
      expect(formatTimeRemaining(past)).toBe('Expired');
    });

    it('should format hours and minutes remaining', () => {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000);
      expect(formatTimeRemaining(future)).toBe('2h 30m left');
    });

    it('should format minutes only when less than an hour', () => {
      const future = new Date(Date.now() + 30 * 60 * 1000);
      expect(formatTimeRemaining(future)).toBe('30m left');
    });
  });
});
