
import { jsPDF } from './apps/web/node_modules/jspdf/dist/jspdf.es.min.js';
import autoTable, { applyPlugin } from './apps/web/node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs';
import QRCode from './apps/web/node_modules/qrcode/lib/index.js';
import fs from 'fs';

applyPlugin(jsPDF);

async function testQrPdf() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const qrOpts = { width: 120, margin: 1, color: { dark: '#004d25', light: '#ffffff' } };
  const qr1 = await QRCode.toDataURL('NBP-PMS-ESIGN:SAP:84920:PMS-ACK-VALID', qrOpts);
  const qr2 = await QRCode.toDataURL('NBP-PMS-ESIGN:SAP:10004:APP1-VERIFIED', qrOpts);
  const qr3 = await QRCode.toDataURL('NBP-PMS-ESIGN:SAP:10008:COAPP-VERIFIED', qrOpts);
  const qr4 = await QRCode.toDataURL('NBP-PMS-ESIGN:SAP:10003:APP2-COUNTERSIGNED', qrOpts);

  const qrCodes = [qr1, qr2, qr3, qr4];

  autoTable(doc, {
    startY: 20,
    head: [[{ content: '4. FORMAL SIGNATURES & VERIFICATION', colSpan: 4 }]],
    body: [
      [
        { content: 'Appraisee / Employee:\nFawaz Ahmed\nSAP: 84920 (AVP)\n\nAcknowledgement: Agreed\nDate: 03/09/2026\nDigital Seal: PMS-ACK-VALID', styles: { cellWidth: 46.5, minCellHeight: 28 } },
        { content: '1st Appraiser (Supervisor):\nTariq Mahmood\nSAP: 10004 (VP)\n\nEvaluation: Submitted\nDate: 03/09/2026\nDigital Seal: APP1-VERIFIED', styles: { cellWidth: 46.5, minCellHeight: 28 } },
        { content: 'Co-Appraiser:\nMatrix Head\nSAP: 10008 (AVP)\n\nCo-Appraisal: Reviewed\nDate: 03/09/2026\nDigital Seal: COAPP-VERIFIED', styles: { cellWidth: 46.5, minCellHeight: 28 } },
        { content: '2nd Appraiser:\nRashid Khan\nSAP: 10003 (SVP)\n\nCountersign: Signed\nDate: 03/09/2026\nDigital Seal: APP2-COUNTERSIGNED', styles: { cellWidth: 46.5, minCellHeight: 28 } }
      ]
    ],
    didDrawCell: (data) => {
      if (data.section === 'body' && data.row.index === 0) {
        const qr = qrCodes[data.column.index];
        if (qr) {
          const qrSize = 13;
          const qrX = data.cell.x + data.cell.width - qrSize - 2;
          const qrY = data.cell.y + 2;
          doc.addImage(qr, 'PNG', qrX, qrY, qrSize, qrSize);
        }
      }
    }
  });

  const buffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync('./scratch/test_qr_output.pdf', buffer);
  console.log('Successfully generated test_qr_output.pdf, size:', buffer.length);
}

testQrPdf().catch(console.error);
