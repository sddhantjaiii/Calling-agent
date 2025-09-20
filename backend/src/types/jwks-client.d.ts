declare module 'jwks-rsa' {
  export interface JwksClient {
    getSigningKey(kid: string, callback: (err: any, key: any) => void): void;
  }

  export interface JwksClientOptions {
    jwksUri: string;
    requestHeaders?: Record<string, string>;
    timeout?: number;
    cache?: boolean;
    rateLimit?: boolean;
    jwksRequestsPerMinute?: number;
  }

  function jwksClient(options: JwksClientOptions): JwksClient;
  export = jwksClient;
}