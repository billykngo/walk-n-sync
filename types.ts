export enum Status {
  IDLE,
  EXTRACTING_TEXT,
  GENERATING_AUDIO,
  SUCCESS,
  ERROR,
}

export type TtsProvider = 'gemini' | 'elevenlabs';

export interface Voice {
  id: string;
  name: string;
}
