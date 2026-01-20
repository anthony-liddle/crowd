import type {
  PostMessageDto,
  QueryFeedDto,
  BoostMessageDto,
  CreateCrowdDto,
  JoinCrowdDto,
  LeaveCrowdDto,
  MessageResponse,
  CrowdResponse,
  IdResponse,
  StatusResponse,
} from '@repo/shared';
import * as Shared from '@repo/shared';
import { z } from 'zod';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080'; // Default for local dev

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
    timeoutMs = 30000,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorBody.slice(0, 200)}`);
      }

      const json = await response.json();

      // Validate response if schema provided
      if (responseSchema) {
        return responseSchema.parse(json);
      }

      return json as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  public messages = {
    post: async (data: PostMessageDto): Promise<IdResponse> => {
      // Validate input before sending
      const parsed = Shared.PostMessageSchema.parse(data);
      return this.request<IdResponse>('/messages', 'POST', parsed, 30000, Shared.IdResponseSchema);
    },
    feed: async (params: QueryFeedDto): Promise<MessageResponse[]> => {
      const parsed = Shared.QueryFeedSchema.parse(params);
      const queryParams = new URLSearchParams();
      queryParams.append('latitude', parsed.latitude.toString());
      queryParams.append('longitude', parsed.longitude.toString());
      if (parsed.userId) queryParams.append('userId', parsed.userId);
      if (parsed.sortBy) queryParams.append('sortBy', parsed.sortBy);
      if (parsed.crowdId) queryParams.append('crowdId', parsed.crowdId);

      return this.request<MessageResponse[]>(
        `/messages/feed?${queryParams.toString()}`,
        'GET',
        undefined,
        30000,
        z.array(Shared.MessageResponseSchema)
      );
    },
    boost: async (messageId: string, data: BoostMessageDto): Promise<StatusResponse> => {
      const parsed = Shared.BoostMessageSchema.parse(data);
      return this.request<StatusResponse>(`/messages/${messageId}/boost`, 'POST', parsed, 30000, Shared.StatusResponseSchema);
    },
  };

  public crowds = {
    create: async (data: CreateCrowdDto): Promise<IdResponse> => {
      const parsed = Shared.CreateCrowdSchema.parse(data);
      return this.request<IdResponse>('/crowds', 'POST', parsed, 30000, Shared.IdResponseSchema);
    },
    list: async (userId: string): Promise<CrowdResponse[]> => {
      const queryParams = new URLSearchParams();
      queryParams.append('userId', userId);
      return this.request<CrowdResponse[]>(
        `/crowds?${queryParams.toString()}`,
        'GET',
        undefined,
        30000,
        z.array(Shared.CrowdResponseSchema)
      );
    },
    join: async (crowdId: string, data: JoinCrowdDto): Promise<StatusResponse> => {
      const parsed = Shared.JoinCrowdSchema.parse(data);
      return this.request<StatusResponse>(`/crowds/${crowdId}/join`, 'POST', parsed, 30000, Shared.StatusResponseSchema);
    },
    leave: async (crowdId: string, data: LeaveCrowdDto): Promise<StatusResponse> => {
      const parsed = Shared.LeaveCrowdSchema.parse(data);
      return this.request<StatusResponse>(`/crowds/${crowdId}/leave`, 'POST', parsed, 30000, Shared.StatusResponseSchema);
    },
  };

  public health = async (): Promise<StatusResponse> => {
    return this.request<StatusResponse>('/health', 'GET', undefined, 30000, Shared.StatusResponseSchema);
  };
}

export const api = new ApiClient();
