import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

interface CookieJarAdapter {
  removeAllCookiesSync(): void;
}

type RefreshHandler = () => Promise<string | undefined>;

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AxiosRequestConfig {
    __isRetryRequest?: boolean;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface InternalAxiosRequestConfig {
    __isRetryRequest?: boolean;
  }
}

class ApiClient {
  private readonly instance: AxiosInstance;
  private readonly jar: CookieJarAdapter;
  private refreshHandler?: RefreshHandler;

  constructor() {
    this.jar = new CookieJar() as unknown as CookieJarAdapter;
    this.instance = wrapper(axios.create({
      baseURL: 'http://localhost:3000/api',
      withCredentials: true,
      jar: this.jar,
    }));

    this.instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const headers = AxiosHeaders.from(config.headers ?? {});
      if (!headers.has('Content-Type') && config.method !== 'get') {
        headers.set('Content-Type', 'application/json');
      }
      config.headers = headers;
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshHandler && !error.config.__isRetryRequest) {
          const token = await this.refreshHandler();
          if (token) {
            const retryHeaders = AxiosHeaders.from(error.config.headers ?? {});
            retryHeaders.set('Authorization', `Bearer ${token}`);
            const retryConfig: AxiosRequestConfig = {
              ...error.config,
              headers: retryHeaders,
            };
            retryConfig.__isRetryRequest = true;
            return this.instance.request(retryConfig as InternalAxiosRequestConfig);
          }
        }
        throw error;
      }
    );
  }

  get axios(): AxiosInstance {
    return this.instance;
  }

  get cookieJar(): CookieJarAdapter {
    return this.jar;
  }

  setBaseUrl(baseUrl: string): void {
    this.instance.defaults.baseURL = baseUrl;
  }

  setDefaultHeaders(headers: Record<string, string | undefined>): void {
    this.instance.defaults.headers.common = {
      ...this.instance.defaults.headers.common,
      ...headers,
    };
  }

  setAccessToken(token: string | undefined): void {
    if (token) {
      this.instance.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete this.instance.defaults.headers.common.Authorization;
    }
  }

  setRefreshHandler(handler: RefreshHandler | undefined): void {
    this.refreshHandler = handler;
  }

  reset(): void {
    this.jar.removeAllCookiesSync();
    this.setAccessToken(undefined);
  }
}

export const apiClient = new ApiClient();

