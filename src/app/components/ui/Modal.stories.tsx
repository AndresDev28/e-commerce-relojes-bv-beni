import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

const meta: Meta<typeof Modal> = {
  title: "UI/Modal",
  component: Modal,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Wrapper para controlar el estado del modal en Storybook
function ModalWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botón que abre el modal */}
      <Button onClick={() => setIsOpen(true)}>Abrir Modal</Button>

      {/* Implementación del modal con sus props */}
      <Modal
        isOpen={isOpen} // Controla visibilidad
        onClose={() => setIsOpen(false)} // Función para cerrar
        title="Información Importante"
      >
        {/* Contenido de ejemplo del modal */}
        <p>Este es un mensaje de ejemplo en el modal.</p>

        {/* Footer con botón de cerrar */}
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
        </div>
      </Modal>
    </>
  );
}

// Historia por defecto que usa el wrapper
export const Default: Story = {
  render: () => <ModalWrapper />, // Renderiza nuestro componente wrapper
};