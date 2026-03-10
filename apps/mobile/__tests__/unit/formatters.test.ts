import {
  formatTimeLeft,
  formatTimestamp,
  formatDistance,
  formatDuration,
  formatTimeRemaining,
} from '../../src/utils/formatters';

describe('formatTimeLeft', () => {
  it('returns minutes when less than 60', () => {
    expect(formatTimeLeft(45)).toBe('45m');
    expect(formatTimeLeft(5)).toBe('5m');
    expect(formatTimeLeft(59)).toBe('59m');
  });

  it('returns hours only when minutes is 0', () => {
    expect(formatTimeLeft(60)).toBe('1h');
    expect(formatTimeLeft(120)).toBe('2h');
  });

  it('returns hours and minutes combined', () => {
    expect(formatTimeLeft(90)).toBe('1h 30m');
    expect(formatTimeLeft(150)).toBe('2h 30m');
  });

  it('rounds fractional minutes', () => {
    expect(formatTimeLeft(45.7)).toBe('46m');
    expect(formatTimeLeft(90.4)).toBe('1h 30m');
  });
});

describe('formatTimestamp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Just now" for less than 1 minute', () => {
    const date = new Date('2024-01-15T11:59:30.000Z');
    expect(formatTimestamp(date)).toBe('Just now');
  });

  it('returns minutes ago', () => {
    const date = new Date('2024-01-15T11:55:00.000Z');
    expect(formatTimestamp(date)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const date = new Date('2024-01-15T09:00:00.000Z');
    expect(formatTimestamp(date)).toBe('3h ago');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    const date = new Date('2024-01-14T12:00:00.000Z');
    expect(formatTimestamp(date)).toBe('Yesterday');
  });

  it('returns days ago for less than a week', () => {
    const date = new Date('2024-01-12T12:00:00.000Z');
    expect(formatTimestamp(date)).toBe('3d ago');
  });

  it('returns formatted date for more than a week', () => {
    const date = new Date('2024-01-01T12:00:00.000Z');
    expect(formatTimestamp(date)).toMatch(/Jan \d+/);
  });
});

describe('formatDistance', () => {
  it('returns "nearby" for less than 100 meters', () => {
    expect(formatDistance(50)).toBe('nearby');
    expect(formatDistance(99)).toBe('nearby');
  });

  it('returns kilometers for 100+ meters', () => {
    expect(formatDistance(100)).toBe('0.1 km');
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(2500)).toBe('2.5 km');
  });

  it('handles large distances', () => {
    expect(formatDistance(10000)).toBe('10.0 km');
    expect(formatDistance(100000)).toBe('100.0 km');
  });
});

describe('formatDuration', () => {
  it('returns minutes when less than 60', () => {
    expect(formatDuration(30)).toBe('30m');
    expect(formatDuration(45)).toBe('45m');
  });

  it('returns hours only when minutes is 0', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(120)).toBe('2h');
  });

  it('returns hours and minutes combined', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(150)).toBe('2h 30m');
  });
});

describe('formatTimeRemaining', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Expired" for past date', () => {
    const pastDate = new Date('2024-01-15T11:00:00.000Z');
    expect(formatTimeRemaining(pastDate)).toBe('Expired');
  });

  it('returns minutes left when less than an hour', () => {
    const futureDate = new Date('2024-01-15T12:30:00.000Z');
    expect(formatTimeRemaining(futureDate)).toBe('30m left');
  });

  it('returns hours and minutes left', () => {
    const futureDate = new Date('2024-01-15T14:30:00.000Z');
    expect(formatTimeRemaining(futureDate)).toBe('2h 30m left');
  });

  it('returns hours left when exact hour', () => {
    const futureDate = new Date('2024-01-15T14:00:00.000Z');
    expect(formatTimeRemaining(futureDate)).toBe('2h 0m left');
  });
});
