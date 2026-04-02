import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { SessionConfig } from "../types";

// Fixed Stable Voices to prevent "changing" perception
const STABLE_VOICE_MAP = {
  male: 'Fenrir', // Deep, stable male voice
  female: 'Kore'  // Clear, stable female voice
};

export class LiveSession {
  private config: SessionConfig;
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null; 
  private stream: MediaStream | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isDisconnected: boolean = false;
  private isHeld: boolean = false; 
  private isMuted: boolean = false; // New Mute State
  private playbackRate: number = 1.0;
  
  // Throttle Volume Updates
  private lastVolumeUpdate: number = 0;

  // Callbacks
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onError?: (error: any) => void;
  public onStatusChange?: (status: string) => void;
  public onAiSpeaking?: (isSpeaking: boolean) => void;
  public onVolumeChange?: (level: number) => void; 
  public onRecordingComplete?: (url: string) => void;

  private session: Promise<any> | null = null;
  private connectionTimeout: any = null;
  
  // Recording State
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;
  private micSourceForRecording: MediaStreamAudioSourceNode | null = null;

  constructor(config: SessionConfig) {
    this.config = config;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API Key missing");
    this.ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { apiVersion: 'v1alpha' }
    });
  }

  // Method to toggle Hold state
  public setHold(active: boolean) {
      console.log(`[Telefun] setHold: ${active}`);
      this.isHeld = active;
      // If put on hold, we might want to stop current audio playback immediately
      if (active) {
          this.stopAllAudio(); 
          this.onAiSpeaking?.(false);
      }
  }

  // Method to toggle Mute state
  public setMute(muted: boolean) {
      console.log(`[Telefun] setMute: ${muted}`);
      this.isMuted = muted;
      if (this.stream) {
          this.stream.getAudioTracks().forEach(track => {
              track.enabled = !muted;
          });
      }
  }

  async connect() {
    this.isDisconnected = false;
    let currentStep = "Memulai koneksi...";
    
    // Safety timeout to prevent hanging "Connecting..." state
    this.connectionTimeout = setTimeout(() => {
        if (!this.isDisconnected) {
            console.error(`Connection timed out after 30s at step: ${currentStep}`);
            this.onStatusChange?.(`Error: Timeout di tahap ${currentStep}. Coba periksa koneksi internet Anda.`);
            this.onError?.(new Error(`Connection Timeout at ${currentStep}.`));
            this.disconnect();
        }
    }, 30000);

    try {
      currentStep = "Meminta izin mikrofon...";
      this.onStatusChange?.(currentStep);
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

      // 1. Get User Media FIRST to determine hardware sample rate
      try {
          this.stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            } 
          });
      } catch (mediaErr: any) {
          if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
              throw new Error("Izin Mikrofon Ditolak. Harap izinkan akses mikrofon di browser.");
          } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
              throw new Error("Mikrofon tidak ditemukan.");
          } else {
              throw mediaErr;
          }
      }

      if (this.isDisconnected) {
          this.stream.getTracks().forEach(t => t.stop());
          return;
      }

      currentStep = "Menyiapkan Audio Context...";
      this.onStatusChange?.(currentStep);

      // 2. Determine correct sample rate
      const track = this.stream.getAudioTracks()[0];
      const trackSettings = track.getSettings();
      const streamSampleRate = trackSettings.sampleRate;

      console.log(`Microphone Sample Rate: ${streamSampleRate || 'Unknown/Default'}`);

      // 3. Initialize Input Context
      // Use the hardware sample rate if available to avoid resampling artifacts/errors
      const contextOptions = streamSampleRate ? { sampleRate: streamSampleRate } : undefined;
      this.inputAudioContext = new AudioContextClass(contextOptions);
      
      // Output context always 24k for Gemini (or higher, browsers handle resampling)
      this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });

      // Setup Recording Destination
      this.recordingDestination = this.outputAudioContext.createMediaStreamDestination();
      this.micSourceForRecording = this.outputAudioContext.createMediaStreamSource(this.stream);
      this.micSourceForRecording.connect(this.recordingDestination);
      
      try {
          this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream);
          this.mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) this.recordedChunks.push(e.data);
          };
          this.mediaRecorder.onstop = () => {
              if (this.recordedChunks.length > 0) {
                  const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
                  const url = URL.createObjectURL(blob);
                  this.onRecordingComplete?.(url);
                  this.recordedChunks = []; // Prevent duplicate processing
                  if (this.mediaRecorder) this.mediaRecorder.onstop = null;
              }
          };
          this.mediaRecorder.start();
      } catch (e) {
          console.warn("MediaRecorder initialization failed:", e);
      }

      // CRITICAL: Resume contexts immediately (Do not await to prevent hanging)
      try {
        if (this.inputAudioContext.state === 'suspended') this.inputAudioContext.resume().catch(e => console.warn("Input resume failed:", e));
        if (this.outputAudioContext.state === 'suspended') this.outputAudioContext.resume().catch(e => console.warn("Output resume failed:", e));
      } catch (e) {
        console.warn("AudioContext resume failed:", e);
      }
      
      if (this.isDisconnected) return;
      
      // 4. Prepare System Instruction, Voice & Pitch
      const systemInstructionText = this.buildSystemInstruction();
      this.calculatePlaybackRate();

      const voiceName = this.config.identity.gender === 'male' ? STABLE_VOICE_MAP.male : STABLE_VOICE_MAP.female;
      const model = this.config.model || 'gemini-3.1-flash-live-preview';
      
      console.log(`Configuring Voice: ${voiceName} (${this.config.identity.gender})`);

      currentStep = "Menghubungkan ke Gemini Live API...";
      this.onStatusChange?.(currentStep);

      // 5. Connect to Live API
      const sessionPromise = this.ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
            if (this.isDisconnected) return;
            this.onStatusChange?.("Tersambung");
            this.onConnect?.();
            this.startAudioInput(sessionPromise);
          },
          onmessage: (msg: LiveServerMessage) => {
             if (this.isDisconnected) return;
             this.handleMessage(msg);
          },
          onclose: (e) => {
            if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
            if (this.isDisconnected) return;
            console.log("Session Closed", e);
            this.onStatusChange?.("Terputus");
            this.onDisconnect?.();
          },
          onerror: (err) => {
            if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
            if (this.isDisconnected) return;
            console.error("Live API Error:", err);
            
            let errorMsg = "Terjadi Kesalahan";
            if (err.message?.includes("implemented") || err.message?.includes("enabled") || err.message?.includes("404")) {
                errorMsg = "Model tidak tersedia/support Live API. Cek settings.";
            } else if (err.message?.includes("unavailable") || err.message?.includes("503") || err.message?.includes("504")) {
                errorMsg = "Server Sibuk/Timeout. Coba lagi nanti.";
            } else if (err.message?.includes("Network error") || err.message?.includes("fetch") || err.message?.includes("timeout")) {
                errorMsg = "Network Error: Cek Koneksi / API Key.";
            }
            
            this.onStatusChange?.(errorMsg);
            this.onError?.(err);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          systemInstruction: systemInstructionText
        }
      });
      
      this.session = sessionPromise;

      sessionPromise.then(s => {
          currentStep = "Sesi Live API Terbuka";
          console.log("Live API session promise resolved.");
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          if (this.isDisconnected) {
              s.close();
          }
      }).catch(err => {
          if (!this.isDisconnected) {
              console.error("Connection promise rejected:", err);
              if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
              
              const msg = err.message || "";
              let userMsg = "Koneksi Gagal (Network Error)";
              if (msg.includes("403")) userMsg = "Akses Ditolak (API Key Invalid/Quota Habis)";
              
              this.onStatusChange?.(userMsg);
              this.onError?.(err);
              
              // CRITICAL CLEANUP if promise rejects
              this.disconnect();
          }
      });

    } catch (err: any) {
      // Catch synchronous errors (getUserMedia, AudioContext creation)
      console.error("Connection setup failed:", err);
      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      this.onStatusChange?.(`Error: ${err.message || "Gagal Memulai"}`);
      this.onError?.(err);
      
      // Cleanup any partially created resources
      this.disconnect();
    }
  }

  private async startAudioInput(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.stream) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    
    // --- START ANALYZER SETUP ---
    this.analyser = this.inputAudioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.inputSource.connect(this.analyser);
    
    // Start volume monitoring loop
    this.analyzeVolume();
    // --- END ANALYZER SETUP ---

    await this.inputAudioContext.audioWorklet.addModule(
      new URL('../worklets/audioProcessor.worklet.js', import.meta.url)
    );
    
    this.workletNode = new AudioWorkletNode(
      this.inputAudioContext,
      'audio-processor'
    );
    
    this.workletNode.port.onmessage = (event) => {
      if (this.isDisconnected || this.isHeld || this.isMuted) return;
      
      const inputData = new Float32Array(event.data.inputBuffer);
      const downsampledData = this.downsampleTo16k(
        inputData,
        this.inputAudioContext!.sampleRate
      );
      const pcmBlob = this.createPcmBlob(downsampledData);
      
      sessionPromise.then(session => {
        if (!this.isDisconnected && !this.isHeld && !this.isMuted) {
          session.sendRealtimeInput({ media: pcmBlob });
        }
      }).catch(e => {
        if (!this.isDisconnected) console.warn("Send failed", e);
      });
    };
    
    this.inputSource.connect(this.workletNode);
    this.workletNode.connect(this.inputAudioContext.destination);
  }

  private analyzeVolume() {
      if (this.isDisconnected || !this.analyser) return;

      // Throttle to 10fps (every 100ms) to save CPU
      const now = Date.now();
      if (now - this.lastVolumeUpdate < 100) {
          requestAnimationFrame(() => this.analyzeVolume());
          return;
      }
      this.lastVolumeUpdate = now;

      // IF MUTED: Force volume to 0
      if (this.isMuted) {
          this.onVolumeChange?.(0);
          requestAnimationFrame(() => this.analyzeVolume());
          return;
      }

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      try {
        this.analyser.getByteFrequencyData(dataArray);
      } catch(e) {
        return; 
      }

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      
      const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));
      this.onVolumeChange?.(normalizedVolume);

      requestAnimationFrame(() => this.analyzeVolume());
  }
  
  private downsampleTo16k(buffer: Float32Array, sampleRate: number): Float32Array {
    if (sampleRate === 16000) return buffer;
    
    const ratio = sampleRate / 16000;
    const newLength = Math.ceil(buffer.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
        const offset = Math.floor(i * ratio);
        const nextOffset = Math.floor((i + 1) * ratio);
        let sum = 0;
        let count = 0;
        
        for (let j = offset; j < nextOffset && j < buffer.length; j++) {
            sum += buffer[j];
            count++;
        }
        
        result[i] = count > 0 ? sum / count : buffer[offset];
    }
    return result;
  }

  private async handleMessage(message: LiveServerMessage) {
    const modelTurn = message.serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData?.data) {
        const base64Audio = modelTurn.parts[0].inlineData.data;
        this.playAudioChunk(base64Audio);
    }

    if (message.serverContent?.interrupted) {
      this.stopAllAudio();
      this.onAiSpeaking?.(false);
    }
  }

  private async playAudioChunk(base64: string) {
    // GUARD: If disconnected OR on Hold, do not play audio.
    // This prevents AI voice leaking over Hold music.
    if (!this.outputAudioContext || this.isDisconnected || this.isHeld) return;

    try {
      const pcmData = this.base64ToUint8Array(base64);
      const audioBuffer = await this.decodeAudioData(pcmData, this.outputAudioContext);

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = this.playbackRate; 
      source.connect(this.outputAudioContext.destination);
      if (this.recordingDestination) {
          source.connect(this.recordingDestination);
      }
      
      const currentTime = this.outputAudioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05; 
      }
      
      source.start(this.nextStartTime);
      const effectiveDuration = audioBuffer.duration / this.playbackRate;
      this.nextStartTime += effectiveDuration;
      
      this.activeSources.add(source);
      this.onAiSpeaking?.(true);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
           setTimeout(() => {
             if (this.activeSources.size === 0) this.onAiSpeaking?.(false);
           }, 100);
        }
      };

    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  }

  private stopAllAudio() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.activeSources.clear();
    if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime + 0.05; 
    } else {
        this.nextStartTime = 0;
    }
  }

  async disconnect() {
    if (this.isDisconnected) return;
    this.isDisconnected = true;
    
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
    }

    this.stopAllAudio();
    
    // Close Session
    if (this.session) {
        this.session.then(s => {
            try { s.close(); } catch(e) { console.warn("Error closing session:", e); }
        }).catch(() => {});
        this.session = null;
    }

    // Cleanup Media Streams
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Cleanup Nodes
    if (this.workletNode) {
      try { this.workletNode.disconnect(); } catch(e) {}
      this.workletNode = null;
    }
    if (this.analyser) {
        try { this.analyser.disconnect(); } catch(e) {}
    }
    if (this.inputSource) {
      try { this.inputSource.disconnect(); } catch(e) {}
    }
    if (this.micSourceForRecording) {
      try { this.micSourceForRecording.disconnect(); } catch(e) {}
    }
    if (this.recordingDestination) {
      try { this.recordingDestination.disconnect(); } catch(e) {}
    }

    // Safely Close AudioContexts
    const closeContext = async (ctx: AudioContext | null) => {
        if (ctx && ctx.state !== 'closed') {
            try {
                await ctx.close();
            } catch (e) {
                console.warn("Error closing AudioContext:", e);
            }
        }
    };

    await Promise.all([
        closeContext(this.inputAudioContext),
        closeContext(this.outputAudioContext)
    ]);
    
    this.inputAudioContext = null;
    this.outputAudioContext = null;
  }

  private createPcmBlob(data: Float32Array): any {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);
    const base64 = this.uint8ArrayToBase64(uint8);
    
    return {
      mimeType: 'audio/pcm;rate=16000',
      data: base64
    };
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }

  private calculatePlaybackRate() {
     const s = this.config.scenarios[0]; 
     const c = this.config.consumerType;
     const combinedText = (c.name + " " + c.description + " " + s.title + " " + s.description).toLowerCase();

     if (combinedText.includes("marah") || combinedText.includes("panik") || combinedText.includes("ngeyel") || combinedText.includes("emosi") || combinedText.includes("kasar") || combinedText.includes("darurat") || combinedText.includes("tinggi")) {
         this.playbackRate = 1.05; 
     } 
     else if (combinedText.includes("sedih") || combinedText.includes("memelas") || combinedText.includes("bingung") || combinedText.includes("gaptek") || combinedText.includes("ragu") || combinedText.includes("lemas") || combinedText.includes("takut")) {
         this.playbackRate = 0.95; 
     } else {
         this.playbackRate = 1.0; 
     }
  }

  private buildSystemInstruction(): string {
     const s = this.config.scenarios[0]; 
     const c = this.config.consumerType;
     const identity = this.config.identity;
     
     let emotionInstruction = "";
     if (c.name.toLowerCase().includes("marah") || c.name.toLowerCase().includes("ngeyel")) {
         emotionInstruction = "EMOSI: MARAH/KESAL. Nada tinggi dan cepat. Jaga konsistensi suara.";
     } else if (c.name.toLowerCase().includes("gaptek")) {
         emotionInstruction = "EMOSI: BINGUNG/GAPTEK. Bicara lambat, banyak jeda 'eemm', 'anu'.";
     } else {
         emotionInstruction = `EMOSI: ${c.description}. Bicara natural.`;
     }

     const genderInstruction = identity.gender === 'male' 
        ? "SUARA: LAKI-LAKI (Bapak-bapak). Gunakan suara berat." 
        : "SUARA: PEREMPUAN (Ibu-ibu). Gunakan suara wanita.";

     const timeLimitInstruction = this.config.maxCallDuration > 0 
        ? `\nBATAS WAKTU: Simulasi ini dibatasi maksimal ${this.config.maxCallDuration} menit. Jika kamu merasa percakapan sudah mendekati batas waktu ini, kamu HARUS segera mengakhiri telepon (misalnya: "Ya sudah terima kasih, saya tutup", "Saya ada urusan lain", atau "Pulsa saya habis") MESKIPUN SKRIP BELUM SELESAI. Prioritaskan menutup telepon jika waktu habis.`
        : "";

     return `
    ROLEPLAY: Kamu adalah KONSUMEN/PELANGGAN (Bukan Agen, Bukan AI).
    
    IDENTITAS ANDA (WAJIB KONSISTEN):
    - NAMA: ${identity.name} (${identity.gender === 'male' ? 'Pria' : 'Wanita'})
    - LOKASI/DOMISILI: ${identity.city}
    - NOMOR HP: ${identity.phone}
    
    PENTING: Jika ditanya agen, sebutkan data di atas. JANGAN MENGARANG data identitas baru yang berbeda.
    
    MASALAH ANDA: ${s.title}. ${s.description}
    ${s.script ? `\nSKRIP/ALUR PERCAKAPAN (PANDUAN): ${s.script}\nJadikan skrip ini sebagai ACUAN atau PANDUAN arah pembicaraan, namun TIDAK MUTLAK. Anda tetap harus merespons secara natural, fleksibel, dan menyesuaikan dengan jawaban/pertanyaan dari agen.` : ''}
    ${timeLimitInstruction}
    
    ATURAN BICARA (SANGAT PENTING):
    1. JANGAN PERNAH BERHENTI MENDADAK DI TENGAH KALIMAT. Selesaikan pikiranmu.
    2. Abaikan suara bising kecil atau gumaman agen, teruskan bicara sampai kalimatmu selesai.
    3. Jika agen menyela panjang, barulah berhenti. Tapi jika hanya "hmm" atau suara kecil, LANJUTKAN.
    4. TAHAN INTERUPSI: Jika kamu mendengar suara napas, batuk, atau 'hmm', JANGAN BERHENTI. Terus bicara sampai poinmu selesai.
    
    ATURAN ROLEPLAY:
    1. JANGAN PERNAH MENAWARKAN BANTUAN. Kamu pelanggan, kamu yang butuh bantuan.
    2. JANGAN MEMPERKENALKAN DIRI SEBAGAI AI.
    3. Gunakan Bahasa Indonesia lisan yang natural, boleh tidak baku.
    
    KONSISTENSI SUARA (CRITICAL):
    - ${genderInstruction}
    - JANGAN BERUBAH MENJADI LAWAN JENIS APAPUN YANG TERJADI.
    - Pertahankan pitch dan tone suara dari awal sampai akhir.
    
    KARAKTER & EMOSI:
    - ${emotionInstruction}
    `;
  }
}
