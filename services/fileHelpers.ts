
import { FileData } from '../types';

declare global {
  interface Window {
    mammoth: any;
    XLSX: any;
    JSZip: any;
    pdfjsLib: any;
  }
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the Data URI prefix (e.g. "data:image/png;base64,") to get raw base64
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to process file'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const validateFileType = (file: File): boolean => {
  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'text/html',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    // Office formats
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
  ];
  
  // Check mime type or file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['md', 'json', 'csv', 'docx', 'xlsx', 'pptx'];
  
  return validTypes.includes(file.type) || (ext ? validExtensions.includes(ext) : false);
};

export const isOfficeFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['docx', 'xlsx', 'pptx'].includes(ext || '');
};

export const getFileMimeType = (file: File): string => {
  if (file.type && file.type !== '') return file.type;
  
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md': return 'text/markdown';
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'txt': return 'text/plain';
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    case 'html': return 'text/html';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default: return 'text/plain'; // Fallback
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Extracts raw text from Office documents (DOCX, XLSX, PPTX) client-side.
 */
export const extractTextFromOfficeFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'docx') {
        if (!window.mammoth) throw new Error("Word parser not loaded");
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value || "No text found in Word document.";
    }

    if (ext === 'xlsx') {
        if (!window.XLSX) throw new Error("Excel parser not loaded");
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        let text = "";
        workbook.SheetNames.forEach((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            text += `--- Sheet: ${sheetName} ---\n`;
            text += window.XLSX.utils.sheet_to_csv(worksheet) + "\n\n";
        });
        return text || "No text found in Excel spreadsheet.";
    }

    if (ext === 'pptx') {
        if (!window.JSZip) throw new Error("PowerPoint parser not loaded");
        const zip = await window.JSZip.loadAsync(arrayBuffer);
        let text = "";
        
        // Naive extraction: Find all slide XMLs and strip tags
        // PPTX slides are usually stored as ppt/slides/slide1.xml, slide2.xml etc.
        const slideFiles = Object.keys(zip.files).filter(fileName => 
            fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")
        );

        // Sort naturally (slide1, slide2, slide10...)
        slideFiles.sort((a, b) => {
             const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0");
             const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0");
             return numA - numB;
        });

        for (const fileName of slideFiles) {
            const content = await zip.files[fileName].async("string");
            // Strip XML tags to get text content
            const slideText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (slideText) {
                text += `--- Slide ${fileName.replace('ppt/slides/', '').replace('.xml', '')} ---\n${slideText}\n\n`;
            }
        }
        return text || "No text found in Presentation.";
    }

    throw new Error("Unsupported office file format");
};

/**
 * Extracts text from PDF files client-side using PDF.js
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) throw new Error("PDF parser not loaded");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    
    // Limit to 300 pages to handle larger books/documents better
    const maxPages = Math.min(pdf.numPages, 300);

    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        text += `--- Page ${i} ---\n${strings.join(" ")}\n\n`;
    }
    return text;
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]); 
        } else {
            reject(new Error("Failed to convert blob to base64"));
        }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
