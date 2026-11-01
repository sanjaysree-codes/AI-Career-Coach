import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { extractDocxResumeText, extractPdfResumeText, hasReadableResumeText } from '../src/resume-text.js';

function makePdf(text = '') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ compress: false });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    if (text) doc.text(text);
    doc.end();
  });
}

test('text-based PDF resumes use extracted text without invoking OCR', async () => {
  const pdf = await makePdf('Jordan Lee\nSoftware engineer with five years of experience building reliable services and customer focused products.');
  let ocrCalled = false;
  const result = await extractPdfResumeText(pdf, async buffer => (await pdfParse(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength))).text, async () => { ocrCalled = true; return ''; });
  assert.match(result.text, /Jordan Lee/);
  assert.equal(result.usedOcr, false);
  assert.equal(ocrCalled, false);
});

test('scanned PDF with no embedded text falls back to OCR text', async () => {
  const scannedPdf = await makePdf();
  let ocrCalled = false;
  const result = await extractPdfResumeText(scannedPdf, async buffer => (await pdfParse(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength))).text, async () => {
    ocrCalled = true;
    return 'Jordan Lee\nSoftware engineer with five years of experience building reliable services and customer focused products.';
  });
  assert.equal(ocrCalled, true);
  assert.equal(result.usedOcr, true);
  assert.match(result.text, /Jordan Lee/);
});

test('unreadable OCR output returns a clear error', async () => {
  await assert.rejects(
    extractPdfResumeText(Buffer.from('pdf'), async () => '', async () => '   '),
    /even after OCR/,
  );
});

test('readability threshold is shared across PDF and DOCX extraction', () => {
  assert.equal(hasReadableResumeText('x'.repeat(50)), true);
  assert.equal(hasReadableResumeText('x'.repeat(49)), false);
});

test('DOCX resumes extract their text with Mammoth', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Jordan Lee</w:t></w:r></w:p><w:p><w:r><w:t>Software engineer with five years of experience building reliable services.</w:t></w:r></w:p></w:body></w:document>');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const text = await extractDocxResumeText(buffer, async input => (await mammoth.extractRawText({ buffer: input })).value);
  assert.match(text, /Jordan Lee/);
  assert.match(text, /reliable services/);
});
