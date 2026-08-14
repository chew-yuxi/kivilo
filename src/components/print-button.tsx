'use client'

/// A browser's "save as PDF" is the print dialog, so one button covers both printing
/// and the PDF a landlord wants to file. Hidden from the printed page itself.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 print:hidden"
    >
      Print or save PDF
    </button>
  )
}
