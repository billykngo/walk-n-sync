export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const combineAudioBuffers = (buffers: AudioBuffer[], context: AudioContext): AudioBuffer => {
    if (buffers.length === 0) {
        return context.createBuffer(1, 1, context.sampleRate);
    }

    const numberOfChannels = buffers[0].numberOfChannels;
    const sampleRate = buffers[0].sampleRate;
    const totalLength = buffers.reduce((acc, buffer) => acc + buffer.length, 0);

    const combinedBuffer = context.createBuffer(numberOfChannels, totalLength, sampleRate);
    let offset = 0;

    for (const buffer of buffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            combinedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
        }
        offset += buffer.length;
    }

    return combinedBuffer;
};

export function encodeWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferOut = new ArrayBuffer(length);
    const view = new DataView(bufferOut);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // Helper function
    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    }
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // Write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length of fmt chunk
    setUint16(1); // PCM format
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // data length

    // Get PCM data from channels
    for (i = 0; i < numOfChan; i++) {
        channels.push(buffer.getChannelData(i));
    }

    // Write PCM samples
    let writeOffset = 44;
    for (i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < numOfChan; ch++) {
            sample = channels[ch][i];
            
            // Clamp and convert to 16-bit integer
            sample = Math.max(-1, Math.min(1, sample));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            
            view.setInt16(writeOffset, sample, true);
            writeOffset += 2;
        }
    }

    return new Blob([view], { type: 'audio/wav' });
}