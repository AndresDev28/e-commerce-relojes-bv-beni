//import Image from "next/image";
import Button from "./components/ui/Button";

export default function Home() {
  return (
    <main className="flex flex-col justify-center items-center gap-4 p-8">
      <h1 className="text-4xl text-blue-500 mb-8">Relojes BV Beni</h1>

      <div className="flex gap-4">
        <Button>Comprar Ahora</Button>
        <Button variant="secondary">Ver detalles</Button>
        <Button disabled>Agotado</Button>
      </div>
    </main>
  );
}