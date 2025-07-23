import { useEffect, useRef } from 'react'
// createPortal permite renderizar elementos fuera del árbol DOM principal
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import Button from './Button'

// Definición de tipos para las props del componente
interface ModalProps {
  isOpen: boolean // Controla la visibilidad del modal
  onClose: () => void // Función para cerrar el modal
  title: string // Título que se mostrará en el encabezado
  children: React.ReactNode // Contenido del modal
  className?: string // Clases CSS opcionales
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  // useRef nos permite referenciar el elemento DOM del modal
  const modalRef = useRef<HTMLDivElement>(null)

  // Effect para manejar el cierre con la tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    // Agregamos el event listener al montar el componente
    document.addEventListener('keydown', handleEscape)
    // Lo limpiamos al desmontar para evitar memory leaks
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Si el modal no está abierto, no renderizamos nada
  if (!isOpen) return null

  // createPortal renderiza el modal fuera del DOM principal
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay: Fondo oscuro con blur que cubre toda la pantalla */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose} // Cierra el modal al hacer click en el overlay
      />

      {/* Contenedor del modal centrado en la pantalla */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          ref={modalRef}
          className={clsx(
            // Estilos base del modal
            'relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl',
            // Animación de entrada/salida
            'transform transition-all duration-200',
            className
          )}
          // Atributos ARIA para accesibilidad
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header con título y botón de cerrar */}
          <div className="flex items-center justify-between mb-4">
            <h2
              id="modal-title" // ID referenciado por aria-labelledby
              className="text-xl font-semibold text-gray-900"
            >
              {title}
            </h2>
            <Button
              variant="secondary"
              onClick={onClose}
              className="!p-2"
              aria-label="Cerrar modal" // Etiqueta para lectores de pantalla
            >
              ✕
            </Button>
          </div>

          {/* Contenido del modal pasado como children */}
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>,
    document.body // El modal se renderiza directamente en el body
  )
}
