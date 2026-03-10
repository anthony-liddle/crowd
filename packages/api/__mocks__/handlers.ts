import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:8080';

// Sample test data
export const mockMessageId = '123e4567-e89b-12d3-a456-426614174000';
export const mockCrowdId = '223e4567-e89b-12d3-a456-426614174001';
export const mockUserId = '323e4567-e89b-12d3-a456-426614174002';

export const mockMessage = {
  id: mockMessageId,
  text: 'Hello, world!',
  latitude: 45.5152,
  longitude: -122.6784,
  radiusMeters: 1000,
  activeMinutes: 60,
  createdAt: '2024-01-15T10:00:00.000Z',
  expiresAt: '2024-01-15T11:00:00.000Z',
  ownerId: mockUserId,
  boostCount: 5,
  isBoosted: false,
  isOwner: false,
  crowdId: null,
};

export const mockCrowd = {
  id: mockCrowdId,
  name: 'Test Crowd',
  isOpen: true,
  isOwner: true,
  memberCount: 3,
  createdAt: '2024-01-15T10:00:00.000Z',
  expiresAt: '2024-01-16T10:00:00.000Z',
  canInvite: true,
};

export const handlers = [
  // Health check
  http.get(`${BASE_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Post message
  http.post(`${BASE_URL}/messages`, async ({ request }) => {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return HttpResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return HttpResponse.json({ id: mockMessageId });
  }),

  // Get feed
  http.get(`${BASE_URL}/messages/feed`, ({ request }) => {
    const url = new URL(request.url);
    const lat = url.searchParams.get('latitude');
    const lng = url.searchParams.get('longitude');

    if (!lat || !lng) {
      return HttpResponse.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    return HttpResponse.json([mockMessage]);
  }),

  // Boost message
  http.post(`${BASE_URL}/messages/:id/boost`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Create crowd
  http.post(`${BASE_URL}/crowds`, () => {
    return HttpResponse.json({ id: mockCrowdId });
  }),

  // List crowds
  http.get(`${BASE_URL}/crowds`, () => {
    return HttpResponse.json([mockCrowd]);
  }),

  // Join crowd
  http.post(`${BASE_URL}/crowds/:id/join`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Leave crowd
  http.post(`${BASE_URL}/crowds/:id/leave`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];
