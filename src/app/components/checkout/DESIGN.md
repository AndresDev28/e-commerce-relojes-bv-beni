# CheckoutForm - Design Document

## Props

```typescript
interface CheckoutFormProps {
  amount: number
  onSuccess?: () => void
  onError?: (error: string) => void
}
```

## State

```typescript
const [isProcessing, setIsProcessing] = useState(false)
const [errorMessage, setErrorMessage] = useState('')
```

## Hooks

```typescrip

const stripe = useStripe()
const elements = useElements()
```

## Flow - handleSubmit

1. e.preventDefault()
2. Validar que stripe existe
3. Validar que elements existe
4. Obtener cardElement
5. Validar que cardElement existe
6. setIsProcessing(true)
7. Simular delay de 2 segundos
8. Llamar onSuccess()
9. setIsProcessing(false)
10. Si hay éxito:
    onSucces?.()
11. setIsProcessing(false) (siempre, en finally)

## UI Structure

```
jsx

<form>
  <div className="card-input">
    <label>Detalles de tarjeta</label>
    <CardElement />
  </div>

  {errorMessage && <div className="error">{errorMessage}</div>}

  <button disabled={!stripe || isProcessing}>
    {isProcessing ? 'Procesando...' : `Pagar ${amount}€`}
  </button>
</form>
```
