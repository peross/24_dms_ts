declare module 'tough-cookie' {
  export class CookieJar {
    constructor(...args: unknown[]);
    removeAllCookiesSync(): void;
  }
}

