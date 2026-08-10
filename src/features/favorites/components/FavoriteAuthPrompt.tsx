'use client'

interface FavoriteAuthPromptProps {
  onLogin: () => void
}

/**
 * Auth prompt visible content (text + CTA).
 *
 * IMPORTANT: this component does NOT carry its own role="status" / aria-live
 * attributes. The parent (ProductCard, ProductDetailClient) MUST wrap the
 * conditional render in an aria-live region that stays mounted even when the
 * prompt is hidden. Otherwise the screen reader cannot detect the change —
 * the live region has to exist in the DOM BEFORE its content changes.
 */
export function FavoriteAuthPrompt({ onLogin }: FavoriteAuthPromptProps) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-sm text-neutral-medium">
        Iniciá sesión para guardar favoritos
      </span>
      <button
        type="button"
        onClick={onLogin}
        className="text-sm font-medium text-primary underline hover:text-primary-dark transition-colors"
      >
        Iniciar sesión
      </button>
    </span>
  )
}
