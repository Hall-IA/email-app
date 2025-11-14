/**
 * Service for managing knowledge base integration with RAG system
 */

const RAG_API_URL = 'https://n8n.srv954650.hstgr.cloud/webhook/rag_email_url_pdf';

/**
 * Convert a File to base64 string
 * @param file File to convert
 * @returns Promise with base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data:application/pdf;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

export interface KnowledgeBaseData {
  email: string;
  urls?: string[];
  pdfs?: Array<{ name: string; base64: string }>;
  logo?: { name: string; base64: string };
  id: string; // UUID of email_configurations
}

export interface KnowledgeBaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send knowledge base data to the RAG API
 * @param data Knowledge base data including email, URLs array, and/or PDFs array
 * @returns Promise with the API response
 */
export async function syncKnowledgeBase(data: KnowledgeBaseData): Promise<KnowledgeBaseResponse> {
  try {
    // Prepare JSON payload
    const payload: any = {
      email: data.email,
      id: data.id,
    };
    
    // Add optional URLs array
    if (data.urls && data.urls.length > 0) {
      // Filter out empty URLs and trim them
      const validUrls = data.urls
        .map(url => url.trim())
        .filter(url => url !== '');
      
      if (validUrls.length > 0) {
        payload.urls = validUrls;
      }
    }
    
    // Add optional PDFs array as base64
    if (data.pdfs && data.pdfs.length > 0) {
      payload.pdfs = data.pdfs.map(pdf => ({
        name: pdf.name,
        base64: pdf.base64
      }));
    }
    
    // Add optional logo as base64
    if (data.logo) {
      payload.logo = {
        name: data.logo.name,
        base64: data.logo.base64
      };
    }
    
    const response = await fetch(RAG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    // Try to parse JSON, but handle cases where response is not JSON
    let result: any = {};
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        result = await response.json();
      } catch (jsonError) {
        console.warn('Failed to parse JSON response:', jsonError);
        result = { message: 'Réponse reçue mais non-JSON' };
      }
    } else {
      // If response is not JSON, try to get text
      const text = await response.text();
      result = { message: text || 'Réponse non-JSON reçue' };
    }
    
    if (!response.ok) {
      throw new Error(result.error || result.message || `HTTP error! status: ${response.status}`);
    }
    
    return {
      success: true,
      message: result.message || 'Base de connaissance synchronisée avec succès',
    };
  } catch (error) {
    console.error('Error syncing knowledge base:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation',
    };
  }
}

/**
 * Validate URL format
 * @param url URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.trim() === '') return true; // Empty is valid (optional)
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate PDF file
 * @param file File to validate
 * @returns Object with valid flag and optional error message
 */
export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Le fichier doit être au format PDF' };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'Le fichier ne doit pas dépasser 10 MB' };
  }
  
  return { valid: true };
}

/**
 * Validate image file
 * @param file File to validate
 * @returns Object with valid flag and optional error message
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Le fichier doit être une image (PNG, JPG, etc.)' };
  }
  
  // Check file size (max 2MB)
  const maxSize = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'L\'image ne doit pas dépasser 2 MB' };
  }
  
  return { valid: true };
}
