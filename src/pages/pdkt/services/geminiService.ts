import { GoogleGenAI, Content } from "@google/genai";
import { SessionConfig, EmailMessage, EvaluationResult } from "../types";

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

  // Handle potential difference between sender name and body name
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
       - Jika skenario terkait BANK, ASURANSI, PASAR MODAL, atau LEASING (Gagal Login, Transaksi Tidak Dikenal, SLIK): Gunakan nama fiktif yang terdengar RESMI, LEGAL, dan BERIZIN OJK.
         Contoh Nama yang Diharapkan: "Bank Nusantara Sentosa", "PT Asuransi Keluarga Harmoni", "Sekuritas Investasi Jaya", "Mega Finance Indonesia".
       - Jika skenario terkait PINJOL ILEGAL (Teror Penagihan): Gunakan nama yang terdengar tidak formal.
         Contoh: "Dompet Kilat", "Dana Cepat Cair", "Pinjam Dulu".

    2. GAYA PENULISAN:
       - Buatlah isi email yang SANGAT PANJANG (minimal 300-400 kata), BERTELE-TELE, dan PENUH DETAIL.
       - Ceritakan kronologi dengan sangat rinci. Masukkan curhatan pribadi yang tidak relevan (distraksi) tentang pekerjaan, keluarga, atau perasaan Anda untuk menyembunyikan inti masalah.
       - Tujuannya adalah melatih agen untuk "mencari jarum di tumpukan jerami".
       - Gunakan paragraf narasi yang panjang. Jangan gunakan bullet points.
       - WAJIB: Pisahkan setiap paragraf dengan dua karakter baris baru (\n\n) agar teks mudah dibaca. Setiap pergantian topik atau alur cerita HARUS dimulai sebagai paragraf baru.

    3. KONTEKS MASALAH:
       - Gabungkan SEMUA skenario masalah di atas menjadi satu cerita utuh.
       - Jangan memberikan solusi sendiri. Anda di sini untuk mengeluh.

    4. OUTPUT:
       - Format output HANYA JSON.
       - ${imageInstruction}
       - Struktur JSON:
       { 
         "subject": "Subjek Email (Buat yang menarik/emosional sesuai karakter)", 
         "body": "Isi Email Panjang...",
         "imagePrompts": ["Deskripsi gambar 1"]
       }
  `;
};

// Function to generate the attachment image
const generateAttachment = async (prompt: string): Promise<string | undefined> => {
  if (!prompt) return undefined;
  
  try {
    const response = await sessionState.aiInstance.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
  } catch (error) {
    console.error("Failed to generate attachment:", error);
    return undefined; // Fail gracefully, send email without image
  }
  return undefined;
};

export const initializeEmailSession = async (config: SessionConfig): Promise<EmailMessage> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing in environment");

  sessionState = {
    chatHistory: [],
    aiInstance: new GoogleGenAI({ apiKey }),
    currentConfig: config,
  };

  // Check for custom attachments in the selected scenarios
  // Flatten multiple arrays of images from selected scenarios
  const customAttachments: string[] = config.scenarios
    .flatMap(s => {
        // Handle new array (attachmentImages) AND legacy single (attachmentImage)
        let images: string[] = [];
        if (s.attachmentImages && Array.isArray(s.attachmentImages)) {
            images = s.attachmentImages;
        } else if ((s as any).attachmentImage) {
            images = [(s as any).attachmentImage];
        }
        return images;
    })
    .map(img => {
        // Strip prefix if exists (e.g., "data:image/jpeg;base64,")
        const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            return matches[2];
        }
        return img;
    })
    .filter((img): img is string => !!img);

  const hasCustomImages = customAttachments.length > 0;

  // Generate First Email (Complaint)
  const model = config.model || "gemini-3-flash-preview"; // Use selected model or fallback
  
  const prompt = `
    Silakan tulis email pengaduan pertama Anda sekarang.
    
    INGAT INSTRUKSI KRUSIAL:
    Sebutkan NAMA LJK (Bank/Leasing/Aplikasi) SECARA SPESIFIK dan JELAS.
    Jangan gunakan nama umum. Karanglah nama perusahaan (misal: "Bank Merdeka Abadi" atau "Aplikasi Investasi Cerdas") agar terlihat seperti perusahaan berizin OJK.
    
    Masalah yang dialami:
    ${config.scenarios.map(s => `- ${s.title} (${s.description})`).join('\n')}
    
    Karakter Konsumen: ${config.consumerType.name}.
    ${hasCustomImages ? 'Gambar bukti sudah dilampirkan oleh sistem, abaikan pembuatan imagePrompts.' : (config.enableImageGeneration ? 'Berikan array "imagePrompts" berisi 1-3 deskripsi gambar bukti yang berbeda.' : 'JANGAN buat imagePrompts.')}
  `;

  try {
    console.log("[PDKT] Generating first email with prompt:", prompt);
    const response = await sessionState.aiInstance.models.generateContent({
      model: model,
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: getSystemInstruction(config, hasCustomImages),
        responseMimeType: "application/json"
      }
    });

    let responseText = response.text || "{}";
    console.log("[PDKT] Raw AI Response:", responseText);
    
    responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const jsonResponse = JSON.parse(responseText);
    
    if (typeof jsonResponse !== 'object' || jsonResponse === null) {
      throw new Error("[PDKT] Invalid JSON structure from AI: not an object");
    }
    if (typeof jsonResponse.subject !== 'string' || typeof jsonResponse.body !== 'string') {
      console.warn("[PDKT] AI response missing expected fields, using fallback.");
    }
    
    // Save to history
    sessionState.chatHistory.push({ role: 'user', parts: [{ text: prompt }] });
    sessionState.chatHistory.push({ role: 'model', parts: [{ text: response.text }] });

    // Generate Attachments (Multiple)
    let attachmentBase64s: string[] = [];

    if (hasCustomImages) {
        // Use custom images uploaded in settings
        attachmentBase64s = customAttachments;
    } else if (config.enableImageGeneration) {
        // AI Generation Logic (Only if enabled)
        if (jsonResponse.imagePrompts && Array.isArray(jsonResponse.imagePrompts) && jsonResponse.imagePrompts.length > 0) {
          console.log("[PDKT] Generating images from prompts:", jsonResponse.imagePrompts);
          // Generate images in parallel
          const imagePromises = jsonResponse.imagePrompts.slice(0, 3).map((p: string) => generateAttachment(p));
          const results = await Promise.all(imagePromises);
          attachmentBase64s = results.filter((img): img is string => img !== undefined);
        } 
        // Fallback for single imagePrompt (legacy compatibility)
        else if (jsonResponse.imagePrompt) {
            console.log("[PDKT] Generating single image from prompt:", jsonResponse.imagePrompt);
            const img = await generateAttachment(jsonResponse.imagePrompt);
            if (img) attachmentBase64s.push(img);
        }
    }

    return {
      id: Date.now().toString(),
      from: config.identity.email,
      to: "konsumen@ojk.go.id",
      subject: jsonResponse.subject || "Keluhan Pelanggan",
      body: jsonResponse.body || "Gagal memuat isi email.",
      timestamp: new Date(),
      isAgent: false,
      attachments: attachmentBase64s
    };

  } catch (error) {
    console.error("[PDKT] Error init email:", error);
    throw error;
  }
};

// Updated function to evaluate Agent Response based on Typo and Clarity context
export const evaluateAgentResponse = async (agentReplyBody: string, consumerContext: string): Promise<EvaluationResult> => {
  if (!sessionState.aiInstance) throw new Error("Session not initialized");

  const evaluationPrompt = `
    Anda sekarang bertindak sebagai EDITOR BAHASA & SUPERVISOR CONTACT CENTER OJK.
    
    KONTEKS KELUHAN KONSUMEN:
    "${consumerContext}"
    
    JAWABAN AGEN (YANG PERLU DINILAI):
    "${agentReplyBody}"
    
    TUGAS:
    Nilai jawaban agen berdasarkan kriteria berikut (Skor Awal 100):
    
    1. TYPO (Salah Ketik):
       - Kurangi poin jika ada. Daftar kata yang salah.
    
    2. KEJELASAN INFORMASI & STRUKTUR (Clarity):
       - Apakah kalimatnya mudah dimengerti orang awam?
       - Apakah berbelit-belit atau membingungkan?
       - Apakah strukturnya logis (Pembuka -> Isi -> Penutup)?
       - Daftar kalimat yang membingungkan.
       
    3. RELEVANSI KONTEN (Content Relevance):
       - Apakah jawaban MENJAWAB masalah konsumen di atas?
       - Apakah informasinya tepat sasaran atau hanya template kosong?
       - Daftar informasi penting yang kurang (jika ada).
    
    OUTPUT JSON FORMAT:
    {
      "score": number, // Skor akhir 0-100
      "typos": string[], // Contoh: ["trimakasih -> terima kasih"]
      "clarityIssues": string[], // Contoh: "Kalimat paragraf 2 terlalu panjang dan membingungkan", "Istilah X tidak dijelaskan"
      "contentGaps": string[], // Contoh: "Tidak menjawab pertanyaan tentang pemblokiran rekening", "Solusi terlalu umum"
      "feedback": string // Saran perbaikan singkat
    }
  `;

  try {
    console.log("[PDKT] Evaluating response...");
    const response = await sessionState.aiInstance.models.generateContent({
      model: sessionState.currentConfig?.model || "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    let evalText = response.text || "{}";
    console.log("[PDKT] Raw Evaluation Response:", evalText);
    
    evalText = evalText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const result = JSON.parse(evalText);
    
    if (typeof result !== 'object' || result === null) {
      throw new Error("[PDKT] Invalid evaluation JSON from AI: not an object");
    }
    if (typeof result.score !== 'number') {
      console.warn("[PDKT] AI evaluation missing score field, defaulting to 0.");
    }
    
    return {
      score: result.score || 0,
      typos: result.typos || [],
      clarityIssues: result.clarityIssues || [],
      contentGaps: result.contentGaps || [],
      feedback: result.feedback || "Tidak ada masukan."
    };

  } catch (error) {
    console.error("[PDKT] Error evaluating:", error);
    throw error;
  }
};

// Deprecated or Unused for one-way flow, but kept for interface compatibility if needed
export const replyToEmail = async (agentReplyBody: string): Promise<EmailMessage> => {
   throw new Error("One-way communication only.");
};
