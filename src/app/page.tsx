'use client'// Necesario para hooks en páginas de next.js
//import Image from "next/image";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";
import Spinner from "./components/ui/Spinner";
import Modal from "./components/ui/Modal";
import { useState } from "react";

export default function Home() {
  // Estado para controlar visibilidad del modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <main className="flex flex-col justify-center items-center gap-4 p-8">
      
    </main>
  );
}