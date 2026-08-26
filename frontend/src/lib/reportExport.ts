export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printHtml(title: string, body: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: Segoe UI, Helvetica, Arial, sans-serif; padding: 32px; color: #111827; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
      th { background: #f3f4f6; }
      .ok { color: #059669; font-weight: 600; }
      .bad { color: #e11d48; font-weight: 600; }
    </style>
  </head><body>${body}<script>window.onload=function(){window.print()}<\/script></body></html>`);
  printWindow.document.close();
}
