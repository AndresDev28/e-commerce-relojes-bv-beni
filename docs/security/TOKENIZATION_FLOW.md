# Stripe Tokenization Flow - Security Documentation

**[PAY-21] Verificar que Stripe Elements maneja tokenización**
**Ticket:** AND-30

## Overview

This document explains how our payment system handles sensitive card data securely using Stripe's tokenization, ensuring we are **PCI DSS compliant** without needing certification.

## 🔒 The Tokenization Process

### Step 1: User Input (Secure Iframe)
```
┌─────────────────────────────────────┐
│  User enters card details           │
│  ┌─────────────────────────────┐    │
│  │  Stripe CardElement         │    │
│  │  (Hosted in Stripe iframe)  │    │
│  │                             │    │
│  │  Card: 4242 4242 4242 4242 │    │
│  │  Exp: 12/25   CVV: 123      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
         │
         │ Encrypted HTTPS
         ▼
┌─────────────────────────────────────┐
│  Stripe's Servers                   │
│  - Data encrypted in transit        │
│  - Stored in Stripe's PCI vault     │
└─────────────────────────────────────┘
```

**Key Points:**
- CardElement is an **iframe** hosted by Stripe
- Card data **never touches** our JavaScript context
- Data is encrypted at the **input level**
- Our code has **no access** to raw card numbers

### Step 2: Tokenization (stripe.confirmCardPayment)
```javascript
// Our code calls Stripe's API
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: {
      card: cardElement, // Reference to Stripe's iframe
    },
  }
)
```

**What happens internally:**
1. Stripe reads card data from the iframe
2. Creates a secure token (`pm_xxxxxx`)
3. Sends token to Stripe's API
4. Processes payment
5. Returns result to our app

**What we receive:**
- ✅ Payment confirmation (success/failure)
- ✅ Payment Intent ID (`pi_xxxxxx`)
- ✅ Last 4 digits (safe to display: `•••• 4242`)
- ✅ Card brand (Visa, Mastercard, etc.)
- ❌ **Never** full card number
- ❌ **Never** CVV
- ❌ **Never** raw card data

### Step 3: Data Flow Diagram
```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│   Browser    │         │  Our Server  │         │   Stripe     │
│  (Frontend)  │         │  (Backend)   │         │   Servers    │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │ 1. Load Stripe.js      │                        │
       │◄───────────────────────┼────────────────────────┤
       │                        │                        │
       │ 2. Render CardElement  │                        │
       │   (iframe from Stripe) │                        │
       │◄───────────────────────┼────────────────────────┤
       │                        │                        │
       │ 3. User enters card    │                        │
       │    (data stays in      │                        │
       │     Stripe's iframe)   │                        │
       │                        │                        │
       │ 4. Submit form         │                        │
       │    stripe.confirmCard  │                        │
       │    Payment()           │                        │
       │                        │                        │
       │ 5. Stripe tokenizes    │                        │
       │    card data           │                        │
       │────────────────────────┼────────────────────────►
       │                        │                        │
       │                        │ 6. Create Payment      │
       │                        │    Intent (if needed)  │
       │                        ├────────────────────────►
       │                        │                        │
       │                        │ 7. Payment Intent ID   │
       │                        │    (clientSecret)      │
       │                        │◄────────────────────────
       │                        │                        │
       │ 8. Payment confirmed   │                        │
       │    (token only)        │                        │
       │◄───────────────────────┼────────────────────────┤
       │                        │                        │
       │ 9. Show success        │                        │
       │    (no sensitive data) │                        │
       │                        │                        │

KEY:
─────► = Data flow
Card data = Never leaves Stripe's infrastructure
Token = Safe to transmit, cannot be used to steal money
```

## 🔐 Security Guarantees

### What We Never Store or Transmit
- ❌ Full credit card numbers
- ❌ CVV/CVC codes
- ❌ Raw card data of any kind

### What We Do Store (Safely)
- ✅ Payment Intent IDs (`pi_xxxxxx`)
- ✅ Last 4 digits (`•••• 4242`)
- ✅ Payment status (succeeded, failed)
- ✅ Order information

### PCI DSS Compliance
By using Stripe Elements:
- We are **PCI DSS SAQ A** compliant
- We **don't need** full PCI certification
- Card data **never touches** our servers
- We **don't need** to secure card data storage

## 🔑 API Key Security

### Publishable Key (pk_test_* / pk_live_*)
```javascript
// ✅ Safe to expose in frontend
const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
```

**Capabilities:**
- ✅ Create tokens
- ✅ Tokenize card data
- ✅ Retrieve public payment information
- ❌ Cannot process payments
- ❌ Cannot access sensitive data

### Secret Key (sk_test_* / sk_live_*)
```javascript
// ❌ NEVER expose in frontend
// ✅ Only used in server-side API routes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
```

**Capabilities:**
- ✅ Process payments
- ✅ Create charges
- ✅ Access all account data
- ⚠️ **Must be kept secret**

## 📝 Code Implementation

### Frontend (CheckoutForm.tsx)
```typescript
// [PAY-21] Card element is a secure Stripe iframe
<CardElement options={cardElementOptions} />

// Payment is processed through Stripe's secure API
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: {
      card: cardElement, // Stripe handles tokenization
    },
  }
)
```

### Configuration (config.ts)
```typescript
// [PAY-21] Validates that only publishable keys are used in frontend
export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  // Validates format: pk_test_* or pk_live_*
  if (!/^pk_(test|live)_/.test(key)) {
    throw new Error('Invalid Stripe publishable key format')
  }

  return key
}
```

## ✅ Security Verification

### How to Verify Tokenization is Working

1. **Check Network Requests:**
   ```
   ✅ Requests to https://api.stripe.com
   ✅ Only tokens (pm_*, pi_*) in payload
   ❌ No card numbers in requests
   ❌ No CVV codes in requests
   ```

2. **Check Console Logs:**
   ```javascript
   // ❌ This should NEVER appear in logs
   console.log('Card number:', cardNumber) // Dangerous!

   // ✅ This is safe
   console.log('Payment Intent:', paymentIntent.id) // Safe
   ```

3. **Check Browser DevTools:**
   - Open Network tab
   - Filter for Stripe requests
   - Verify only tokens are sent
   - No raw card data in payloads

## 🚨 Security Checklist

- [x] CardElement used for all card inputs
- [x] No direct card input fields (no `<input type="text">` for cards)
- [x] No card data stored in state/localStorage
- [x] No card data sent to our backend
- [x] Only publishable keys used in frontend
- [x] Secret keys only in server-side code
- [x] HTTPS enforced in production
- [x] Environment variables properly configured

## 📚 References

- [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
- [PCI DSS Compliance Guide](https://stripe.com/docs/security/guide)
- [Tokenization Best Practices](https://stripe.com/docs/security/tokens)

## 📞 Support

If you have questions about security implementation:
1. Review this document
2. Check Stripe's security documentation
3. Consult with the security team

---

**Last Updated:** 2025-11-12
**Author:** Development Team
**Ticket:** [PAY-21] AND-30
