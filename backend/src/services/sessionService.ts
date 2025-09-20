import { User } from './authService';

interface UserSession {
  userId: string;
  email: string;
  displayName?: string;
  lastActivity: Date;
  createdAt: Date;
}

class SessionService {
  private sessions: Map<string, UserSession> = new Map();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create or update user session
   */
  createSession(user: User): UserSession {
    const session: UserSession = {
      userId: user.id,
      email: user.email,
      displayName: user.name,
      lastActivity: new Date(),
      createdAt: new Date(),
    };

    this.sessions.set(user.id, session);
    return session;
  }

  /**
   * Get user session
   */
  getSession(userId: string): UserSession | null {
    const session = this.sessions.get(userId);
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
    
    if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(userId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    this.sessions.set(userId, session);
    
    return session;
  }

  /**
   * Update session activity
   */
  updateActivity(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(userId, session);
    }
  }

  /**
   * Remove user session
   */
  removeSession(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [userId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(userId);
      }
    }
  }

  /**
   * Get all active sessions (for admin purposes)
   */
  getActiveSessions(): UserSession[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }
}

export const sessionService = new SessionService();

// Clean up expired sessions every hour
setInterval(() => {
  sessionService.cleanupExpiredSessions();
}, 60 * 60 * 1000);

export { UserSession };