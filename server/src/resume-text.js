export const MIN_RESUME_TEXT_LENGTH = 50;

export function hasReadableResumeText(text) {
  return typeof text === 'string' && text.trim().length >= MIN_RESUME_TEXT_LENGTH;
}

export async function extractPdfResumeText(buffer, extractPdfText, ocrPdfText) {
  const extracted = await extractPdfText(buffer);
  if (hasReadableResumeText(extracted)) return { text: extracted, usedOcr: false };

  const recognized = await ocrPdfText(buffer);
  if (!hasReadableResumeText(recognized)) {
    throw Object.assign(new Error('We could not find readable text in this PDF, even after OCR. Try a clearer scan or upload a DOCX file.'), { status: 422 });
  }
  return { text: recognized, usedOcr: true };
}

export async function extractDocxResumeText(buffer, extractDocxText) {
  const text = await extractDocxText(buffer);
  return typeof text === 'string' ? text : '';
}
