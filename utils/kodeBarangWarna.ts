/**
 * Utility functions for handling Kode Barang and Kode Warna
 * 
 * Rules:
 * - Kode Barang: Only 4 digits (pure numbers) or "TDP"
 * - Kode Warna: Letter + Number combination (e.g., B011, B0299, V123)
 * - Kode Warna must be combined with color name (e.g., "HITAM B011")
 */

/**
 * Check if a code is a valid Kode Barang
 * Valid: 4 digits only or "TDP"
 */
export function isValidKodeBarang(code: string): boolean {
  if (!code) return false;
  
  const normalized = code.trim().toUpperCase();
  
  // Special case: TDP or TDP-prefixed code
  if (/^TDP\d*$/.test(normalized)) return true;
  
  // Must be exactly 4 digits
  return /^\d{4}$/.test(normalized);
}

/**
 * Check if a code is a Kode Warna (not Kode Barang)
 * Format: Letter(s) + Number(s) (e.g., B011, B0299, V123)
 */
export function isKodeWarna(code: string): boolean {
  if (!code) return false;
  
  // Format: one or more letters followed by one or more digits
  return /^[A-Z]+\d+$/i.test(code);
}

/**
 * Parse warna text and combine with kode warna if present
 * 
 * Examples:
 * - "TROPICAL NAVY Kode B011" → "TROPICAL NAVY B011"
 * - "HITAM B0299" → "HITAM B0299"
 * - "VENTURA V123" → "VENTURA V123"
 * - "PUTIH" → "PUTIH"
 */
export function parseWarnaWithCode(text: string): string {
  if (!text) return '';
  
  // Remove extra whitespace
  text = text.trim();
  
  // Pattern 1: "NAMA WARNA Kode KODE" (with "Kode" keyword)
  const matchWithKeyword = text.match(/(.+?)\s+(?:Kode|kode|KODE)\s+([A-Z]+\d+)/i);
  if (matchWithKeyword) {
    const namaWarna = matchWithKeyword[1].trim();
    const kodeWarna = matchWithKeyword[2].trim().toUpperCase();
    return `${namaWarna} ${kodeWarna}`;
  }
  
  // Pattern 2: "NAMA WARNA KODE" (without "Kode" keyword, kode at the end)
  const matchWithoutKeyword = text.match(/(.+?)\s+([A-Z]+\d+)$/i);
  if (matchWithoutKeyword) {
    const namaWarna = matchWithoutKeyword[1].trim();
    const kodeWarna = matchWithoutKeyword[2].trim().toUpperCase();
    
    // Make sure the last part is actually a kode warna
    if (isKodeWarna(kodeWarna)) {
      return `${namaWarna} ${kodeWarna}`;
    }
  }
  
  // No kode found, return as is
  return text;
}

/**
 * Extract kode warna from text if present
 * Returns null if no kode warna found
 */
export function extractKodeWarna(text: string): string | null {
  if (!text) return null;
  
  // Try to find kode warna pattern
  const match = text.match(/([A-Z]+\d+)$/i);
  if (match && isKodeWarna(match[1])) {
    return match[1].toUpperCase();
  }
  
  return null;
}

/**
 * Extract nama warna (without kode) from text
 */
export function extractNamaWarna(text: string): string {
  if (!text) return '';
  
  const parsed = parseWarnaWithCode(text);
  
  // Remove kode warna from the end
  const match = parsed.match(/(.+?)\s+[A-Z]+\d+$/i);
  if (match) {
    return match[1].trim();
  }
  
  return parsed;
}

/**
 * Validate and format kode barang input
 * Returns formatted kode or null if invalid
 */
export function validateAndFormatKodeBarang(input: string): string | null {
  if (!input) return null;
  
  const trimmed = input.trim().toUpperCase();
  
  if (isValidKodeBarang(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Generate item description with proper formatting
 * Format: [JENIS] [WARNA] [TANGAN] [GENDER]
 */
export function generateItemDescription(params: {
  jenisBarang?: string;
  warna?: string;
  tangan?: string;
  gender?: string;
  modelCelana?: string;
  modelRompi?: string;
}): string {
  const parts: string[] = [];
  
  // Jenis Barang
  if (params.jenisBarang) {
    parts.push(params.jenisBarang);
  }
  
  // Warna (already combined with kode if applicable)
  if (params.warna) {
    parts.push(params.warna);
  }
  
  // Model (for CELANA/ROMPI)
  if (params.modelCelana) {
    parts.push(params.modelCelana);
  }
  if (params.modelRompi) {
    parts.push(params.modelRompi);
  }
  
  // Tangan (for KEMEJA)
  if (params.tangan) {
    parts.push(params.tangan);
  }
  
  // Gender
  if (params.gender) {
    parts.push(params.gender === 'Pria' ? 'LAKI-LAKI' : 'PEREMPUAN');
  }
  
  return parts.join(' ');
}
