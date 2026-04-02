class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.port.postMessage({ inputBuffer: Array.from(input[0]) });
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
