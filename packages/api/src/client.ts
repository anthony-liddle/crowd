import type {
  PostMessageDto,
  QueryFeedDto,
  BoostMessageDto,
  CreateCrowdDto,
  JoinCrowdDto,
  LeaveCrowdDto,
  LookupCrowdsRequestDto,
  CreateProximityTokenDto,
  JoinWithTokenDto,
  LookupTokenDto,
  MessageResponse,
  CrowdResponse,
  IdResponse,
  StatusResponse,
  ProximityTokenResponse,
  JoinWithTokenResponse,
  LookupTokenResponse,
  DeleteUserDataDto,
  DeleteUserDataResponse,
} from '@repo/shared';
import * as Shared from '@repo/shared';
import { z, ZodError } from 'zod';
import { ValidationError } from './errors';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080'; // Default for local dev

// Run the shared schema's pre-send parse, converting any ZodError into the
// typed ValidationError so callers can render field-level errors instead of
// seeing a generic Error. Centralizes the conversion so every endpoint's
// pre-parse behaves the same way.
function parseRequest<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationError(err.issues, 'client');
    }
    throw err;
  }
}

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
    responseSchema?: z.ZodType<T, any, any>
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
        if (response.status === 400) {
          try {
            const parsed = JSON.parse(errorBody);
            if (
              parsed &&
              parsed.error === 'ValidationError' &&
              Array.isArray(parsed.issues)
            ) {
              throw new ValidationError(parsed.issues, 'server');
            }
          } catch (parseErr) {
            // Rethrow ValidationError; swallow JSON.parse failures so the
            // generic Error below still fires for non-JSON 400 bodies.
            if (parseErr instanceof ValidationError) throw parseErr;
          }
        }
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
      const parsed = parseRequest(Shared.PostMessageSchema, data);
      return this.request<IdResponse>('/messages', 'POST', parsed, 30000, Shared.IdResponseSchema);
    },
    feed: async (params: QueryFeedDto): Promise<MessageResponse[]> => {
      const parsed = parseRequest(Shared.QueryFeedSchema, params);
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
      const parsed = parseRequest(Shared.BoostMessageSchema, data);
      return this.request<StatusResponse>(`/messages/${messageId}/boost`, 'POST', parsed, 30000, Shared.StatusResponseSchema);
    },
  };

  public crowds = {
    create: async (data: CreateCrowdDto): Promise<IdResponse> => {
      const parsed = parseRequest(Shared.CreateCrowdSchema, data);
      return this.request<IdResponse>('/crowds', 'POST', parsed, 30000, Shared.IdResponseSchema);
    },
    lookup: async (data: LookupCrowdsRequestDto): Promise<CrowdResponse[]> => {
      const parsed = parseRequest(Shared.LookupCrowdsRequestSchema, data);
      return this.request<CrowdResponse[]>(
        '/crowds/lookup',
        'POST',
        parsed,
        30000,
        z.array(Shared.CrowdResponseSchema),
      );
    },
    join: async (crowdId: string, data: JoinCrowdDto): Promise<StatusResponse> => {
      const parsed = parseRequest(Shared.JoinCrowdSchema, data);
      return this.request<StatusResponse>(`/crowds/${crowdId}/join`, 'POST', parsed, 30000, Shared.StatusResponseSchema);
    },
    leave: async (crowdId: string, data: LeaveCrowdDto): Promise<StatusResponse> => {
      const parsed = parseRequest(Shared.LeaveCrowdSchema, data);
      return this.request<StatusResponse>(`/crowds/${crowdId}/leave`, 'POST', parsed, 30000, Shared.StatusResponseSchema);
    },
    proximityToken: async (crowdId: string, data: CreateProximityTokenDto): Promise<ProximityTokenResponse> => {
      const parsed = parseRequest(Shared.CreateProximityTokenSchema, data);
      return this.request<ProximityTokenResponse>(
        `/crowds/${crowdId}/proximity-token`,
        'POST',
        parsed,
        30000,
        Shared.ProximityTokenResponseSchema,
      );
    },
    joinWithToken: async (data: JoinWithTokenDto): Promise<JoinWithTokenResponse> => {
      const parsed = parseRequest(Shared.JoinWithTokenSchema, data);
      return this.request<JoinWithTokenResponse>(
        '/crowds/join-with-token',
        'POST',
        parsed,
        30000,
        Shared.JoinWithTokenResponseSchema,
      );
    },
    lookupToken: async (data: LookupTokenDto): Promise<LookupTokenResponse> => {
      const parsed = parseRequest(Shared.LookupTokenSchema, data);
      return this.request<LookupTokenResponse>(
        '/crowds/lookup-token',
        'POST',
        parsed,
        30000,
        Shared.LookupTokenResponseSchema,
      );
    },
  };

  public users = {
    deleteData: async (data: DeleteUserDataDto): Promise<DeleteUserDataResponse> => {
      const parsed = parseRequest(Shared.DeleteUserDataSchema, data);
      return this.request<DeleteUserDataResponse>(
        '/users/delete',
        'POST',
        parsed,
        30000,
        Shared.DeleteUserDataResponseSchema,
      );
    },
  };

  public health = async (): Promise<StatusResponse> => {
    return this.request<StatusResponse>('/health', 'GET', undefined, 30000, Shared.StatusResponseSchema);
  };
}

export const api = new ApiClient();
