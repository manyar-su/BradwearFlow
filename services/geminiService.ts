
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractOrderData = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Extract data for Bradwear Indonesia. 
            Rules:
            - Find 'kodeBarang' (top right number).
            - Sizes table: extract size, quantity, gender (Pria/Wanita), and arm length (Panjang/Pendek).
            - Identify 'model' from: Brad V1, Brad V2, PDH, Ventura, Rompi.
            
            Return JSON:
            {
              "namaPenjahit": "string",
              "kodeBarang": "string",
              "tanggalOrder": "YYYY-MM-DD",
              "tanggalTargetSelesai": "YYYY-MM-DD",
              "cs": "string",
              "konsumen": "string",
              "jumlahPesanan": number,
              "sizeDetails": [{"size": "S/M/L", "jumlah": 1, "gender": "Pria/Wanita", "tangan": "Panjang/Pendek"}],
              "model": "Brad V1/V2/etc",
              "warna": "string",
              "sakuType": "Polos/Skotlait/Peterban",
              "sakuColor": "Abu/Hitam/etc",
              "deskripsiPekerjaan": "full text"
            }`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            namaPenjahit: { type: Type.STRING },
            kodeBarang: { type: Type.STRING },
            tanggalOrder: { type: Type.STRING },
            tanggalTargetSelesai: { type: Type.STRING },
            cs: { type: Type.STRING },
            konsumen: { type: Type.STRING },
            jumlahPesanan: { type: Type.NUMBER },
            sizeDetails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  size: { type: Type.STRING },
                  jumlah: { type: Type.NUMBER },
                  gender: { type: Type.STRING },
                  tangan: { type: Type.STRING }
                }
              }
            },
            model: { type: Type.STRING },
            warna: { type: Type.STRING },
            sakuType: { type: Type.STRING },
            sakuColor: { type: Type.STRING },
            deskripsiPekerjaan: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Extraction Error:", error);
    throw error;
  }
};

export const extractSplitData = async (base64Images: string[]) => {
  try {
    const parts = base64Images.map(img => ({
      inlineData: { mimeType: 'image/jpeg', data: img }
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...parts,
          { text: "Extract metadata (kodeBarang, model, tangan) and aggregate size counts. Return JSON object." }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kodeBarang: { type: Type.STRING },
            model: { type: Type.STRING },
            tangan: { type: Type.STRING },
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
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Split Extraction Error:", error);
    throw error;
  }
};
