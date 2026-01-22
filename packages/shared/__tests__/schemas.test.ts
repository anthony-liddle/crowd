import { describe, it, expect } from 'vitest';
import {
  PostMessageSchema,
  QueryFeedSchema,
  MessageResponseSchema,
  BoostMessageSchema,
  CreateCrowdSchema,
  CrowdResponseSchema,
  IdResponseSchema,
  StatusResponseSchema,
  JoinCrowdSchema,
  LeaveCrowdSchema,
  QueryCrowdsSchema,
  RotateMembershipSchema,
} from '../src/schemas';

describe('PostMessageSchema', () => {
  const validPayload = {
    text: 'Hello, world!',
    latitude: 45.5152,
    longitude: -122.6784,
    radiusMeters: 1000,
    activeMinutes: 60,
    userId: '123e4567-e89b-12d3-a456-426614174000',
  };

  it('should accept valid payload', () => {
    const result = PostMessageSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should accept valid payload with optional crowdId', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      crowdId: '223e4567-e89b-12d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty text', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      text: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject text over 500 characters', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      text: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should accept text at exactly 500 characters', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      text: 'a'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('should reject latitude below -90', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      latitude: -91,
    });
    expect(result.success).toBe(false);
  });

  it('should reject latitude above 90', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      latitude: 91,
    });
    expect(result.success).toBe(false);
  });

  it('should accept latitude at boundary values', () => {
    expect(PostMessageSchema.safeParse({ ...validPayload, latitude: -90 }).success).toBe(true);
    expect(PostMessageSchema.safeParse({ ...validPayload, latitude: 90 }).success).toBe(true);
  });

  it('should reject longitude below -180', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      longitude: -181,
    });
    expect(result.success).toBe(false);
  });

  it('should reject longitude above 180', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      longitude: 181,
    });
    expect(result.success).toBe(false);
  });

  it('should accept longitude at boundary values', () => {
    expect(PostMessageSchema.safeParse({ ...validPayload, longitude: -180 }).success).toBe(true);
    expect(PostMessageSchema.safeParse({ ...validPayload, longitude: 180 }).success).toBe(true);
  });

  it('should reject radiusMeters over 100000', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      radiusMeters: 100001,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive radiusMeters', () => {
    expect(PostMessageSchema.safeParse({ ...validPayload, radiusMeters: 0 }).success).toBe(false);
    expect(PostMessageSchema.safeParse({ ...validPayload, radiusMeters: -1 }).success).toBe(false);
  });

  it('should reject non-integer radiusMeters', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      radiusMeters: 1000.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject activeMinutes over 10080 (7 days)', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      activeMinutes: 10081,
    });
    expect(result.success).toBe(false);
  });

  it('should accept activeMinutes at exactly 10080', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      activeMinutes: 10080,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID for userId', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      userId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid UUID for crowdId', () => {
    const result = PostMessageSchema.safeParse({
      ...validPayload,
      crowdId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('QueryFeedSchema', () => {
  const validQuery = {
    latitude: 45.5152,
    longitude: -122.6784,
  };

  it('should accept valid query with minimal params', () => {
    const result = QueryFeedSchema.safeParse(validQuery);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe('nearest');
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it('should coerce string numbers to numbers', () => {
    const result = QueryFeedSchema.safeParse({
      latitude: '45.5152',
      longitude: '-122.6784',
      limit: '25',
      offset: '10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latitude).toBe(45.5152);
      expect(result.data.longitude).toBe(-122.6784);
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(10);
    }
  });

  it('should accept valid sortBy enum values', () => {
    expect(QueryFeedSchema.safeParse({ ...validQuery, sortBy: 'nearest' }).success).toBe(true);
    expect(QueryFeedSchema.safeParse({ ...validQuery, sortBy: 'soonest' }).success).toBe(true);
  });

  it('should reject invalid sortBy value', () => {
    const result = QueryFeedSchema.safeParse({
      ...validQuery,
      sortBy: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit over 100', () => {
    const result = QueryFeedSchema.safeParse({
      ...validQuery,
      limit: 101,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive limit', () => {
    expect(QueryFeedSchema.safeParse({ ...validQuery, limit: 0 }).success).toBe(false);
    expect(QueryFeedSchema.safeParse({ ...validQuery, limit: -1 }).success).toBe(false);
  });

  it('should reject negative offset', () => {
    const result = QueryFeedSchema.safeParse({
      ...validQuery,
      offset: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional userId and crowdId', () => {
    const result = QueryFeedSchema.safeParse({
      ...validQuery,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      crowdId: '223e4567-e89b-12d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
  });

  it('should validate coordinate bounds', () => {
    expect(QueryFeedSchema.safeParse({ ...validQuery, latitude: -91 }).success).toBe(false);
    expect(QueryFeedSchema.safeParse({ ...validQuery, latitude: 91 }).success).toBe(false);
    expect(QueryFeedSchema.safeParse({ ...validQuery, longitude: -181 }).success).toBe(false);
    expect(QueryFeedSchema.safeParse({ ...validQuery, longitude: 181 }).success).toBe(false);
  });
});

describe('MessageResponseSchema', () => {
  const validResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    text: 'Hello, world!',
    latitude: 45.5152,
    longitude: -122.6784,
    radiusMeters: 1000,
    activeMinutes: 60,
    createdAt: '2024-01-15T10:00:00.000Z',
    expiresAt: '2024-01-15T11:00:00.000Z',
    boostCount: 5,
  };

  it('should accept valid response', () => {
    const result = MessageResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should coerce ISO date strings to Date objects', () => {
    const result = MessageResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.expiresAt).toBeInstanceOf(Date);
    }
  });

  it('should accept nullable crowdId', () => {
    const result = MessageResponseSchema.safeParse({
      ...validResponse,
      crowdId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crowdId).toBeNull();
    }
  });

  it('should use default values for boolean fields', () => {
    const result = MessageResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isBoosted).toBe(false);
      expect(result.data.isOwner).toBe(false);
    }
  });

  it('should accept optional fields', () => {
    const result = MessageResponseSchema.safeParse({
      ...validResponse,
      distance: 500.5,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
      isBoosted: true,
      isOwner: true,
      crowdId: '223e4567-e89b-12d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.distance).toBe(500.5);
      expect(result.data.isBoosted).toBe(true);
      expect(result.data.isOwner).toBe(true);
    }
  });

  it('should default boostCount to 0', () => {
    const { boostCount, ...responseWithoutBoost } = validResponse;
    const result = MessageResponseSchema.safeParse(responseWithoutBoost);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.boostCount).toBe(0);
    }
  });
});

describe('BoostMessageSchema', () => {
  const validBoost = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    latitude: 45.5152,
    longitude: -122.6784,
  };

  it('should accept valid boost payload', () => {
    const result = BoostMessageSchema.safeParse(validBoost);
    expect(result.success).toBe(true);
  });

  it('should validate coordinate bounds', () => {
    expect(BoostMessageSchema.safeParse({ ...validBoost, latitude: -91 }).success).toBe(false);
    expect(BoostMessageSchema.safeParse({ ...validBoost, latitude: 91 }).success).toBe(false);
    expect(BoostMessageSchema.safeParse({ ...validBoost, longitude: -181 }).success).toBe(false);
    expect(BoostMessageSchema.safeParse({ ...validBoost, longitude: 181 }).success).toBe(false);
  });

  it('should accept boundary coordinate values', () => {
    expect(BoostMessageSchema.safeParse({ ...validBoost, latitude: -90 }).success).toBe(true);
    expect(BoostMessageSchema.safeParse({ ...validBoost, latitude: 90 }).success).toBe(true);
    expect(BoostMessageSchema.safeParse({ ...validBoost, longitude: -180 }).success).toBe(true);
    expect(BoostMessageSchema.safeParse({ ...validBoost, longitude: 180 }).success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = BoostMessageSchema.safeParse({
      ...validBoost,
      userId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateCrowdSchema', () => {
  const validCrowd = {
    name: 'Test Crowd',
    userId: '123e4567-e89b-12d3-a456-426614174000',
  };

  it('should accept valid crowd payload', () => {
    const result = CreateCrowdSchema.safeParse(validCrowd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOpen).toBe(true); // default value
    }
  });

  it('should reject empty name', () => {
    const result = CreateCrowdSchema.safeParse({
      ...validCrowd,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name over 50 characters', () => {
    const result = CreateCrowdSchema.safeParse({
      ...validCrowd,
      name: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('should accept name at exactly 50 characters', () => {
    const result = CreateCrowdSchema.safeParse({
      ...validCrowd,
      name: 'a'.repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it('should accept single character name', () => {
    const result = CreateCrowdSchema.safeParse({
      ...validCrowd,
      name: 'A',
    });
    expect(result.success).toBe(true);
  });

  it('should default isOpen to true', () => {
    const result = CreateCrowdSchema.safeParse(validCrowd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOpen).toBe(true);
    }
  });

  it('should accept explicit isOpen value', () => {
    const result = CreateCrowdSchema.safeParse({
      ...validCrowd,
      isOpen: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOpen).toBe(false);
    }
  });

  it('should reject invalid UUID for userId', () => {
    const result = CreateCrowdSchema.safeParse({
      ...validCrowd,
      userId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('CrowdResponseSchema', () => {
  const validCrowdResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Crowd',
    isOpen: true,
    isOwner: true,
    memberCount: 5,
    createdAt: '2024-01-15T10:00:00.000Z',
    expiresAt: '2024-01-16T10:00:00.000Z',
    canInvite: true,
  };

  it('should accept valid response', () => {
    const result = CrowdResponseSchema.safeParse(validCrowdResponse);
    expect(result.success).toBe(true);
  });

  it('should coerce date strings to Date objects', () => {
    const result = CrowdResponseSchema.safeParse(validCrowdResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.expiresAt).toBeInstanceOf(Date);
    }
  });

  it('should require all fields', () => {
    const { canInvite, ...incomplete } = validCrowdResponse;
    const result = CrowdResponseSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('should validate memberCount is integer', () => {
    const result = CrowdResponseSchema.safeParse({
      ...validCrowdResponse,
      memberCount: 5.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('IdResponseSchema', () => {
  it('should accept valid UUID', () => {
    const result = IdResponseSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const result = IdResponseSchema.safeParse({
      id: 'not-a-valid-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const result = IdResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('StatusResponseSchema', () => {
  it('should accept valid status', () => {
    const result = StatusResponseSchema.safeParse({
      status: 'ok',
    });
    expect(result.success).toBe(true);
  });

  it('should accept any string status', () => {
    const result = StatusResponseSchema.safeParse({
      status: 'error',
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-string status', () => {
    const result = StatusResponseSchema.safeParse({
      status: 123,
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing status', () => {
    const result = StatusResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('JoinCrowdSchema', () => {
  it('should accept valid userId', () => {
    const result = JoinCrowdSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = JoinCrowdSchema.safeParse({
      userId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('LeaveCrowdSchema', () => {
  it('should accept valid userId', () => {
    const result = LeaveCrowdSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = LeaveCrowdSchema.safeParse({
      userId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('QueryCrowdsSchema', () => {
  it('should accept valid userId', () => {
    const result = QueryCrowdsSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = QueryCrowdsSchema.safeParse({
      userId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('RotateMembershipSchema', () => {
  const validRotation = {
    crowdId: '123e4567-e89b-12d3-a456-426614174000',
    oldUserId: '223e4567-e89b-12d3-a456-426614174001',
    newUserId: '323e4567-e89b-12d3-a456-426614174002',
  };

  it('should accept valid rotation payload', () => {
    const result = RotateMembershipSchema.safeParse(validRotation);
    expect(result.success).toBe(true);
  });

  it('should reject invalid crowdId UUID', () => {
    const result = RotateMembershipSchema.safeParse({
      ...validRotation,
      crowdId: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid oldUserId UUID', () => {
    const result = RotateMembershipSchema.safeParse({
      ...validRotation,
      oldUserId: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid newUserId UUID', () => {
    const result = RotateMembershipSchema.safeParse({
      ...validRotation,
      newUserId: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
