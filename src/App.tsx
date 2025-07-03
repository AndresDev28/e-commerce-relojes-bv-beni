//import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'

// --- Creamos componentes de página de ejemplo para probar ---
// (Más adelante, estos serán los archivos que crearemos en la carpeta `src/pages`)

const HomePage = () => <h1>Página de Inicio</h1>
const ProductsPage = () => <h1>Página de Lista de Productos</h1>
const ProductDetailPage = () => <h1>Página de Detalle de Producto</h1>
const CartPage = () => <h1>Página del Carrito</h1>
const NotFoundPage = () => <h1>404 - Página no encontrada</h1>

function App() {
  return (
    <div>
      {/* Aquí iría el componente <Navbar /> */}

      <Routes>
        {' '}
        {/* El componente <Routes> envuelve todas tus rutas individuales */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/shopCart" element={<CartPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Aquí iría el componente <Footer /> */}
    </div>
  )
}

export default App
