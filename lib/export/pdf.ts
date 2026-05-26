// GST-compliant invoice PDF generator
// Uses @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: '#111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#6366f1' },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  invoiceNumber: { fontSize: 11, color: '#666', textAlign: 'right' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 140, color: '#666' },
  value: { flex: 1 },
  table: { marginTop: 12, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: '6 4', fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: '5 4', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  col5: { flex: 1, textAlign: 'right' },
  totals: { alignItems: 'flex-end', marginTop: 8 },
  totalRow: { flexDirection: 'row', marginBottom: 3 },
  totalLabel: { width: 160, textAlign: 'right', color: '#666' },
  totalValue: { width: 100, textAlign: 'right' },
  grandTotal: { fontWeight: 'bold', fontSize: 12, borderTopWidth: 1, borderTopColor: '#111', paddingTop: 4, marginTop: 4 },
  footer: { marginTop: 30, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 10, color: '#666', fontSize: 9 },
  badge: { backgroundColor: '#dcfce7', color: '#166534', padding: '2 6', borderRadius: 4, fontSize: 9 },
})

export interface InvoiceData {
  invoice_number: string
  invoice_date: string
  due_date?: string
  payment_status: 'paid' | 'unpaid' | 'partial'

  seller: {
    name: string
    address: string
    gstin: string
    phone?: string
    email?: string
  }

  buyer: {
    name: string
    address: string
    gstin?: string
    phone?: string
  }

  place_of_supply: string

  line_items: Array<{
    description: string
    hsn_sac: string
    qty: number
    unit: string
    rate: number
    amount: number
  }>

  is_igst: boolean  // true if inter-state
  cgst_rate: number // e.g. 9
  sgst_rate: number // e.g. 9
  igst_rate: number // e.g. 18

  subtotal: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_tax: number
  grand_total: number

  bank_details?: {
    bank_name: string
    account_number: string
    ifsc: string
  }

  notes?: string
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, null,
          React.createElement(Text, { style: styles.companyName }, data.seller.name),
          React.createElement(Text, { style: { color: '#666', marginTop: 2 } }, data.seller.address),
          React.createElement(Text, { style: { color: '#666' } }, `GSTIN: ${data.seller.gstin}`),
          data.seller.phone && React.createElement(Text, { style: { color: '#666' } }, `Ph: ${data.seller.phone}`)
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: styles.title }, 'TAX INVOICE'),
          React.createElement(Text, { style: styles.invoiceNumber }, `#${data.invoice_number}`),
          React.createElement(Text, { style: { color: '#666', textAlign: 'right' } },
            `Date: ${new Date(data.invoice_date).toLocaleDateString('en-IN')}`
          ),
          data.due_date && React.createElement(Text, { style: { color: '#666', textAlign: 'right' } },
            `Due: ${new Date(data.due_date).toLocaleDateString('en-IN')}`
          )
        )
      ),

      // Bill to
      React.createElement(View, { style: { flexDirection: 'row', gap: 40, marginBottom: 16 } },
        React.createElement(View, { style: { flex: 1 } },
          React.createElement(Text, { style: styles.sectionTitle }, 'Bill To'),
          React.createElement(Text, { style: { fontWeight: 'bold' } }, data.buyer.name),
          React.createElement(Text, { style: { color: '#666' } }, data.buyer.address),
          data.buyer.gstin && React.createElement(Text, { style: { color: '#666' } }, `GSTIN: ${data.buyer.gstin}`),
          data.buyer.phone && React.createElement(Text, { style: { color: '#666' } }, `Ph: ${data.buyer.phone}`)
        ),
        React.createElement(View, { style: { flex: 1 } },
          React.createElement(Text, { style: styles.sectionTitle }, 'Supply Details'),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Place of Supply:'),
            React.createElement(Text, { style: styles.value }, data.place_of_supply)
          ),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Tax Type:'),
            React.createElement(Text, { style: styles.value }, data.is_igst ? 'IGST' : 'CGST + SGST')
          )
        )
      ),

      // Line items table
      React.createElement(View, { style: styles.table },
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: styles.col1 }, 'Description'),
          React.createElement(Text, { style: styles.col2 }, 'HSN/SAC'),
          React.createElement(Text, { style: styles.col2 }, 'Qty'),
          React.createElement(Text, { style: styles.col3 }, 'Rate (₹)'),
          React.createElement(Text, { style: styles.col4 }, 'Amount (₹)')
        ),
        ...data.line_items.map((item, i) =>
          React.createElement(View, { key: i, style: styles.tableRow },
            React.createElement(Text, { style: styles.col1 }, item.description),
            React.createElement(Text, { style: styles.col2 }, item.hsn_sac),
            React.createElement(Text, { style: styles.col2 }, `${item.qty} ${item.unit}`),
            React.createElement(Text, { style: styles.col3 }, item.rate.toLocaleString('en-IN')),
            React.createElement(Text, { style: styles.col4 }, item.amount.toLocaleString('en-IN'))
          )
        )
      ),

      // Totals
      React.createElement(View, { style: styles.totals },
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'Subtotal'),
          React.createElement(Text, { style: styles.totalValue }, fmt(data.subtotal))
        ),
        !data.is_igst && React.createElement(React.Fragment, null,
          React.createElement(View, { style: styles.totalRow },
            React.createElement(Text, { style: styles.totalLabel }, `CGST @ ${data.cgst_rate}%`),
            React.createElement(Text, { style: styles.totalValue }, fmt(data.cgst_amount))
          ),
          React.createElement(View, { style: styles.totalRow },
            React.createElement(Text, { style: styles.totalLabel }, `SGST @ ${data.sgst_rate}%`),
            React.createElement(Text, { style: styles.totalValue }, fmt(data.sgst_amount))
          )
        ),
        data.is_igst && React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, `IGST @ ${data.igst_rate}%`),
          React.createElement(Text, { style: styles.totalValue }, fmt(data.igst_amount))
        ),
        React.createElement(View, { style: [styles.totalRow, styles.grandTotal] },
          React.createElement(Text, { style: styles.totalLabel }, 'Total Amount'),
          React.createElement(Text, { style: styles.totalValue }, fmt(data.grand_total))
        )
      ),

      // Bank & notes
      data.bank_details && React.createElement(View, { style: { marginTop: 20 } },
        React.createElement(Text, { style: styles.sectionTitle }, 'Bank Details'),
        React.createElement(Text, null, `${data.bank_details.bank_name} | A/C: ${data.bank_details.account_number} | IFSC: ${data.bank_details.ifsc}`)
      ),

      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, 'This is a computer-generated invoice and does not require a physical signature.'),
        data.notes && React.createElement(Text, { style: { marginTop: 4 } }, `Note: ${data.notes}`)
      )
    )
  )
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(InvoiceDocument, { data }) as any
  const instance = pdf(doc)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}
