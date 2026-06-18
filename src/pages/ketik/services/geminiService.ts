import { SessionConfig, ChatMessage, Scenario } from '../types';
import { logAiUsage, UsageContext } from '../../../services/usageService';
import { generateGeminiContent } from '../../../services/aiService';

type SessionState = {
  aiInstance: any;
  currentConfig: SessionConfig | null;
};

let sessionState: SessionState = {
  aiInstance: null,
  currentConfig: null,
};

export function initializeKetikSession(config: SessionConfig) {
  if (config.simulationMode) {
     sessionState = {
         aiInstance: "MOCK",
         currentConfig: config
     };
     return;
  }

  sessionState = {
    aiInstance: "ACTIVE",
    currentConfig: config,
  };
}

export async function generateConsumerResponse(
  config: SessionConfig,
  chatHistory: ChatMessage[],
  scenario: Scenario,
  extraPrompt?: string
): Promise<{ text: string; usageResult?: any }> {
  if (!sessionState.aiInstance) {
    initializeKetikSession(config);
  }

  if (config.simulationMode) {
      await new Promise(r => setTimeout(r, 1500)); // Simulate delay
      const agentMsgCount = chatHistory.filter(m => m.sender === 'agent').length;
      let mockText = '';
      if (agentMsgCount === 0) {
          mockText = `MOCK RESPONS: Halo, agen. Ini adalah mode simulasi untuk masalah ${scenario.category}!`;
      } else if (agentMsgCount < 3) {
          mockText = `MOCK RESPONS: Terima kasih atas jawabannya. Saya sedang mencoba mengikuti panduan Anda. (Gaya: ${config.consumerType.name})`;
      } else {
          mockText = `MOCK RESPONS: Oke, saya akan coba dulu. Terima kasih bantuannya! (Mode Simulasi Selesai)`;
      }
      return { text: mockText };
  }

  const imagesCount = scenario.images?.length || 0;
  const imageInstruction = imagesCount > 0 
    ? `Anda memiliki ${imagesCount} lampiran gambar yang bisa dikirim (indeks 0 sampai ${imagesCount - 1}). Gunakan tag [SEND_IMAGE: indeks] untuk mengirimnya.`
    : 'Anda tidak memiliki lampiran gambar untuk dikirim.';

  const scriptInstruction = scenario.script 
    ? `SKRIP PERCAKAPAN (PANDUAN ALUR): Berikut adalah skrip/alur percakapan. Jadikan skrip ini sebagai ACUAN atau PANDUAN arah pembicaraan, namun TIDAK MUTLAK. Anda tetap harus merespons secara natural, fleksibel, dan menyesuaikan dengan jawaban/pertanyaan dari agen. Jangan berikan semua informasi sekaligus kecuali ditanya. Skrip: ${scenario.script}`
    : '';

  const timeLimitInstruction = config.simulationDuration && config.simulationDuration > 0
    ? `\nBATAS WAKTU: Simulasi ini dibatasi maksimal ${config.simulationDuration} menit. Jika kamu merasa percakapan sudah mendekati batas waktu ini, kamu HARUS segera mengakhiri percakapan dengan alasan natural (misal: "Maaf saya ada urusan lain", "Baterai saya habis", dll) MESKIPUN SKRIP BELUM SELESAI. Prioritaskan menutup percakapan jika waktu habis.`
    : '';

  const systemInstruction = `
Anda berperan sebagai konsumen Contact Center OJK.
IDENTITAS ANDA (WAJIB KONSISTEN):
- Nama: ${config.identity.name}
- Kota Domisili: ${config.identity.city}
- Nomor HP: ${config.identity.phone}

Sifat Anda: ${config.consumerType.description}.
Masalah Anda: ${scenario.description}.

${scriptInstruction}
${timeLimitInstruction}
${imageInstruction}

ATURAN BALASAN:
1. Merespon secara natural, singkat, selayaknya chat WhatsApp. Jangan gunakan format formal, bullet points, atau salam pembuka yang berlebihan di setiap pesan.
2. Gunakan tag [BREAK] untuk memisahkan pesan jika ingin mengirim beberapa chat beruntun (maksimal 3 chat beruntun).
3. Gunakan tag [SISTEM] jika melakukan aksi fisik (misal: [SISTEM] Konsumen mengirim tangkapan layar).
4. Jika Anda ingin mengirim gambar, gunakan [SISTEM] diikuti dengan [SEND_IMAGE: indeks]. Misal: "[SISTEM] Mengirim bukti transfer [SEND_IMAGE: 0]".
5. Kembalikan [NO_RESPONSE] HANYA JIKA agen memberikan jawaban yang sangat memuaskan, percakapan benar-benar selesai secara natural, dan tidak ada lagi yang perlu ditanyakan.
6. Jangan pernah mengakui bahwa Anda adalah AI. Tetaplah dalam karakter sebagai konsumen yang sedang menghadapi masalah keuangan/perbankan.
7. KONSISTENSI DATA: Jika agen meminta data pribadi (Nama/HP/Kota), berikan data DI ATAS. JANGAN MENGARANG DATA BARU yang berbeda dengan profil ini.
  `;

  const historyText = chatHistory
    .filter(m => m.sender !== 'system')
    .map(m => `${m.sender === 'agent' ? 'Agen' : 'Konsumen'}: ${m.text}`)
    .join('\n');
    
  const prompt = `Skenario Saat Ini: ${scenario.title}\n\nRiwayat Chat:\n${historyText}\n\n${extraPrompt || 'Balas sebagai konsumen:'}`;

  const usageContext: UsageContext = {
    module: 'ketik',
    action: extraPrompt ? 'extra_response' : 'chat_response'
  };

  try {
    console.log("[Ketik] Sending prompt to Gemini:", prompt);
    const { response, usageResult } = await generateGeminiContent({
      apiKey: '', // proxy will handle this
      model: config.model || 'gemini-3-flash-preview',
      contents: prompt,
      systemInstruction,
      temperature: 0.7,
      userId: config.userId,
      usageContext
    });

    console.log("[Ketik] Raw Gemini Response:", response.text);
    return { text: response.text || '[NO_RESPONSE]', usageResult };
  } catch (error) {
    console.error('[Ketik] Gemini API Error:', error);
    return { text: 'Maaf, saya sedang tidak bisa membalas saat ini.' };
  }
}
