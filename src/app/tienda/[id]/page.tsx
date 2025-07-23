export default function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return <h1>Detalle del producto con ID: {params.id}</h1>
}
