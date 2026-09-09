import React from 'react';
import { X, Printer, Download, Building, Phone, Mail, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  customer?: any;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customer
}) => {
  if (!isOpen || !invoice) return null;

  const invDate = invoice.invoiceDate || invoice.date || new Date().toISOString().split('T')[0];
  const dueDate = invoice.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [
    {
      productName: 'TMT Steel Rebars (Fe550D 12mm)',
      sku: 'TMT-12MM-FE550D',
      hsn: '7214',
      quantity: 2,
      unitPrice: 51000,
      taxRate: 18,
      total: 120360
    }
  ];

  const subTotal = Number(invoice.subTotal || items.reduce((acc: number, item: any) => acc + (Number(item.quantity || 1) * Number(item.unitPrice || 0)), 0));
  const taxAmount = Number(invoice.taxAmount || (subTotal * 0.18));
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  const grandTotal = Number(invoice.grandTotal || (subTotal + taxAmount));

  // Indian Rupees to Words converter
  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    
    if ((num = num.toString() as any).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str ? str + 'Rupees Only' : 'Zero Rupees';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* CSS for print layout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #tax-invoice-printable, #tax-invoice-printable * {
            visibility: visible;
          }
          #tax-invoice-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Control Bar */}
        <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide">GST Tax Invoice Viewer</h3>
              <p className="text-[11px] text-slate-400 font-mono">{invoice.invoiceNumber || 'INV-2026-0001'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Download PDF / Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50">
          <div
            id="tax-invoice-printable"
            className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6 text-slate-800 text-xs font-medium"
          >
            {/* Header: Seller Info & Tax Invoice Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black flex items-center justify-center text-base tracking-wider shadow-sm">
                    CM
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">CRAFT MEDIA HUB ENTERPRISES</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Digital CRM & Enterprise Media Solutions</p>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-600 space-y-0.5 font-medium leading-relaxed">
                  <p>Plot 45, Craft Media Tower, Corporate Zone, Ahmedabad, Gujarat - 380015</p>
                  <p><span className="font-bold text-slate-700">GSTIN:</span> 24AABCC5542E1ZQ | <span className="font-bold text-slate-700">State:</span> Gujarat (24)</p>
                  <p><span className="font-bold text-slate-700">Email:</span> billing@craftmediahub.com | <span className="font-bold text-slate-700">Phone:</span> +91 79 2658 5555</p>
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-xs rounded-md uppercase tracking-wider mb-2">
                  TAX INVOICE
                </span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Original for Recipient</p>
                <div className="mt-3 space-y-1 font-mono text-xs">
                  <p className="font-extrabold text-blue-600 text-sm">{invoice.invoiceNumber || 'INV-2026-0001'}</p>
                  <p className="text-slate-600"><span className="text-slate-400 font-sans">Date:</span> {invDate}</p>
                  <p className="text-slate-600"><span className="text-slate-400 font-sans">Due Date:</span> {dueDate}</p>
                </div>
              </div>
            </div>

            {/* Billed To & Shipped To Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Billed To (Buyer / Recipient)</span>
                <h3 className="font-bold text-slate-900 text-sm">{invoice.customerName || customer?.companyName || customer?.name || 'Valued Customer'}</h3>
                <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                  <p className="font-semibold text-slate-700">{customer?.name ? `Attn: ${customer.name}` : ''}</p>
                  <p><span className="font-bold">GSTIN:</span> {invoice.gstNumber || customer?.gstNumber || '24AAAAA0000A1Z5'}</p>
                  <p><span className="font-bold">Phone:</span> {customer?.phone || '+91 98765 43210'}</p>
                  <p><span className="font-bold">Email:</span> {customer?.email || 'billing@clientcompany.com'}</p>
                  <p className="text-slate-500 mt-1">{customer?.address?.city || 'Ahmedabad'}, {customer?.address?.state || 'Gujarat'}, India</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Invoice Logistics & Dispatch</span>
                <div className="text-[11px] text-slate-600 space-y-1 font-medium">
                  <p><span className="font-bold text-slate-700">Sales Order Ref:</span> <span className="font-mono text-blue-600">{invoice.salesOrderNumber || invoice.salesOrderId || 'SO-2026-0001'}</span></p>
                  <p><span className="font-bold text-slate-700">Payment Terms:</span> {invoice.paymentTerms || 'Net 30 Days'}</p>
                  <p><span className="font-bold text-slate-700">Payment Status:</span> <span className="font-bold text-emerald-600">{invoice.paymentStatus || 'UNPAID'}</span></p>
                  <p><span className="font-bold text-slate-700">Place of Supply:</span> Gujarat (24)</p>
                  <p><span className="font-bold text-slate-700">Reverse Charge:</span> No</p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5">Item & Description</th>
                    <th className="p-2.5 text-center">HSN</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Rate (₹)</th>
                    <th className="p-2.5 text-right">GST %</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-300 font-medium">
                  {items.map((item: any, idx: number) => {
                    const qty = Number(item.quantity || 1);
                    const rate = Number(item.unitPrice || 0);
                    const total = Number(item.total || (qty * rate * 1.18));
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.productName || item.title || 'Steel Product Item'}
                          {item.sku && <span className="block text-[10px] font-mono text-slate-400 font-normal">SKU: {item.sku}</span>}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500">{item.hsn || '7214'}</td>
                        <td className="p-2.5 text-right font-bold text-slate-800">{qty}</td>
                        <td className="p-2.5 text-right font-mono">₹{rate.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-600">{item.taxRate || item.taxPercent || 18}%</td>
                        <td className="p-2.5 text-right font-bold text-slate-900 font-mono">₹{total.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations & Bank Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Bank Info & Amount in Words */}
              <div className="sm:col-span-7 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Amount in Words</span>
                  <p className="text-xs font-bold text-slate-900 capitalize italic">
                    {numberToWords(Math.round(grandTotal))}
                  </p>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] space-y-1 text-slate-700">
                  <span className="font-bold text-blue-900 uppercase tracking-wider text-[10px] block">Bank Account for NEFT / RTGS Transfer</span>
                  <p><span className="font-semibold text-slate-800">Account Name:</span> CRAFT MEDIA HUB ENTERPRISES</p>
                  <p><span className="font-semibold text-slate-800">Bank Name:</span> HDFC Bank Ltd (Corporate Branch, Ahmedabad)</p>
                  <p><span className="font-semibold text-slate-800">A/C No:</span> <span className="font-mono font-bold">50200084729103</span> | <span className="font-semibold text-slate-800">IFSC Code:</span> <span className="font-mono font-bold">HDFC0001234</span></p>
                </div>
              </div>

              {/* Right Column: Tax Breakdown */}
              <div className="sm:col-span-5 space-y-1.5 text-xs font-medium text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Taxable Subtotal:</span>
                  <span className="font-bold font-mono">₹{subTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 text-[11px]">
                  <span className="text-slate-500">CGST (9%):</span>
                  <span className="font-mono">₹{cgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 text-[11px]">
                  <span className="text-slate-500">SGST (9%):</span>
                  <span className="font-mono">₹{sgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-black text-slate-900 pt-2">
                  <span>Grand Total (GST Inc.):</span>
                  <span className="text-amber-600 font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Footer Terms & Signature */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-[10px] text-slate-500">
              <div className="space-y-0.5 max-w-sm">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Terms & Conditions</p>
                <p>1. Payment due within specified credit terms.</p>
                <p>2. Goods once sold will not be returned or exchanged.</p>
                <p>3. Subject to Ahmedabad jurisdiction only.</p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-slate-900 text-xs">For CRAFT MEDIA HUB ENTERPRISES</p>
                <div className="h-12 flex items-center justify-end">
                  <span className="text-slate-300 font-mono text-[9px] border border-dashed border-slate-300 px-3 py-1 rounded">
                    [ Digitally Signed & Verified ]
                  </span>
                </div>
                <p className="font-bold text-slate-700">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
