import { PostMessageDto, QueryFeedDto, MessageDto, BoostMessageDto, PostMessageSchema, QueryFeedSchema, BoostMessageSchema } from '@repo/shared';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080'; // Default for local dev

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  public messages = {
    post: async (data: PostMessageDto): Promise<{ id: string }> => {
      // Validate input before sending
      const parsed = PostMessageSchema.parse(data);
      return this.request<{ id: string }>('/messages', 'POST', parsed);
    },
    feed: async (params: QueryFeedDto): Promise<MessageDto[]> => {
      const parsed = QueryFeedSchema.parse(params);
      const queryParams = new URLSearchParams();
      queryParams.append('latitude', parsed.latitude.toString());
      queryParams.append('longitude', parsed.longitude.toString());
      if (parsed.userId) queryParams.append('userId', parsed.userId);
      if (parsed.sortBy) queryParams.append('sortBy', parsed.sortBy);

      return this.request<MessageDto[]>(`/messages/feed?${queryParams.toString()}`, 'GET');
    },
    boost: async (messageId: string, data: BoostMessageDto): Promise<{ status: string }> => {
      const parsed = BoostMessageSchema.parse(data);
      return this.request<{ status: string }>(`/messages/${messageId}/boost`, 'POST', parsed);
    },
  };

  public health = async (): Promise<{ status: string }> => {
    return this.request<{ status: string }>('/health', 'GET');
  };
}

export const api = new ApiClient();
