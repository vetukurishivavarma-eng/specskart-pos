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

export type SupplierView = {
  id: string
  name: string
  contactName: string
  phone: string
  email: string
  address: string
  notes: string
  active: boolean
}

export type InvoiceItemView = { productId: string | null; productName: string; sku: string; quantity: number; unitCostMinor: number; lineTotalMinor: number }
export type InvoicePaymentView = { amountMinor: number; method: string; reference: string | null; paidAt: string }
export type InvoiceView = {
  id: string
  supplierId: string
  supplierName: string
  storeId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  subtotalMinor: number
  otherChargesMinor: number
  totalMinor: number
  amountPaidMinor: number
  balanceMinor: number
  status: string
  items: InvoiceItemView[]
  payments: InvoicePaymentView[]
}

export type TransferItemView = { productId: string; productName: string; quantity: number }
export type TransferView = {
  id: string
  reference: string
  fromStoreId: string | null
  toStoreId: string | null
  status: string
  notes: string
  items: TransferItemView[]
  createdAt: string
}

export type StaffMember = { id: string; name: string; email: string; role: string; active: boolean; storeId: string | null }

export type TopItem = { name: string; quantity: number; totalMinor: number }
export type DayReportView = {
  storeId: string
  reportDate: string
  saleCount: number
  grossTotalMinor: number
  cashTotalMinor: number
  cardTotalMinor: number
  mobileTotalMinor: number
  topItems: TopItem[]
}

export type MovementView = {
  productId: string
  productName: string
  type: string
  quantity: number
  balance: number
  reference: string | null
  note: string | null
  createdAt: string
}

export type ProductRank = { productId: string; productName: string; revenueMinor: number; profitMinor: number; quantity: number }

export type ReorderLine = {
  productId: string
  productName: string
  sku: string
  quantity: number
  reorderLevel: number
  suggestedQuantity: number
}

export type StaffDetail = { id: string; name: string; email: string; role: string; active: boolean; storeId: string | null }

export type VersionInfo = { version: string; buildNumber: number; minimumBuild: number; downloadUrl: string; notes: string; mandatory: boolean }

export type StoreView = {
  id: string; name: string; code: string; city: string; active: boolean
  // map pin — set = this shop's stock sells online and it ships the nearest web orders
  latitude: number | null; longitude: number | null
}
