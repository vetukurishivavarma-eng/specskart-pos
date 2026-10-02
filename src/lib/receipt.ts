import * as Print from 'expo-print'
import { formatKwacha } from '../theme'
import { PosSaleView } from './pos'

/** Renders a plain-text-style receipt as HTML and hands it to the OS print dialog.
 *
 * ponytail: uses expo-print (system print framework) rather than raw ESC/POS commands over
 * Bluetooth. That means it works with whatever printer is already paired at the OS level via
 * its own print-service app (most Android thermal receipt printers ship one) instead of this
 * app talking to a specific printer model's byte protocol directly -- less code, but no manual
 * feed/cut control and no way to list/pick a printer from inside this app. If a specific
 * printer's print-service is missing or the shop needs finer control, swap this for a
 * dedicated ESC/POS library targeting that printer.
 */
export type LensOnBill = { ref: string; label: string; priceMinor: number; method: string; createdAt?: string }

/** Prints a frame sale, a lens order, or both on one bill (the counter's combined sale). */
export async function printSaleReceipt(sale: PosSaleView | null, storeName: string, lens?: LensOnBill) {
  const rows = (sale?.items ?? []).map((i) =>
    `<tr><td>${i.quantity} × ${escapeHtml(i.productName)}</td><td style="text-align:right">${formatKwacha(i.lineTotalMinor)}</td></tr>`
  ).join('') + (lens
    ? `<tr><td>Lenses · ${escapeHtml(lens.label)}<br/><small>${lens.ref}</small></td><td style="text-align:right">${formatKwacha(lens.priceMinor)}</td></tr>`
    : '')
  const payments = [...(sale?.payments ?? [])]
  if (lens) {
    const same = payments.find((p) => p.method === lens.method)
    if (same) same.amountMinor += lens.priceMinor
    else payments.push({ method: lens.method, amountMinor: lens.priceMinor, reference: null })
  }
  const payRows = payments.map((p) =>
    `<tr><td>${p.method}</td><td style="text-align:right">${formatKwacha(p.amountMinor)}</td></tr>`
  ).join('')
  const total = (sale?.totalMinor ?? 0) + (lens?.priceMinor ?? 0)
  const number = [sale?.receiptNumber, lens?.ref].filter(Boolean).join(' · ')
  const when = new Date(sale?.createdAt ?? lens?.createdAt ?? Date.now()).toLocaleString()

  const html = `
    <html><body style="font-family: monospace; font-size: 14px; width: 280px; margin: 0 auto;">
      <h2 style="text-align:center; margin-bottom:4px;">${escapeHtml(storeName || 'Specskart')}</h2>
      <p style="text-align:center; margin-top:0;">${number}<br/>${when}</p>
      <hr/>
      <table style="width:100%">${rows}</table>
      <hr/>
      <table style="width:100%">
        <tr><td><b>Total</b></td><td style="text-align:right"><b>${formatKwacha(total)}</b></td></tr>
      </table>
      <hr/>
      <table style="width:100%">${payRows}</table>
      <p style="text-align:center; margin-top:16px;">Thank you for shopping at Specskart</p>
    </body></html>
  `
  await Print.printAsync({ html })
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
