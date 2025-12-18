import { PostMessageDto, QueryFeedDto, MessageDto, PostMessageSchema, QueryFeedSchema } from '@repo/shared';

const BASE_URL = 'http://localhost:8080'; // Default for local dev

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
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  public messages = {
    post: async (data: PostMessageDto): Promise<{ id: string }> => {
      // Validate input before sending (optional but good practice)
      const parsed = PostMessageSchema.parse(data);
      return this.request<{ id: string }>('/messages', 'POST', parsed);
    },
    feed: async (params: QueryFeedDto): Promise<MessageDto[]> => {
      const parsed = QueryFeedSchema.parse(params);
      const queryParams = new URLSearchParams({
        latitude: parsed.latitude.toString(),
        longitude: parsed.longitude.toString(),
      });
      return this.request<MessageDto[]>(`/messages/feed?${queryParams.toString()}`, 'GET');
    },
  };

  public health = async (): Promise<{ status: string }> => {
    return this.request<{ status: string }>('/health', 'GET');
  };
}

export const api = new ApiClient();
