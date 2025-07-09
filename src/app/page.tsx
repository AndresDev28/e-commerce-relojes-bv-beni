//import Image from "next/image";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";
import Spinner from "./components/ui/Spinner";

export default function Home() {
  return (
    <main className="flex flex-col justify-center items-center gap-4 p-8">
      <h1 className="text-4xl text-blue-500 mb-8">Relojes BV Beni</h1>

      <div className="flex gap-4">
        <Button>Comprar Ahora</Button>
        <Button variant="secondary">Ver detalles</Button>
        <Button disabled>Agotado</Button>
      </div>

      <div className="flex flex-col gap-4">
        <h3>Inputs para formularios</h3>
        <Input label="Email" placeholder="tu@email.com"/>
        <Input error="Email inválido" label="Email" placeholder="tu@email.com"/>
        <Input placeholder="Buscar relojes" variant="search"/>
      </div>

      <div className="flex flex-col gap-4">
        <h3>Modelos de spinner</h3>
        <Spinner size="md" variant="primary" />
        <Spinner size="sm" variant="primary" />
        <Spinner size="lg" variant="primary" />
      </div>
    </main>
  );
}