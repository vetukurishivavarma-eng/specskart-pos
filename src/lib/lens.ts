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
  fulfilment: 'ORDERED' | 'READY' | 'DELIVERED' | null
  paid: boolean
  createdAt: string
  // the order itself -- staff never depend on the WhatsApp alert reaching them
  waId: string | null
  leadId: string | null
  age: number | null
  gender: string | null
  sphRight: number | null; cylRight: number | null; axisRight: number | null
  sphLeft: number | null; cylLeft: number | null; axisLeft: number | null
  addPower: number | null
  /** for the lab: "62" or "31.5/30.5" */
  pd: string | null
  /** money taken so far, and what is still owed at pickup */
  paidMinor: number
  balanceMinor: number
}
