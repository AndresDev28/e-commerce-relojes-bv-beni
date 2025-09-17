// Este layout se aplicará a todas las páginas dentro de la carpeta (auth)
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="bg-dark text-light min-h-screen">{children}</div>
}
