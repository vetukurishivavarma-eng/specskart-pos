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
export async function printSaleReceipt(sale: PosSaleView, storeName: string) {
  const rows = sale.items.map((i) =>
    `<tr><td>${i.quantity} × ${escapeHtml(i.productName)}</td><td style="text-align:right">${formatKwacha(i.lineTotalMinor)}</td></tr>`
  ).join('')
  const payRows = sale.payments.map((p) =>
    `<tr><td>${p.method}</td><td style="text-align:right">${formatKwacha(p.amountMinor)}</td></tr>`
  ).join('')

  const html = `
    <html><body style="font-family: monospace; font-size: 14px; width: 280px; margin: 0 auto;">
      <h2 style="text-align:center; margin-bottom:4px;">${escapeHtml(storeName)}</h2>
      <p style="text-align:center; margin-top:0;">${sale.receiptNumber}<br/>${new Date(sale.createdAt).toLocaleString()}</p>
      <hr/>
      <table style="width:100%">${rows}</table>
      <hr/>
      <table style="width:100%">
        <tr><td><b>Total</b></td><td style="text-align:right"><b>${formatKwacha(sale.totalMinor)}</b></td></tr>
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
