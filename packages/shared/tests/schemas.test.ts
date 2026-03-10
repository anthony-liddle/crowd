import { describe, it, expect } from 'vitest';
import {
  PostMessageSchema,
  QueryFeedSchema,
  BoostMessageSchema,
  CreateCrowdSchema,
  JoinCrowdSchema,
  LeaveCrowdSchema,
  QueryCrowdsSchema,
} from '../src/schemas';

describe('Schemas', () => {
  describe('PostMessageSchema', () => {
    it('should validate valid message data', () => {
      const valid = {
        text: 'Test message',
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 1000,
        activeMinutes: 60,
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => PostMessageSchema.parse(valid)).not.toThrow();
    });

    it('should reject empty text', () => {
      const invalid = {
        text: '',
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 1000,
        activeMinutes: 60,
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => PostMessageSchema.parse(invalid)).toThrow();
    });

    it('should reject text longer than 500 characters', () => {
      const invalid = {
        text: 'a'.repeat(501),
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 1000,
        activeMinutes: 60,
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => PostMessageSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalid = {
        text: 'Test message',
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 1000,
        activeMinutes: 60,
        userId: 'invalid-uuid',
      };

      expect(() => PostMessageSchema.parse(invalid)).toThrow();
    });

    it('should accept optional crowdId', () => {
      const valid = {
        text: 'Test message',
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 1000,
        activeMinutes: 60,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        crowdId: '123e4567-e89b-12d3-a456-426614174001',
      };

      expect(() => PostMessageSchema.parse(valid)).not.toThrow();
    });
  });

  describe('QueryFeedSchema', () => {
    it('should validate valid feed query', () => {
      const valid = {
        latitude: '37.7749',
        longitude: '-122.4194',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sortBy: 'nearest',
      };

      const result = QueryFeedSchema.parse(valid);
      expect(result.latitude).toBe(37.7749);
      expect(result.longitude).toBe(-122.4194);
    });

    it('should coerce string numbers to numbers', () => {
      const valid = {
        latitude: '37.7749',
        longitude: '-122.4194',
      };

      const result = QueryFeedSchema.parse(valid);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });

    it('should default sortBy to nearest', () => {
      const valid = {
        latitude: 37.7749,
        longitude: -122.4194,
      };

      const result = QueryFeedSchema.parse(valid);
      expect(result.sortBy).toBe('nearest');
    });
  });

  describe('BoostMessageSchema', () => {
    it('should validate valid boost data', () => {
      const valid = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        latitude: 37.7749,
        longitude: -122.4194,
      };

      expect(() => BoostMessageSchema.parse(valid)).not.toThrow();
    });

    it('should reject invalid coordinates', () => {
      const invalid = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        latitude: 200, // Invalid latitude
        longitude: -122.4194,
      };

      expect(() => BoostMessageSchema.parse(invalid)).toThrow();
    });
  });

  describe('CreateCrowdSchema', () => {
    it('should validate valid crowd data', () => {
      const valid = {
        name: 'Test Crowd',
        isOpen: true,
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => CreateCrowdSchema.parse(valid)).not.toThrow();
    });

    it('should reject empty name', () => {
      const invalid = {
        name: '',
        isOpen: true,
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => CreateCrowdSchema.parse(invalid)).toThrow();
    });

    it('should reject name longer than 50 characters', () => {
      const invalid = {
        name: 'a'.repeat(51),
        isOpen: true,
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => CreateCrowdSchema.parse(invalid)).toThrow();
    });

    it('should default isOpen to true', () => {
      const valid = {
        name: 'Test Crowd',
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CreateCrowdSchema.parse(valid);
      expect(result.isOpen).toBe(true);
    });
  });

  describe('JoinCrowdSchema', () => {
    it('should validate valid join data', () => {
      const valid = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => JoinCrowdSchema.parse(valid)).not.toThrow();
    });
  });

  describe('LeaveCrowdSchema', () => {
    it('should validate valid leave data', () => {
      const valid = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => LeaveCrowdSchema.parse(valid)).not.toThrow();
    });
  });

  describe('QueryCrowdsSchema', () => {
    it('should validate valid query', () => {
      const valid = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => QueryCrowdsSchema.parse(valid)).not.toThrow();
    });
  });
});
