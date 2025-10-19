
const MAX_CHUNK_LENGTH = 4500; // A safe character limit for TTS APIs

export const chunkText = (text: string): string[] => {
  if (!text) return [];

  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length === 0) continue;

    if ((currentChunk.length + trimmedSentence.length + 1) <= MAX_CHUNK_LENGTH) {
      currentChunk += (currentChunk.length > 0 ? " " : "") + trimmedSentence;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      // If a single sentence is too long, we must split it.
      if (trimmedSentence.length > MAX_CHUNK_LENGTH) {
          let sentencePart = trimmedSentence;
          while(sentencePart.length > 0) {
              chunks.push(sentencePart.substring(0, MAX_CHUNK_LENGTH));
              sentencePart = sentencePart.substring(MAX_CHUNK_LENGTH);
          }
          currentChunk = "";
      } else {
        currentChunk = trimmedSentence;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};
