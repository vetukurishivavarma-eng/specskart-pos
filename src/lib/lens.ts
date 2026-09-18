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
  deliveryName: string | null
  deliveryAddress: string | null
  deliveryArea: string | null
  deliveryLandmark: string | null
  createdAt: string
}
