// This requires pdfjs-dist to be available. We load it via CDN in index.html.
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source to a stable version from a reliable CDN.
// This must match the version specified in the importmap in index.html.
const PDF_JS_VERSION = '4.4.168';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.worker.mjs`;


export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
};