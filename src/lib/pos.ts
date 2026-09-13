// Mirrors com.specskart.pos.PosDtos on the backend.
export type InventoryRow = {
  productId: string
  productName: string
  sku: string
  quantity: number
  reorderLevel: number
  priceMinor: number
}

export type FrameProduct = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  priceMinor: number
  currency: string
  stockQty: number
  status: string
}

export type SaleItemView = {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPriceMinor: number
  lineTotalMinor: number
}
export type PaymentView = { method: string; amountMinor: number; reference: string | null }
export type PosSaleView = {
  id: string
  receiptNumber: string
  storeId: string
  status: string
  subtotalMinor: number
  discountMinor: number
  totalMinor: number
  cashierName: string
  customerName: string | null
  customerPhone: string | null
  items: SaleItemView[]
  payments: PaymentView[]
  createdAt: string
}

export type DeviceView = {
  id: string
  deviceName: string
  platform: string
  appVersion: string | null
  lastSeenAt: string
  active: boolean
}

export type CartLine = { product: FrameProduct; quantity: number }
