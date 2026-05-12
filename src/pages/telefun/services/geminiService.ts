import { SessionConfig, SessionMetrics } from "../types";

// Fixed Stable Voices
const STABLE_VOICE_MAP = {
  male: 'Fenrir',
  female: 'Kore'
};

export class LiveSession {
  private config: SessionConfig;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  
  // Audio Nodes
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  
  // Destination for Recording
  private fullCallDestination: MediaStreamAudioDestinationNode | null = null;
  private agentDestination: MediaStreamAudioDestinationNode | null = null;
  
  // Recorders
  private fullCallRecorder: MediaRecorder | null = null;
  private agentRecorder: MediaRecorder | null = null;
  private fullCallChunks: Blob[] = [];
  private agentChunks: Blob[] = [];

  // Playback State
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private playbackRate: number = 1.0;
  private isAgentSpeaking: boolean = false;
  private agentSpeakingCheckTimeout: any = null;

  // Connection State
  private isDisconnected: boolean = false;
  private isHeld: boolean = false;
  private isMuted: boolean = false;
  
  // Metrics Tracking
  private metrics: SessionMetrics = {
    durationSeconds: 0,
    interruptionCount: 0,
    deadAirCount: 0,
    userSpeakingTime: 0,
    agentSpeakingTime: 0
  };
  private startTime: number = 0;
  private metricsInterval: any = null;
  private lastUserSpeechTime: number = Date.now();
  private deadAirFlag: boolean = false;
  private isUserSpeaking: boolean = false;
  private hasInterruptedThisTurn: boolean = false;

  // System Messages Queue
  private queuedSystemMessages: string[] = [];
  private timeCueSent: boolean = false;

  // Callbacks
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onError?: (error: any) => void;
  public onStatusChange?: (status: string) => void;
  public onAiSpeaking?: (isSpeaking: boolean) => void;
  public onVolumeChange?: (level: number) => void;
  public onRecordingReady?: (fullCallBlob: Blob, agentBlob: Blob, metrics: SessionMetrics) => void;
  public onUsage?: (usage: any) => void;

  constructor(config: SessionConfig) {
    this.config = config;
  }

  public setHold(active: boolean) {
    this.isHeld = active;
    if (active) {
      this.stopAllAudio();
      this.onAiSpeaking?.(false);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  async connect() {
    if (this.config.simulationMode) {
      return this.startSimulationMode();
    }

    const apiKey = (window as any).VITE_GEMINI_API_KEY || (process as any).env.VITE_GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY;
    if (!apiKey) {
      this.onError?.(new Error("API Key Gemini tidak ditemukan."));
      return;
    }

    this.isDisconnected = false;
    this.onStatusChange?.("Menyiapkan perangkat audio...");

    try {
      // 1. Initialize Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 24000 });

      // 2. Get Microphone
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      });

      // 3. Setup Recording Destinations
      this.fullCallDestination = this.audioContext.createMediaStreamDestination();
      this.agentDestination = this.audioContext.createMediaStreamDestination();

      // Pipe Mic to Full Call
      this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.fullCallDestination);

      // Mic Analyser for User Activity
      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micSource.connect(this.micAnalyser);

      // 4. Setup WebSocket
      const model = this.config.model || 'gemini-2.0-flash-exp';
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => this.handleWsOpen();
      this.ws.onmessage = (e) => this.handleWsMessage(e);
      this.ws.onclose = () => this.handleWsClose();
      this.ws.onerror = (e) => this.onError?.(e);

      this.onStatusChange?.("Menghubungkan ke server...");
      this.calculatePlaybackRate();

    } catch (err) {
      console.error("Connection failed:", err);
      this.onError?.(err);
      this.disconnect();
    }
  }

  private handleWsOpen() {
    if (this.isDisconnected || !this.ws) return;

    // Send Setup Message
    const voiceName = this.config.identity.gender === 'male' ? STABLE_VOICE_MAP.male : STABLE_VOICE_MAP.female;
    const setupMsg = {
      setup: {
        model: `models/${this.config.model || 'gemini-2.0-flash-exp'}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          }
        },
        systemInstruction: {
          parts: [{ text: this.buildSystemInstruction() }]
        }
      }
    };

    this.ws.send(JSON.stringify(setupMsg));
    this.onStatusChange?.("Sinkronisasi...");
  }

  private async handleWsMessage(event: MessageEvent) {
    if (this.isDisconnected) return;

    const msg = JSON.parse(event.data);

    // Initial Handshake Confirmation
    if (msg.setupComplete) {
      this.onStatusChange?.("Tersambung");
      this.onConnect?.();
      this.startRecording();
      this.startAudioInput();
      this.startMetricsTracking();
      return;
    }

    // Audio Data
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.playAudioChunk(part.inlineData.data);
        }
      }
    }

    // Turn Complete or Interrupted
    if (msg.serverContent?.turnComplete) {
      this.hasInterruptedThisTurn = false;
      this.flushSystemMessages();
    }

    if (msg.serverContent?.interrupted) {
      this.stopAllAudio();
      this.onAiSpeaking?.(false);
      this.isAgentSpeaking = false;
    }

    // Usage Tracking
    if (msg.usageMetadata) {
      this.onUsage?.(msg.usageMetadata);
    }
  }

  private handleWsClose() {
    if (!this.isDisconnected) {
      this.onStatusChange?.("Terputus");
      this.disconnect();
    }
  }

  private async startAudioInput() {
    if (!this.audioContext || !this.ws || !this.micStream) return;

    await this.audioContext.audioWorklet.addModule(
      new URL('../worklets/audioProcessor.worklet.js', import.meta.url)
    );

    this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
    this.workletNode.port.onmessage = (event) => {
      if (this.isDisconnected || this.isHeld || this.isMuted || this.ws?.readyState !== WebSocket.OPEN) return;

      const inputBuffer = event.data.inputBuffer;
      const downsampled = this.downsampleTo16k(inputBuffer, this.audioContext!.sampleRate);
      const base64Audio = this.float32ToBase64Pcm(downsampled);

      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio
          }]
        }
      }));
    };

    if (this.micSource) {
      this.micSource.connect(this.workletNode);
    }
  }

  private startRecording() {
    if (!this.fullCallDestination || !this.agentDestination) return;

    try {
      this.fullCallRecorder = new MediaRecorder(this.fullCallDestination.stream, { mimeType: 'audio/webm' });
      this.agentRecorder = new MediaRecorder(this.agentDestination.stream, { mimeType: 'audio/webm' });

      this.fullCallRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.fullCallChunks.push(e.data); };
      this.agentRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.agentChunks.push(e.data); };

      this.fullCallRecorder.start();
      this.agentRecorder.start();
      this.startTime = Date.now();
    } catch (e) {
      console.warn("Recorder failed to start:", e);
    }
  }

  private startMetricsTracking() {
    this.metricsInterval = setInterval(() => {
      if (this.isDisconnected) return;

      // Calculate RMS for User Speech Detection
      const rms = this.calculateMicRMS();
      this.isUserSpeaking = rms > 0.05;

      if (this.isUserSpeaking) {
        this.metrics.userSpeakingTime += 0.2;
        this.lastUserSpeechTime = Date.now();
        this.deadAirFlag = false;

        // Check Intrerruption
        if (this.isAgentSpeaking && !this.hasInterruptedThisTurn) {
          this.metrics.interruptionCount++;
          this.hasInterruptedThisTurn = true;
        }
      } else {
        // Dead Air Check
        const silenceDuration = (Date.now() - this.lastUserSpeechTime) / 1000;
        if (silenceDuration > 7 && !this.isAgentSpeaking && !this.deadAirFlag) {
          this.metrics.deadAirCount++;
          this.deadAirFlag = true;
        }
      }

      if (this.isAgentSpeaking) {
        this.metrics.agentSpeakingTime += 0.2;
      }

      this.metrics.durationSeconds = (Date.now() - this.startTime) / 1000;
      this.onVolumeChange?.(Math.min(100, Math.round(rms * 1000)));

      // Time Cue Logic (30s)
      const remaining = (this.config.maxCallDuration * 60) - this.metrics.durationSeconds;
      if (remaining <= 30 && remaining > 0 && !this.timeCueSent) {
        this.queueSystemMessage("[SISTEM: Sisa waktu 30 detik. Silakan lakukan penutupan percakapan secara natural.]");
        this.timeCueSent = true;
      }

    }, 200);
  }

  private calculateMicRMS(): number {
    if (!this.micAnalyser) return 0;
    const data = new Float32Array(this.micAnalyser.fftSize);
    this.micAnalyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private async playAudioChunk(base64: string) {
    if (!this.audioContext || this.isDisconnected || this.isHeld) return;

    try {
      const pcmData = this.base64ToUint8Array(base64);
      const audioBuffer = this.decodePcm24k(pcmData);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = this.playbackRate;

      // Connect to Speaker & Recorders
      source.connect(this.audioContext.destination);
      if (this.fullCallDestination) source.connect(this.fullCallDestination);
      if (this.agentDestination) source.connect(this.agentDestination);

      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.02;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration / this.playbackRate;

      this.activeSources.add(source);
      this.setAgentSpeakingStatus(true);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          this.setAgentSpeakingStatus(false);
        }
      };

    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }

  private setAgentSpeakingStatus(isSpeaking: boolean) {
    if (this.agentSpeakingCheckTimeout) clearTimeout(this.agentSpeakingCheckTimeout);
    
    if (isSpeaking) {
      if (!this.isAgentSpeaking) {
        this.isAgentSpeaking = true;
        this.onAiSpeaking?.(true);
      }
    } else {
      // Debounce speaking state to avoid flicker between chunks
      this.agentSpeakingCheckTimeout = setTimeout(() => {
        if (this.activeSources.size === 0) {
          this.isAgentSpeaking = false;
          this.onAiSpeaking?.(false);
          this.flushSystemMessages();
        }
      }, 150);
    }
  }

  private queueSystemMessage(text: string) {
    this.queuedSystemMessages.push(text);
    this.flushSystemMessages();
  }

  private flushSystemMessages() {
    if (this.isAgentSpeaking || this.queuedSystemMessages.length === 0 || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const text = this.queuedSystemMessages.shift();
    if (text) {
      this.ws.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true
        }
      }));
    }
  }

  private stopAllAudio() {
    this.activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.activeSources.clear();
    if (this.audioContext) this.nextStartTime = this.audioContext.currentTime + 0.05;
  }

  async disconnect() {
    if (this.isDisconnected) return;
    this.isDisconnected = true;

    clearInterval(this.metricsInterval);
    this.stopAllAudio();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.fullCallRecorder && this.fullCallRecorder.state !== 'inactive') this.fullCallRecorder.stop();
    if (this.agentRecorder && this.agentRecorder.state !== 'inactive') this.agentRecorder.stop();

    // Export recordings
    setTimeout(() => {
      if (this.fullCallChunks.length > 0) {
        const fullBlob = new Blob(this.fullCallChunks, { type: 'audio/webm' });
        const agentBlob = new Blob(this.agentChunks, { type: 'audio/webm' });
        this.onRecordingReady?.(fullBlob, agentBlob, this.metrics);
      }
      this.onDisconnect?.();
    }, 500);

    // Cleanup Audio
    if (this.micStream) this.micStream.getTracks().forEach(t => t.stop());
    [this.micSource, this.workletNode, this.micAnalyser, this.fullCallDestination, this.agentDestination].forEach(node => {
      try { node?.disconnect(); } catch(e) {}
    });
    if (this.audioContext) this.audioContext.close();
  }

  // --- Helper Methods ---

  private calculatePlaybackRate() {
    const s = this.config.scenarios[0];
    const c = this.config.consumerType;
    const combinedText = (c.name + " " + c.description + " " + s.title + " " + s.description).toLowerCase();

    if (["marah", "panik", "ngeyel", "emosi", "kasar", "darurat", "tinggi"].some(kw => combinedText.includes(kw))) {
      this.playbackRate = 1.05;
    } else if (["sedih", "memelas", "bingung", "gaptek", "ragu", "lemas", "takut"].some(kw => combinedText.includes(kw))) {
      this.playbackRate = 0.95;
    } else {
      this.playbackRate = 1.0;
    }
  }

  private downsampleTo16k(buffer: Float32Array, sampleRate: number): Float32Array {
    if (sampleRate === 16000) return buffer;
    const ratio = sampleRate / 16000;
    const newLength = Math.ceil(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.floor(i * ratio)];
    }
    return result;
  }

  private float32ToBase64Pcm(float32Array: Float32Array): string {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      int16[i] = Math.max(-1, Math.min(1, float32Array[i])) * 32767;
    }
    return btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private decodePcm24k(data: Uint8Array): AudioBuffer {
    const int16 = new Int16Array(data.buffer);
    const buffer = this.audioContext!.createBuffer(1, int16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
        channelData[i] = int16[i] / 32768.0;
    }
    return buffer;
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
        ? "SUARA: LAKI-LAKI (Bapak-bapak). Gunakan suara berat. SENSITIVITAS GENDER: Kamu adalah seorang Laki-laki tulen. Jika Agen salah memanggil kamu dengan sapaan wanita (misal: 'Ibu', 'Mbak'), kamu WAJIB MERASA TERSINGGUNG/RISIH dan langsung koreksi dengan tegas tapi tetap profesional (misal: 'Maaf ya, saya ini bapak-bapak, bukan ibu-ibu', dsb)." 
        : "SUARA: PEREMPUAN (Ibu-ibu). Gunakan suara wanita. SENSITIVITAS GENDER: Kamu adalah seorang Wanita tulen. Jika Agen salah memanggil kamu dengan sapaan laki-laki (misal: 'Bapak', 'Mas'), kamu WAJIB MERASA TERSINGGUNG/RISIH dan langsung koreksi dengan tegas tapi tetap profesional (misal: 'Maaf ya Mbak/Mas, suara saya emang begini tapi saya ini Ibu-ibu, panggil saya Ibu saja', dsb).";

     return `
    ROLEPLAY: Kamu adalah KONSUMEN/PELANGGAN (Bukan Agen, Bukan AI).
    
    IDENTITAS ANDA (WAJIB KONSISTEN):
    - NAMA: ${identity.name} (${identity.gender === 'male' ? 'Pria' : 'Wanita'})
    - LOKASI/DOMISILI: ${identity.city}
    - NOMOR HP: ${identity.phone}
    
    PENTING: Jika ditanya agen, sebutkan data di atas. JANGAN MENGARANG data identitas baru yang berbeda.
    
    MASALAH ANDA: ${s.title}. ${s.description}
    ${s.script ? `\nSKRIP/ALUR PERCAKAPAN (PANDUAN): ${s.script}` : ''}
    
    ATURAN BICARA (SANGAT PENTING):
    1. JANGAN PERNAH BERHENTI MENDADAK DI TENGAH KALIMAT. Selesaikan pikiranmu.
    2. Abaikan suara bising kecil atau gumaman agen, teruskan bicara sampai kalimatmu selesai.
    3. Jika agen menyela panjang (bicara kalimat utuh), barulah berhenti. Tapi jika hanya "hmm" atau suara kecil, LANJUTKAN.
    4. TAHAN INTERUPSI: Jika kamu mendengar suara napas, batuk, atau 'hmm', JANGAN BERHENTI. Terus bicara sampai poinmu selesai.
    5. FOKUS SKENARIO (ABSOLUT): Kamu HANYA membahas masalah: ${s.title}.
    
    ATURAN ROLEPLAY:
    1. JANGAN PERNAH MENAWARKAN BANTUAN. Kamu pelanggan, kamu yang butuh bantuan.
    2. JANGAN MEMPERKENALKAN DIRI SEBAGAI AI.
    
    KONSISTENSI SUARA (CRITICAL):
    - ${genderInstruction}
    - Pertahankan pitch dan tone suara dari awal sampai akhir.
    
    KARAKTER & EMOSI:
    - ${emotionInstruction}
    `;
  }

  private async startSimulationMode() {
    this.isDisconnected = false;
    this.onStatusChange?.("Tersambung (Mode Simulasi)");
    this.onConnect?.();
    this.startTime = Date.now();
    
    const interval = setInterval(() => {
        if (this.isDisconnected) {
            clearInterval(interval);
            return;
        }
        this.metrics.durationSeconds++;
        this.onVolumeChange?.(Math.random() * 20);
    }, 1000);

    const simulate = () => {
        if (this.isDisconnected) return;
        this.onAiSpeaking?.(true);
        this.isAgentSpeaking = true;
        setTimeout(() => {
            if (this.isDisconnected) return;
            this.onAiSpeaking?.(false);
            this.isAgentSpeaking = false;
            setTimeout(simulate, 3000 + Math.random() * 5000);
        }, 2000 + Math.random() * 3000);
    };
    setTimeout(simulate, 2000);
  }
}
