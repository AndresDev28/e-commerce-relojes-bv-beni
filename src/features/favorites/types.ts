export type FavoriteMutationResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' }
