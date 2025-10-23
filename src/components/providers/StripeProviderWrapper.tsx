'use client'
import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe/client'
import { Stripe } from '@/types'

interface StripeProviderWrapperProps {
  children: React.ReactNode
}

export default function StripeProviderWrapper({
  children,
}: StripeProviderWrapperProps) {
  // 1. Estado para la promesa de Stripe
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null)
  // 2. useEffect para cargar Stripe (se ejecuta una vez)
  useEffect(() => {
    setStripePromise(getStripe())
  }, []) // Array vacío = solo se ejecuta al montar
  // 3. Return con Elements provider
  return <Elements stripe={stripePromise}>{children}</Elements>
}
