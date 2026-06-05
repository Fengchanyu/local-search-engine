import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { SearchResult, ContentSearchResult, IndexStatus, ApiResponse, SearchOptions, FilterOptions, SortOption, SortOrder } from '@/types';

interface SortOptions {
  field: SortOption;
  order: SortOrder;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        const message = error.response?.data ? 
          (error.response.data as { message?: string }).message || error.message : 
          error.message;
        return Promise.reject(new Error(message));
      }
    );
  }

  async searchByName(query: string, options?: Partial<SearchOptions>): Promise<SearchResult[]> {
    const response = await this.client.get<ApiResponse<SearchResult[]>>('/search', {
      params: {
        query,
        ...options,
      },
    });
    return response.data.data || [];
  }

  async searchByContent(query: string, options?: Partial<SearchOptions>): Promise<ContentSearchResult[]> {
    const response = await this.client.get<ApiResponse<ContentSearchResult[]>>('/search/content', {
      params: {
        query,
        ...options,
      },
    });
    return response.data.data || [];
  }

  async searchByRegex(pattern: string, options?: Partial<SearchOptions>): Promise<SearchResult[]> {
    const response = await this.client.get<ApiResponse<SearchResult[]>>('/search/regex', {
      params: {
        pattern,
        ...options,
      },
    });
    return response.data.data || [];
  }

  async filterResults(results: SearchResult[], filters: FilterOptions): Promise<SearchResult[]> {
    const response = await this.client.post<ApiResponse<SearchResult[]>>('/filter', {
      results,
      filters,
    });
    return response.data.data || [];
  }

  async sortResults(results: SearchResult[], sort: SortOptions): Promise<SearchResult[]> {
    const response = await this.client.post<ApiResponse<SearchResult[]>>('/sort', {
      results,
      sort,
    });
    return response.data.data || [];
  }

  async buildIndex(paths: string[]): Promise<void> {
    await this.client.post('/index/build', { paths });
  }

  async rebuildIndex(): Promise<void> {
    await this.client.post('/index/rebuild');
  }

  async getIndexStatus(): Promise<IndexStatus> {
    const response = await this.client.get<ApiResponse<IndexStatus>>('/index/status');
    return response.data.data!;
  }

  async pauseIndexing(): Promise<void> {
    await this.client.post('/index/pause');
  }

  async resumeIndexing(): Promise<void> {
    await this.client.post('/index/resume');
  }

  async stopIndexing(): Promise<void> {
    await this.client.post('/index/stop');
  }

  async openFile(path: string): Promise<void> {
    await this.client.post('/file/open', { path });
  }

  async copyPath(path: string): Promise<void> {
    await this.client.post('/file/copy-path', { path });
  }

  async getFileStats(path: string): Promise<{ size: number; created: string; modified: string }> {
    const response = await this.client.get<ApiResponse<{ size: number; created: string; modified: string }>>('/file/stats', {
      params: { path },
    });
    return response.data.data!;
  }
}

export const api = new ApiService();

export const searchFiles = async (options: SearchOptions & { offset?: number }): Promise<SearchResult[]> => {
  return api.searchByName(options.query, options);
};

export const searchContent = async (options: SearchOptions & { offset?: number }): Promise<ContentSearchResult[]> => {
  return api.searchByContent(options.query, options);
};
