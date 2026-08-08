'use client'

interface FavoriteAuthPromptProps {
  onLogin: () => void
}

export function FavoriteAuthPrompt({ onLogin }: FavoriteAuthPromptProps) {
  return (
    <span role="status" aria-live="polite" className="flex items-center gap-2">
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
