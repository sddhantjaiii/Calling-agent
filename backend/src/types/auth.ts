import { Request } from 'express';

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  credits: number;
  isAdmin?: boolean;
}

export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}