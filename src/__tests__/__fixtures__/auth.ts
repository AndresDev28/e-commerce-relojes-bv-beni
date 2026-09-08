import type { AuthUser } from '@/context/AuthContext'

/**
 * Shared AuthContext fixtures (design A-12, proposal F4=A).
 *
 * PR2 hook tests mock `@/context/AuthContext`; these shapes lock the
 * AuthContext `user` (AuthUser) and logged-out (`null`) variants so the
 * wire-body `userId` composition (A-12) is asserted against the real
 * `AuthUser.id: number` contract instead of ad-hoc literals (obs #1740).
 */
export const MOCK_AUTH_USER: AuthUser = {
  id: 42,
  username: 'buyer',
  email: 'buyer@example.com',
}

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { ...MOCK_AUTH_USER, ...overrides }
}

/** Logged-out shape: AuthContext exposes `user: null` (never undefined). */
export const MOCK_AUTH_USER_NULL: null = null
