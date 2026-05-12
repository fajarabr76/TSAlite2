class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      // Send a copy of the Float32Array to avoid neutered buffer issues in some environments
      this.port.postMessage({ 
        inputBuffer: input[0] 
      });
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
