import { Content } from "@google/genai";
import { SessionConfig, EmailMessage, EvaluationResult } from "../types";
import { generateGeminiContent } from "../../../services/aiService";

type SessionState = {
  chatHistory: Content[];
  aiInstance: any;
  currentConfig: SessionConfig | null;
};

let sessionState: SessionState = {
  chatHistory: [],
  aiInstance: null,
  currentConfig: null,
};

const getSystemInstruction = (config: SessionConfig, hasCustomImages: boolean) => {
  const scenarioDescriptions = config.scenarios.map((s, index) => 
    `${index + 1}. [${s.category}] ${s.title}: ${s.description}`
  ).join('\n    ');

  let imageInstruction = "";
  if (hasCustomImages) {
      imageInstruction = "User (Program) sudah melampirkan bukti gambar secara manual. ANDA TIDAK PERLU MEMINTA ATAU MENDESKRIPSIKAN LAMPIRAN GAMBAR BARU. Fokus saja pada cerita keluhannya.";
  } else if (config.enableImageGeneration) {
      imageInstruction = "Buatlah 1 sampai 3 prompt visual (deskripsi gambar) untuk bukti lampiran. Bukti harus bervariasi.";
  } else {
      imageInstruction = "JANGAN membuat prompt gambar visual apapun. Fokus hanya pada teks email.";
  }

  const senderName = config.identity.name;
  const bodyName = config.identity.bodyName || senderName;
  const nameNote = senderName !== bodyName 
    ? `CATATAN: Anda menggunakan akun email atas nama "${senderName}", tetapi nama panggilan/asli Anda di dalam surat adalah "${bodyName}".` 
    : "";

  return `
    Anda adalah Simulator Konsumen untuk pelatihan Agen Email Contact Center OJK 157.
    
    PROFIL PENGIRIM (Akun Email):
    Nama Akun: ${senderName}
    Email: ${config.identity.email}
    
    PROFIL DIRI (Penulis Surat):
    Nama Asli/Panggilan: ${bodyName}
    Kota Domisili: ${config.identity.city}
    ${nameNote}

    PENTING: Gunakan data profil di atas secara KONSISTEN. Jangan mengarang nama/kota/email lain yang berbeda dari profil ini.
    
    KARAKTER:
    Tipe: ${config.consumerType.name}
    Deskripsi: ${config.consumerType.description}
    
    DAFTAR MASALAH YANG DIALAMI:
    ${scenarioDescriptions}

    DETAIL SKRIP/KRONOLOGI (JIKA ADA):
    ${config.scenarios.map(s => s.script ? `[${s.title}]: ${s.script}` : '').filter(Boolean).join('\n')}
    Jadikan skrip/kronologi di atas sebagai ACUAN atau PANDUAN arah pembicaraan, namun TIDAK MUTLAK. Anda tetap harus merespons secara natural dan fleksibel.
    
    ATURAN WAJIB (HARUS DIPATUHI):
    1. PENAMAAN PERUSAHAAN (SANGAT PENTING):
       - Anda DILARANG KERAS hanya menyebut "bank saya", "aplikasi itu", "pihak leasing", atau "perusahaan tersebut".
       - Anda WAJIB mengarang NAMA SPESIFIK untuk perusahaan yang diadukan.
       - Jika skenario terkait BANK, ASURANSI, PASAR MODAL, atau LEASING: Gunakan nama fiktif yang terdengar RESMI, LEGAL, dan BERIZIN OJK.
       - Jika skenario terkait PINJOL ILEGAL: Gunakan nama yang terdengar tidak formal.

    2. GAYA PENULISAN:
       - Buatlah isi email yang SANGAT PANJANG (minimal 300-400 kata), BERTELE-TELE, dan PENUH DETAIL.
       - Ceritakan kronologi dengan sangat rinci. Masukkan curhatan pribadi yang tidak relevan (distraksi) untuk menyembunyikan inti masalah.
       - WAJIB: Pisahkan setiap paragraf dengan dua karakter baris baru (\n\n).

    3. KONTEKS MASALAH:
       - Gabungkan SEMUA skenario masalah di atas menjadi satu cerita utuh.

    4. OUTPUT:
       - Format output HANYA JSON.
       - Struktur JSON:
       { 
         "subject": "Subjek Email", 
         "body": "Isi Email Panjang...",
         "imagePrompts": ["Deskripsi gambar 1"]
       }
  `;
};

const generateAttachment = async (prompt: string, userId?: string, model?: string): Promise<string | undefined> => {
  if (!prompt || !userId) return undefined;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return undefined;

  try {
    const { response } = await generateGeminiContent({
      apiKey,
      model: model || 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      userId,
      usageContext: { module: 'pdkt', action: 'image_generation' }
    });

    // Use candidates if text is not enough for images
    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }
  } catch (error) {
    console.error("Failed to generate attachment:", error);
  }
  return undefined;
};

export const initializeEmailSession = async (config: SessionConfig): Promise<{ email: EmailMessage; usageResult?: any }> => {
  if (config.simulationMode) {
     sessionState = { chatHistory: [], aiInstance: "MOCK", currentConfig: config };
     return {
        email: {
          id: Date.now().toString(),
          from: config.identity.email,
          to: "konsumen@ojk.go.id",
          subject: "Halo OJK, Mode Simulasi!",
          body: `Salam,\nIni adalah email komplain simulasi.\n\nTerima kasih,\n${config.identity.name}`,
          timestamp: new Date(),
          isAgent: false,
        }
     };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");

  sessionState = { chatHistory: [], aiInstance: "ACTIVE", currentConfig: config };

  const customAttachments: string[] = config.scenarios
    .flatMap(s => (s.attachmentImages || []))
    .map(img => img.includes('base64,') ? img.split('base64,')[1] : img)
    .filter(Boolean);

  const hasCustomImages = customAttachments.length > 0;
  const model = config.model || "gemini-3-flash-preview";
  
  const prompt = `Silakan tulis email pengaduan pertama Anda sekarang.`;

  try {
    const { response, usageResult: initUsage } = await generateGeminiContent({
      apiKey,
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: getSystemInstruction(config, hasCustomImages),
      responseMimeType: "application/json",
      userId: config.userId,
      usageContext: { module: 'pdkt', action: 'init_email' }
    });

    const responseText = response.text || "{}";
    const jsonResponse = JSON.parse(responseText.replace(/```json|```/g, ''));
    
    let attachmentBase64s: string[] = hasCustomImages ? customAttachments : [];
    if (!hasCustomImages && config.enableImageGeneration && jsonResponse.imagePrompts) {
        const imagePromises = jsonResponse.imagePrompts.slice(0, 3).map((p: string) => generateAttachment(p, config.userId, model));
        const results = await Promise.all(imagePromises);
        attachmentBase64s = results.filter((img): img is string => img !== undefined);
    }

    return {
      email: {
        id: Date.now().toString(),
        from: config.identity.email,
        to: "konsumen@ojk.go.id",
        subject: jsonResponse.subject || "Keluhan Pelanggan",
        body: jsonResponse.body || "Gagal memuat isi email.",
        timestamp: new Date(),
        isAgent: false,
        attachments: attachmentBase64s
      },
      usageResult: initUsage
    };
  } catch (error) {
    console.error("[PDKT] Error init email:", error);
    throw error;
  }
};

export const evaluateAgentResponse = async (agentReplyBody: string, consumerContext: string, userId: string, modelId: string): Promise<{ result: EvaluationResult; usageResult?: any }> => {
  if (sessionState.aiInstance === "MOCK") {
      return { result: { score: 85, typos: [], clarityIssues: [], contentGaps: [], feedback: "Bagus." } };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");

  const evaluationPrompt = `Nilai jawaban agen (Skor Awal 100) berdasarkan TYPO, CLARITY, RELEVANSI.\n\nKonteks: ${consumerContext}\nJawaban: ${agentReplyBody}`;

  try {
    const { response, usageResult: evalUsage } = await generateGeminiContent({
      apiKey,
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
      responseMimeType: "application/json",
      userId,
      usageContext: { module: 'pdkt', action: 'evaluation' }
    });

    const evalText = response.text || "{}";
    const result = JSON.parse(evalText.replace(/```json|```/g, ''));
    
    return {
      result: {
        score: result.score || 0,
        typos: result.typos || [],
        clarityIssues: result.clarityIssues || [],
        contentGaps: result.contentGaps || [],
        feedback: result.feedback || "Tidak ada masukan."
      },
      usageResult: evalUsage
    };
  } catch (error) {
    console.error("[PDKT] Error evaluating:", error);
    throw error;
  }
};

export const replyToEmail = async (agentReplyBody: string): Promise<EmailMessage> => {
   throw new Error("One-way communication only.");
};
