type CsvCell = string | number | boolean | null | undefined;
type PdfLine = { text: string; size?: number; bold?: boolean };

export type PdfChartCard = {
  title: string;
  subtitle?: string;
  imageDataUrl: string;
};

function csvEscape(value: CsvCell) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function htmlEscape(value: CsvCell) {
  return (value === null || value === undefined ? '' : String(value))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadExcel(filename: string, sheetName: string, headers: string[], rows: CsvCell[][]) {
  const tableRows = [headers, ...rows]
    .map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`)
    .join('');
  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body><table>${tableRows}</table></body>
    </html>
  `;
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  anchor.dataset.downloadurl = ['application/vnd.ms-excel', anchor.download, anchor.href].join(':');
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function pdfEscape(value: CsvCell) {
  return (value === null || value === undefined ? '' : String(value))
    .replace(/[₹–—]/g, (match) => (match === '₹' ? 'INR ' : '-'))
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function encodeText(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function jpegSize(bytes: Uint8Array) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    offset += 2 + length;
  }
  return { width: 1200, height: 700 };
}

function splitPdfText(text: string, maxLength = 92) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function downloadPdfReport(title: string, sections: Array<{ heading: string; rows: CsvCell[][]; headers?: string[] }>, filename: string) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const lineHeight = 14;
  const contentLines: Array<{ text: string; size?: number; bold?: boolean }> = [
    { text: title, size: 18, bold: true },
    { text: `Generated ${new Date().toLocaleString()}`, size: 10 },
    { text: ' ' },
  ];

  sections.forEach((section) => {
    contentLines.push({ text: section.heading, size: 13, bold: true });
    if (section.headers?.length) {
      contentLines.push({ text: section.headers.join(' | '), size: 9, bold: true });
    }
    section.rows.forEach((row) => {
      splitPdfText(row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))).join(' | ')).forEach((line) => {
        contentLines.push({ text: line, size: 9 });
      });
    });
    contentLines.push({ text: ' ' });
  });

  const pages: typeof contentLines[] = [];
  let currentPage: typeof contentLines = [];
  let y = pageHeight - margin;

  contentLines.forEach((line) => {
    const size = line.size || 10;
    const needed = Math.max(lineHeight, size + 4);
    if (y - needed < margin && currentPage.length) {
      pages.push(currentPage);
      currentPage = [];
      y = pageHeight - margin;
    }
    currentPage.push(line);
    y -= needed;
  });
  if (currentPage.length) pages.push(currentPage);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegular = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageObjectIds: number[] = [];

  pages.forEach((page) => {
    let cursorY = pageHeight - margin;
    const commands = ['BT'];
    page.forEach((line) => {
      const size = line.size || 10;
      const fontId = line.bold ? 'F2' : 'F1';
      commands.push(`/${fontId} ${size} Tf`);
      commands.push(`1 0 0 1 ${margin} ${cursorY} Tm`);
      commands.push(`(${pdfEscape(line.text)}) Tj`);
      cursorY -= Math.max(lineHeight, size + 4);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    const streamObject = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageObject = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${streamObject} 0 R >>`);
    pageObjectIds.push(pageObject);
  });

  const pagesObject = addObject(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`);
  pageObjectIds.forEach((id) => {
    objects[id - 1] = objects[id - 1].replace('/Parent 0 0 R', `/Parent ${pagesObject} 0 R`);
  });
  const catalogObject = addObject(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function makeTextPages(title: string, sections: Array<{ heading: string; rows: CsvCell[][]; headers?: string[] }>) {
  const pageHeight = 842;
  const margin = 42;
  const lineHeight = 14;
  const contentLines: PdfLine[] = [
    { text: `${title} - Complete Data`, size: 18, bold: true },
    { text: `Generated ${new Date().toLocaleString()}`, size: 10 },
    { text: ' ' },
  ];

  sections.forEach((section) => {
    contentLines.push({ text: section.heading, size: 13, bold: true });
    if (section.headers?.length) {
      contentLines.push({ text: section.headers.join(' | '), size: 9, bold: true });
    }
    section.rows.forEach((row) => {
      splitPdfText(row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))).join(' | '), 110).forEach((line) => {
        contentLines.push({ text: line, size: 9 });
      });
    });
    contentLines.push({ text: ' ' });
  });

  const pages: PdfLine[][] = [];
  let currentPage: PdfLine[] = [];
  let y = pageHeight - margin;

  contentLines.forEach((line) => {
    const size = line.size || 10;
    const needed = Math.max(lineHeight, size + 4);
    if (y - needed < margin && currentPage.length) {
      pages.push(currentPage);
      currentPage = [];
      y = pageHeight - margin;
    }
    currentPage.push(line);
    y -= needed;
  });
  if (currentPage.length) pages.push(currentPage);
  return pages;
}

export function downloadPdfReportWithCharts(
  title: string,
  chartCards: PdfChartCard[],
  sections: Array<{ heading: string; rows: CsvCell[][]; headers?: string[] }>,
  filename: string
) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const objects: Uint8Array[] = [];
  const addObject = (body: string | Uint8Array) => {
    objects.push(typeof body === 'string' ? encodeText(body) : body);
    return objects.length;
  };

  const fontRegular = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageObjectIds: number[] = [];
  const imageRefs = chartCards.map((chart) => {
    const base64 = chart.imageDataUrl.split(',')[1] || '';
    const bytes = base64ToBytes(base64);
    const size = jpegSize(bytes);
    const imageObject = addObject(concatBytes([
      encodeText(`<< /Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),
      bytes,
      encodeText('\nendstream'),
    ]));
    return { objectId: imageObject, width: size.width, height: size.height };
  });

  const cardsPerPage = 4;
  for (let pageStart = 0; pageStart < chartCards.length; pageStart += cardsPerPage) {
    const cards = chartCards.slice(pageStart, pageStart + cardsPerPage);
    const commands = ['q', '1 1 1 rg', `0 0 ${pageWidth} ${pageHeight} re`, 'f', 'Q', 'BT'];
    commands.push(`/F2 16 Tf 1 0 0 1 ${margin} ${pageHeight - 24} Tm (${pdfEscape(title)}) Tj`);
    commands.push(`/F1 9 Tf 1 0 0 1 ${pageWidth - 172} ${pageHeight - 24} Tm (${pdfEscape(new Date().toLocaleString())}) Tj`);
    commands.push('ET');

    cards.forEach((card, localIndex) => {
      const globalIndex = pageStart + localIndex;
      const image = imageRefs[globalIndex];
      const col = localIndex % 2;
      const row = Math.floor(localIndex / 2);
      const cardW = (pageWidth - margin * 2 - 22) / 2;
      const cardH = 250;
      const x = margin + col * (cardW + 22);
      const y = pageHeight - 54 - row * (cardH + 22) - cardH;
      const imageW = cardW - 30;
      const imageH = 170;
      const imageX = x + 15;
      const imageY = y + 18;

      commands.push('q');
      commands.push('0.96 0.94 0.89 RG 1 1 1 rg 1 w');
      commands.push(`${x} ${y} ${cardW} ${cardH} re B`);
      commands.push('Q');
      commands.push('BT');
      commands.push(`/F2 12 Tf 1 0 0 1 ${x + 14} ${y + cardH - 26} Tm (${pdfEscape(card.title)}) Tj`);
      if (card.subtitle) {
        commands.push(`/F1 8 Tf 1 0 0 1 ${x + 14} ${y + cardH - 42} Tm (${pdfEscape(card.subtitle)}) Tj`);
      }
      commands.push('ET');
      commands.push('q');
      commands.push(`${imageW} 0 0 ${imageH} ${imageX} ${imageY} cm`);
      commands.push(`/Im${globalIndex + 1} Do`);
      commands.push('Q');
    });

    const imageResources = imageRefs
      .map((image, index) => `/Im${index + 1} ${image.objectId} 0 R`)
      .join(' ');
    const stream = commands.join('\n');
    const streamObject = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageObject = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> /XObject << ${imageResources} >> >> /Contents ${streamObject} 0 R >>`);
    pageObjectIds.push(pageObject);
  }

  makeTextPages(title, sections).forEach((page) => {
    let cursorY = 842 - 42;
    const commands = ['BT'];
    page.forEach((line) => {
      const size = line.size || 10;
      const fontId = line.bold ? 'F2' : 'F1';
      commands.push(`/${fontId} ${size} Tf`);
      commands.push(`1 0 0 1 42 ${cursorY} Tm`);
      commands.push(`(${pdfEscape(line.text)}) Tj`);
      cursorY -= Math.max(14, size + 4);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    const streamObject = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageObject = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${streamObject} 0 R >>`);
    pageObjectIds.push(pageObject);
  });

  const pagesObject = addObject(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`);
  pageObjectIds.forEach((id) => {
    const text = new TextDecoder().decode(objects[id - 1]);
    objects[id - 1] = encodeText(text.replace('/Parent 0 0 R', `/Parent ${pagesObject} 0 R`));
  });
  const catalogObject = addObject(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

  const parts: Uint8Array[] = [encodeText('%PDF-1.4\n')];
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(parts.reduce((sum, part) => sum + part.length, 0));
    parts.push(encodeText(`${index + 1} 0 obj\n`), body, encodeText('\nendobj\n'));
  });
  const xrefOffset = parts.reduce((sum, part) => sum + part.length, 0);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encodeText(xref));

  const blob = new Blob([concatBytes(parts)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function printReport(title: string, sections: Array<{ heading: string; rows: CsvCell[][]; headers?: string[] }>) {
  const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
  if (!reportWindow) return;

  const sectionMarkup = sections.map((section) => {
    const head = section.headers?.length
      ? `<thead><tr>${section.headers.map((header) => `<th>${htmlEscape(header)}</th>`).join('')}</tr></thead>`
      : '';
    const body = section.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`)
      .join('');

    return `
      <section>
        <h2>${htmlEscape(section.heading)}</h2>
        <table>${head}<tbody>${body}</tbody></table>
      </section>
    `;
  }).join('');

  reportWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${htmlEscape(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          h2 { margin: 28px 0 10px; font-size: 16px; }
          p { color: #475569; margin: 0 0 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; page-break-inside: auto; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; font-weight: 700; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          @media print { body { margin: 18mm; } }
        </style>
      </head>
      <body>
        <h1>${htmlEscape(title)}</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        ${sectionMarkup}
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  reportWindow.document.close();
}
