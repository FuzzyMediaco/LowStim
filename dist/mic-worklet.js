"use strict";
class SlateMicrophone extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = new Float32Array(2048);
    this.used = 0;
  }

  process(inputs) {
    const mono = inputs[0]?.[0];
    if (!mono) return true;
    for (const sample of mono) {
      this.batch[this.used++] = sample;
      if (this.used === this.batch.length) {
        this.port.postMessage(this.batch, [this.batch.buffer]);
        this.batch = new Float32Array(2048);
        this.used = 0;
      }
    }
    return true;
  }
}
registerProcessor("slate-microphone", SlateMicrophone);
