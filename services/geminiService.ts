
import { GoogleGenAI, Type } from "@google/genai";

const OPENROUTER_KEY = (import.meta as any).env.VITE_OPENROUTER_KEY || '';
const DEFAULT_GEMINI_KEY = '';

const PROMPT_OCR = `Extract exact text data from this order slip image. 
Act as a high-precision OCR engine with ADVANCED SIZE AND QUANTITY DETECTION.

TAILOR NAMES LIST: ["Maris", "Ferry", "Aan", "Farid", "Opik", "Fadil", "Asep", "Abdul", "Hadi", "Epul"]

CRITICAL: MULTIPLE SIZES DETECTION
When you see a list of items with SAME kode barang but DIFFERENT sizes/quantities:

Example Pattern 1 (Standard Sizes):
"S = 2
 M = 3
 L = 1
 XL = 2"

This means:
- Create ONE sizeDetail with sizes array
- Each line = one entry in sizes array
- Extract size letter (S, M, L, XL) and quantity number

Example Pattern 2 (Numeric Sizes for Celana):
"28 = 1
 30 = 2
 32 = 1
 34 = 1"

This means:
- Create ONE sizeDetail with sizes array
- Each line = one entry in sizes array
- Extract size number (28, 30, 32, 34) and quantity

Example Pattern 3 (Custom Sizes with Names):
"Akub = Tinggi 72, LD 54, Lebar bahu 47..."
"Iskandar T. = Tinggi 84, LD 132, Lebar bahu 54..."

This means:
- Create ONE sizeDetail with sizes array
- Each person = one entry with namaPerSize and customMeasurements
- Set isCustomSize = true, size = "CUSTOM"

DETECTION PATTERNS:
- Look for "=" sign followed by number (indicates size = quantity)
- Look for vertical list of sizes
- Look for "SIZE" column with "JUMLAH" or "QTY" column
- Look for repeated pattern: [size] [quantity]

SIZE EXTRACTION RULES:
- Standard: S, M, L, XL, XXL, XXXL
- Numeric: 28, 30, 32, 34, 36, 38, 40 (for celana)
- Custom: If followed by measurements, set size = "CUSTOM"

QUANTITY EXTRACTION RULES:
- Look for numbers after "=" sign
- Look for numbers in "JUMLAH" or "QTY" column
- Look for pattern: "size = number"
- Default to 1 if not specified

GROUPING RULES:
- Same kode barang + same warna + same tangan = ONE item with sizes array
- Different warna = separate items
- Different tangan = separate items

MAPPING RULES:
- CRITICAL: 'kodeBarang' MUST be exactly 4 digits (e.g. 1234) OR contain the prefix "TDP" (e.g. TDP4567).
- LOCATION: The kode barang is ALWAYS located at the TOP-RIGHT CORNER of the document. It is typically printed in a LARGE, BOLD font inside a CIRCLE, BOX, or BORDER — visually prominent and isolated from other text.
- PRIORITY: Look FIRST at the TOP-RIGHT CORNER of the image for a large standalone 4-digit number inside a circle or box. This is the kode barang.
- IGNORE: Do NOT pick up dates (e.g. 16/2026, 14 Januari 2026), phone numbers, quantities (e.g. 41 PCS), or any number that is part of a sentence or table. If a 4-digit number appears anywhere OTHER than the top-right corner, IGNORE it.
- STRICT RULE: If the number found in the top-right corner is NOT exactly 4 digits (e.g. it is 3 digits like "124", or 5+ digits), set 'kodeBarang' to an EMPTY STRING "".
- If no valid 4-digit code or TDP code is clearly found in the top-right corner, set 'kodeBarang' to an empty string "".
- WARNING: 'kodeBarang' is a high-priority identifier. Do NOT confuse it with color names, dates, or quantities.
- Extract 'tanggalOrder' and 'tanggalTargetSelesai'.
- Find Admin/CS name for 'cs'.
- Find Client/Customer name for 'konsumen'.
- Sum all item counts for 'jumlahPesanan'.

- JENIS BARANG DETECTION (CRITICAL):
  * Look for keywords: "CELANA", "PANTS", "TROUSER" → Set jenisBarang to "Celana"
  * Look for keywords: "ROMPI", "VEST" → Set jenisBarang to "Rompi"
  * Look for keywords: "KEMEJA", "SHIRT", "BRAD" → Set jenisBarang to "Kemeja"
  * If "Deskripsi Pekerjaan" or main text contains "Celana", automatically set jenisBarang to "Celana"

- CELANA SPECIFIC DETECTION:
  * If jenisBarang is "Celana", look for:
    - Model: "WARRIOR", "ARMOR" → Set modelCelana
    - Bahan: "AMERICAN DRILL", "JAPAN DRILL", "RIPSTOP", "CANVAS" → Set bahanCelana
    - Size: Look for numeric sizes like "28", "30", "32", "34", etc. (NOT S/M/L)
    - Format: "28 = 1" means size 28, quantity 1
    - Kode in description: "kode 192" or similar → extract as additional info

- ROMPI SPECIFIC DETECTION:
  * If jenisBarang is "Rompi", look for:
    - Jenis Saku: "DALAM", "LUAR", "KOMBINASI" → Set jenisSakuRompi
    - DO NOT extract "tangan" field (rompi has no sleeves)

- RINCIAN ITEM (sizeDetails):
  * CRITICAL GROUPING RULES:
    1. Group by WARNA (color) FIRST - different colors = different items
    2. Within same color, group by TANGAN (sleeve type) if applicable
    3. Within same color+tangan, multiple sizes = use 'sizes' array
  
  * OUTPUT STRUCTURE EXAMPLES:
  
  Example 1 - Multiple Standard Sizes:
  Input: "S = 2, M = 3, L = 1"
  Output:
  {
    warna: "PUTIH",
    tangan: "Panjang",
    sizes: [
      { size: "S", jumlah: 2 },
      { size: "M", jumlah: 3 },
      { size: "L", jumlah: 1 }
    ]
  }

  Example 1b - Tabel Laki-laki dan Perempuan:
  Input:
  "LAKI-LAKI (P)    PEREMPUAN (W)
   S = 2            S = 1
   M = 3            M = 2"
  Output: TWO separate sizeDetails:
  { gender: "Pria", tangan: "Panjang", sizes: [{ size: "S", jumlah: 2 }, { size: "M", jumlah: 3 }] }
  { gender: "Wanita", tangan: "Panjang", sizes: [{ size: "S", jumlah: 1 }, { size: "M", jumlah: 2 }] }

  Example 1c - Size dengan nama PJ di samping:
  Input:
  "Fadil: S=2, M=3
   Ferry: L=1, XL=2"
  Output: TWO separate sizeDetails:
  { gender: "Pria", tangan: "Panjang", sizes: [{ size: "S", jumlah: 2, namaPerSize: "Fadil" }, { size: "M", jumlah: 3, namaPerSize: "Fadil" }] }
  { gender: "Pria", tangan: "Panjang", sizes: [{ size: "L", jumlah: 1, namaPerSize: "Ferry" }, { size: "XL", jumlah: 2, namaPerSize: "Ferry" }] }
  
  Example 2 - Multiple Numeric Sizes (Celana):
  Input: "28 = 1, 30 = 2, 32 = 1"
  Output:
  {
    warna: "HITAM",
    modelCelana: "Warrior",
    sizes: [
      { size: "28", jumlah: 1 },
      { size: "30", jumlah: 2 },
      { size: "32", jumlah: 1 }
    ]
  }
  
  Example 3 - Custom Sizes with Names:
  Input: 
  "Akub = Tinggi 72, LD 54, Lebar bahu 47
   Iskandar = Tinggi 84, LD 132, Lebar bahu 54"
  Output:
  {
    warna: "TROPICAL NAVY",
    tangan: "Panjang",
    sizes: [
      {
        size: "CUSTOM",
        jumlah: 1,
        namaPerSize: "Akub",
        isCustomSize: true,
        customMeasurements: { tinggi: 72, lebarDada: 54, lebarBahu: 47 }
      },
      {
        size: "CUSTOM",
        jumlah: 1,
        namaPerSize: "Iskandar",
        isCustomSize: true,
        customMeasurements: { tinggi: 84, lebarDada: 132, lebarBahu: 54 }
      }
    ]
  }
  
  * IMPORTANT: Always use 'sizes' array when there are multiple sizes in same item
  * Each size entry MUST have: size (string) and jumlah (number)
  * For custom sizes, add: namaPerSize, isCustomSize, customMeasurements
     
     LENGAN PENDEK
     Iskandar T. = Tinggi 84, ukuran lebar dada dari baju 132, Lebar bahu 54, Ling 142, Ling pinggul 142, Panjang lengan 26
     DWI = Tinggi 79, LD 127, Lebar bahu 50, Ling perut 129, Ling pinggul 133, Panjang lengan 59
     
     TROPICAL HITAM
     LENGAN PENDEK
     Iskandar T. = Tinggi 84, ukuran lebar dada dari baju 132, Lebar bahu 54, Ling 142, Ling pinggul 142, Panjang lengan 26
     BIL = ..."
    
    OUTPUT STRUCTURE:
    [
      {
        warna: "TROPICAL NAVY",
        tangan: "Panjang",
        model: "Ventura",
        sizes: [
          {
            size: "CUSTOM",
            jumlah: 1,
            namaPerSize: "Akub",
            isCustomSize: true,
            customMeasurements: {
              tinggi: 72,
              lebarDada: 54,
              lebarBahu: 47,
              lingPerut: 101,
              lingPinggul: 105,
              lenganPanjang: 60
            }
          },
          {
            size: "CUSTOM",
            jumlah: 1,
            namaPerSize: "Iskandar T.",
            isCustomSize: true,
            customMeasurements: {
              tinggi: 84,
              lebarDada: 132,
              lebarBahu: 54,
              lingPerut: 142,
              lingPinggul: 142,
              lenganPanjang: 26
            }
          }
        ]
      },
      {
        warna: "TROPICAL NAVY",
        tangan: "Pendek",
        model: "Ventura",
        sizes: [
          {
            size: "CUSTOM",
            jumlah: 1,
            namaPerSize: "Iskandar T.",
            isCustomSize: true,
            customMeasurements: {...}
          },
          {
            size: "CUSTOM",
            jumlah: 1,
            namaPerSize: "DWI",
            isCustomSize: true,
            customMeasurements: {...}
          }
        ]
      },
      {
        warna: "TROPICAL HITAM",
        tangan: "Pendek",
        model: "Ventura",
        sizes: [
          {
            size: "CUSTOM",
            jumlah: 1,
            namaPerSize: "Iskandar T.",
            isCustomSize: true,
            customMeasurements: {...}
          },
          {
            size: "CUSTOM",
            jumlah: 1,
            namaPerSize: "BIL",
            isCustomSize: true,
            customMeasurements: {...}
          }
        ]
      }
    ]
  
  * FIELD MAPPING:
    - size: Always "CUSTOM" when custom measurements detected
    - jumlah: Always 1 for custom sizes (one piece per person)
    - namaPerSize: Name before "=" sign (e.g., "Akub", "Iskandar T.", "DWI", "BIL")
    - isCustomSize: Always true when measurements detected
    - customMeasurements: Object with all detected measurements
    - gender: Default to 'Pria' unless specified
    - tangan: Extract from section header (LENGAN PANJANG = Panjang, LENGAN PENDEK = Pendek)
    - warna: Extract from section header (TROPICAL NAVY, TROPICAL HITAM, etc.)
    - model: Extract from description (VENTURA, BRAD V2, etc.)
  
- Global Fields (Identify from main header/text):
  * Identify 'model', 'warna', 'sakuType', 'sakuColor', 'bahanKemeja'.
  * MODELS LIST: ["Brad V1", "Brad V2", "Brad V3", "Yoroi", "PDH", "PDH Baru", "Ventura", "Rompi", "Celana"]
  * SAKU TYPES: ["Skotlait", "Peterban", "Polos"]
  * SAKU COLORS: ["Abu", "Hitam", "Cream", "Oren"]
  * BAHAN KEMEJA: ["Maryland", "American Drill", "Japan Drill", "Oxford", "Katun", "Polyester", "Tropical"]
  
- BAHAN KEMEJA DETECTION:
  * Look for fabric/material keywords in description or header
  * Common patterns: "MARYLAND", "DRILL", "OXFORD", "KATUN", "TROPICAL"
  * If found, set 'bahanKemeja' field
  * Examples: "Maryland Putih" → bahanKemeja: "Maryland", warna: "Putih"
  * Examples: "Drill Hitam" → bahanKemeja: "American Drill", warna: "Hitam"
  
- MULTI-COLOR/MULTI-MODEL DETECTION:
  * If the slip contains items with different colors or models (e.g. some are Red, some are Blue), you MUST capture this in the 'sizeDetails' for each entry.
  * If a color is detected but not explicitly tied to a row, use the 'warna' field as default.

- Put all extra handwritten notes into 'deskripsiPekerjaan'.

KUALITAS DETEKSI:
- GENDER DETECTION (CRITICAL):
  * "P", "Pria", "Laki", "Laki-laki", "L" → gender: "Pria"
  * "W", "Wanita", "Perempuan", "Cewek" → gender: "Wanita"
  * Jika ada tabel dengan kolom LAKI-LAKI dan PEREMPUAN → buat 2 sizeDetail terpisah dengan gender berbeda
  * Default: "Pria" jika tidak ada keterangan
- NAMA PENJAHIT PER SIZE (CRITICAL):
  * Jika di samping size ada nama penjahit (dari TAILOR NAMES LIST), masukkan ke namaPerSize
  * Contoh: "M - Fadil = 3" → size: "M", jumlah: 3, namaPerSize: "Fadil"
  * Contoh: "Fadil: S=2, M=3" → 2 entries dengan namaPerSize: "Fadil"
  * Jika nama bukan dari TAILOR NAMES LIST dan ada ukuran tubuh → itu nama konsumen (namaPerSize untuk custom)
- Jika gender tidak tertulis eksplisit, cari simbol (P/W) atau konteks model.
- Jika lengan tidak tertulis, asumsikan 'Pendek' kecuali ada tanda 'Pjg' atau 'Panjang'.
- Aturan Kode Barang: Harus TEPAT 4 Digit murni atau TDP. Abaikan format seperti 16/2026, tanggal, jumlah PCS, atau angka dalam kalimat.
- PRIORITAS TINGGI: Cari di POJOK KANAN ATAS dokumen — biasanya angka besar dalam lingkaran atau kotak. Jika angka di pojok kanan atas bukan tepat 4 digit, set kodeBarang ke string kosong "".
- Untuk CELANA: Size harus angka (28-40), bukan huruf (S/M/L).
- Untuk KEMEJA: Deteksi jenis bahan (Maryland, Drill, Oxford, dll) dari deskripsi.

Return ONLY a valid JSON object matching the schema.`;

const callOpenRouter = async (base64Image: string) => {
  const userApiKey = localStorage.getItem('bradwear_gemini_key');
  const activeKey = (userApiKey?.startsWith('sk-') ? userApiKey : null) || OPENROUTER_KEY;
  if (!activeKey) throw new Error("API key tidak tersedia.");
  try {
    const response = await fetch("https://ai.sumopod.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "model": "gemini/gemini-2.0-flash",
        "messages": [
          {
            "role": "user",
            "content": [
              { "type": "text", "text": PROMPT_OCR },
              {
                "type": "image_url",
                "image_url": { "url": `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        "response_format": { "type": "json_object" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouter return empty content");
    
    return JSON.parse(content);
  } catch (e) {
    console.error("OpenRouter Error:", e);
    throw e;
  }
};

export const extractOrderData = async (base64Image: string) => {
  // Selalu pakai OpenRouter
  return callOpenRouter(base64Image).then(processResult);
};

const processResult = (result: any) => {
    // AUTO-DETECT jenisBarang dari deskripsi jika belum terdeteksi
    if (!result.jenisBarang && result.deskripsiPekerjaan) {
      const desc = result.deskripsiPekerjaan.toLowerCase();
      if (desc.includes('celana') || desc.includes('pants') || desc.includes('trouser')) {
        result.jenisBarang = 'Celana';
      } else if (desc.includes('rompi') || desc.includes('vest')) {
        result.jenisBarang = 'Rompi';
      } else if (desc.includes('kemeja') || desc.includes('shirt') || desc.includes('brad')) {
        result.jenisBarang = 'Kemeja';
      }
    }

    // NORMALIZE CUSTOM MEASUREMENTS - Map alias fields to main fields
    const normalizeCustomMeasurements = (measurements: any) => {
      if (!measurements) return measurements;
      
      // Map panjangLengan to lenganPanjang if lenganPanjang is empty
      if (measurements.panjangLengan && !measurements.lenganPanjang) {
        measurements.lenganPanjang = measurements.panjangLengan;
      }
      
      // Map lingkaranPerut to lingPerut if lingPerut is empty
      if (measurements.lingkaranPerut && !measurements.lingPerut) {
        measurements.lingPerut = measurements.lingkaranPerut;
      }
      
      return measurements;
    };

    // FALLBACK: If sizeDetails is empty but there's a description
    if ((!result.sizeDetails || result.sizeDetails.length === 0) && result.deskripsiPekerjaan) {
      const desc = result.deskripsiPekerjaan.toLowerCase();
      if (desc.includes('tinggi') || desc.includes('ld') || desc.includes('bahu') || (result.jumlahPesanan && result.jumlahPesanan > 0)) {
        result.sizeDetails = [{
          size: 'CUSTOM',
          jumlah: result.jumlahPesanan || 1,
          gender: 'Pria',
          tangan: result.jenisBarang === 'Celana' || result.jenisBarang === 'Rompi' ? undefined : 'Panjang',
          isCustomSize: true
        }];
        result.isCustomFormat = true;
      }
    }

    // NORMALIZE GENDER & POPULATE FIELDS
    if (result.sizeDetails && Array.isArray(result.sizeDetails)) {
      result.sizeDetails = result.sizeDetails.map((item: any) => {
        let gender = item.gender || 'Pria';
        const gLower = gender.toLowerCase().trim();
        // P = Pria (Laki-laki), W = Wanita (Perempuan)
        if (gLower === 'w' || gLower.includes('wanita') || gLower.includes('perempuan') || gLower === 'cewek') {
          gender = 'Wanita';
        } else {
          gender = 'Pria';
        }

        // Normalize custom measurements for main item
        if (item.customMeasurements) {
          item.customMeasurements = normalizeCustomMeasurements(item.customMeasurements);
        }

        // Normalize custom measurements in sizes array
        if (item.sizes && Array.isArray(item.sizes)) {
          item.sizes = item.sizes.map((sizeItem: any) => {
            if (sizeItem.customMeasurements) {
              sizeItem.customMeasurements = normalizeCustomMeasurements(sizeItem.customMeasurements);
            }
            return sizeItem;
          });
        }

        // Untuk Celana dan Rompi, hapus field tangan
        const processedItem: any = {
          ...item,
          gender,
          warna: item.warna || result.warna || '',
        };

        // Hanya tambahkan field yang relevan berdasarkan jenis barang
        if (result.jenisBarang === 'Celana') {
          processedItem.modelCelana = item.modelCelana || 'Warrior';
          processedItem.bahanCelana = item.bahanCelana || 'American Drill';
          // Hapus field yang tidak relevan untuk celana
          delete processedItem.model;
          delete processedItem.sakuType;
          delete processedItem.sakuColor;
          delete processedItem.tangan;
        } else if (result.jenisBarang === 'Rompi') {
          processedItem.jenisSakuRompi = item.jenisSakuRompi || 'Dalam';
          // Hapus field yang tidak relevan untuk rompi
          delete processedItem.model;
          delete processedItem.sakuType;
          delete processedItem.sakuColor;
          delete processedItem.tangan;
        } else {
          // Kemeja atau default
          processedItem.model = item.model || result.model || 'Brad V2';
          processedItem.sakuType = item.sakuType || result.sakuType || 'Polos';
          processedItem.sakuColor = item.sakuColor || result.sakuColor || 'Abu';
          processedItem.tangan = item.tangan || 'Pendek';
        }

        return processedItem;
      });
    }

    // EXTRACT additional info dari deskripsi untuk celana
    if (result.jenisBarang === 'Celana' && result.deskripsiPekerjaan) {
      const desc = result.deskripsiPekerjaan;
      
      // Extract model celana dari deskripsi
      if (!result.sizeDetails?.[0]?.modelCelana) {
        if (desc.toLowerCase().includes('armor')) {
          result.sizeDetails = result.sizeDetails?.map((item: any) => ({
            ...item,
            modelCelana: 'Armor'
          }));
        } else if (desc.toLowerCase().includes('warrior')) {
          result.sizeDetails = result.sizeDetails?.map((item: any) => ({
            ...item,
            modelCelana: 'Warrior'
          }));
        }
      }

      // Extract bahan dari deskripsi
      if (!result.sizeDetails?.[0]?.bahanCelana) {
        const descLower = desc.toLowerCase();
        let bahan = 'American Drill'; // default
        
        if (descLower.includes('american drill')) bahan = 'American Drill';
        else if (descLower.includes('japan drill')) bahan = 'Japan Drill';
        else if (descLower.includes('ripstop')) bahan = 'Ripstop';
        else if (descLower.includes('canvas')) bahan = 'Canvas';

        result.sizeDetails = result.sizeDetails?.map((item: any) => ({
          ...item,
          bahanCelana: item.bahanCelana || bahan
        }));
      }
    }

    return result;
};

export const extractSplitData = async (base64Images: string[]) => {
  const userApiKey = localStorage.getItem('bradwear_gemini_key');
  const envApiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey: userApiKey || envApiKey || DEFAULT_GEMINI_KEY });

  try {
    const parts = base64Images.map(img => ({
      inlineData: { mimeType: 'image/jpeg', data: img }
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          ...parts,
          { text: "OCR all provided images. Extract product codes (MUST be 4 digits or contain TDP), models, and size counts per item. Ignore dates or non-code numbers. Return JSON with an 'orders' array." }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            orders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kodeBarang: { type: Type.STRING },
                  model: { type: Type.STRING },
                  sizeCounts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        size: { type: Type.STRING },
                        jumlah: { type: Type.NUMBER }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Split Extraction Error:", error);
    throw error;
  }
};
