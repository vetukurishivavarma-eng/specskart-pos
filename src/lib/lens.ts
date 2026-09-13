// Mirrors the backend's LensDtos — see specskart-v1 backend/src/main/java/com/specskart/lens.
export type PricingOption = { id: string; code: string; label: string; priceMinor: number; inStock: boolean }

export type SaleView = {
  id: string
  customerName: string | null
  lensType: string
  blueBlock: boolean
  lensStructure: string | null
  specialAxis: boolean
  priceMinor: number
  currency: string
  paymentMethod: string | null
  soldBy: string | null
  shopName: string | null
  walkIn: boolean
  createdAt: string
}

export function money(minor: number, currency = 'ZMW') {
  return `${currency === 'ZMW' ? 'K' : currency}${(minor / 100).toFixed(2)}`
}
