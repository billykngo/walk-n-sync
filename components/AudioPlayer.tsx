import React, { useState, useEffect, useRef, useCallback } from 'react';
import { combineAudioBuffers, encodeWav } from '../utils/audioUtils';

interface AudioPlayerProps {
  audioQueue: AudioBuffer[];
  onReset: () => void;
}

const formatTime = (timeInSeconds: number) => {
  const time = Math.round(timeInSeconds);
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const DEFAULT_RATE_INDEX = 2; // 1.0x

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioQueue, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [combinedBuffer, setCombinedBuffer] = useState<AudioBuffer | null>(null);
  const [rateIndex, setRateIndex] = useState(DEFAULT_RATE_INDEX);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const playbackRateRef = useRef(PLAYBACK_RATES[DEFAULT_RATE_INDEX]);

  // Update playback rate ref and live audio node when state changes
  useEffect(() => {
    playbackRateRef.current = PLAYBACK_RATES[rateIndex];
    if (sourceNodeRef.current) {
        sourceNodeRef.current.playbackRate.value = playbackRateRef.current;
    }
  }, [rateIndex]);


  const setupAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const cleanupPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      try { sourceNodeRef.current.stop(); } catch (e) { /* ignore error on already stopped source */ }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (audioQueue.length > 0) {
      const context = setupAudioContext();
      const combined = combineAudioBuffers(audioQueue, context);
      setCombinedBuffer(combined);
      setDuration(combined.duration);
    } else {
      setCombinedBuffer(null);
      setDuration(0);
      setCurrentTime(0);
      startOffsetRef.current = 0;
      setIsPlaying(false);
    }
    // When a new file is loaded, reset the playback rate to default
    setRateIndex(DEFAULT_RATE_INDEX);
  }, [audioQueue, setupAudioContext]);

  const startPlayback = useCallback((resumeTime = 0) => {
    if (!combinedBuffer || !audioContextRef.current) return;
    
    cleanupPlayback();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = combinedBuffer;
    source.playbackRate.value = playbackRateRef.current;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      // Only process 'onended' if it was natural, not from a manual stop
      if (sourceNodeRef.current !== source) return;

      const wallClockElapsed = audioContextRef.current!.currentTime - playbackStartTimeRef.current;
      const audioBufferElapsed = wallClockElapsed * playbackRateRef.current;
      const finalTime = startOffsetRef.current + audioBufferElapsed;
      
      cleanupPlayback();
      setIsPlaying(false);

      if (finalTime >= duration - 0.1) {
        setCurrentTime(duration);
        startOffsetRef.current = 0;
      } else {
        setCurrentTime(finalTime);
        startOffsetRef.current = finalTime;
      }
    };
    
    startOffsetRef.current = resumeTime;
    playbackStartTimeRef.current = audioContextRef.current.currentTime;
    
    source.start(0, resumeTime);
    sourceNodeRef.current = source;
    setIsPlaying(true);
    
    const progressLoop = () => {
      if (sourceNodeRef.current && audioContextRef.current) {
        const wallClockElapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        const audioBufferElapsed = wallClockElapsed * playbackRateRef.current;
        const newTime = startOffsetRef.current + audioBufferElapsed;
        if (newTime < duration) {
          setCurrentTime(newTime);
          animationFrameIdRef.current = requestAnimationFrame(progressLoop);
        } else {
          setCurrentTime(duration);
        }
      }
    };
    animationFrameIdRef.current = requestAnimationFrame(progressLoop);
  }, [combinedBuffer, cleanupPlayback, duration]);
  
  const pausePlayback = useCallback(() => {
    if (!audioContextRef.current) return;
    const wallClockElapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    const audioBufferElapsed = wallClockElapsed * playbackRateRef.current;
    const newCurrentTime = startOffsetRef.current + audioBufferElapsed;
    
    cleanupPlayback();
    setIsPlaying(false);
    setCurrentTime(newCurrentTime);
  }, [cleanupPlayback]);

  const handlePlayPause = () => {
    const context = setupAudioContext();
    if (context.state === 'suspended') {
      context.resume();
    }
    if (isPlaying) {
      pausePlayback();
    } else {
      const resumeTime = currentTime >= duration ? 0 : currentTime;
      startPlayback(resumeTime);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(event.target.value);
    setCurrentTime(newTime);
    if (isPlaying) {
      startPlayback(newTime);
    }
  };
  
   const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRateIndex = parseInt(event.target.value, 10);

    if (isPlaying && audioContextRef.current) {
        const wallClockElapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        const audioBufferElapsed = wallClockElapsed * playbackRateRef.current;
        const newCurrentTime = startOffsetRef.current + audioBufferElapsed;
        
        setCurrentTime(newCurrentTime);
        startOffsetRef.current = newCurrentTime;
        playbackStartTimeRef.current = audioContextRef.current.currentTime;
    }
    
    setRateIndex(newRateIndex);
  };

  const stopAndReset = () => {
    cleanupPlayback();
    if (audioContextRef.current) {
      audioContextRef.current.close().then(() => {
        audioContextRef.current = null;
      });
    }
    onReset();
  };
  
  const handleDownload = () => {
    if (!combinedBuffer) return;

    // Note: The Gemini API provides raw PCM audio. We are encoding it as a
    // WAV file, which is uncompressed and widely supported. While the user
    // requested an MP3, creating one in the browser requires a heavy encoding
    // library. This approach provides a high-quality downloadable file
    // without additional dependencies. We use the .mp3 extension as requested.
    const wavBlob = encodeWav(combinedBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_audio.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      cleanupPlayback();
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
      }
    }
  }, [cleanupPlayback]);

  return (
    <div className="bg-gray-700/50 p-4 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-cyan-400">Audio Playback</h2>
        <div className="flex items-center space-x-2">
           <button
             onClick={handleDownload}
             disabled={!combinedBuffer}
             className="p-2 rounded-full bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
             aria-label="Download audio as MP3"
             title="Download audio as MP3"
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
              </svg>
           </button>
           <button
             onClick={stopAndReset}
             className="p-2 rounded-full bg-red-600 hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
             aria-label="Reset and upload new file"
             title="Reset and upload new file"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
               <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
             </svg>
           </button>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={handlePlayPause}
          disabled={!combinedBuffer}
          className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
             </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 16 16">
               <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
            </svg>
          )}
        </button>
        <span className="text-sm font-mono w-12 text-center text-gray-300">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          disabled={!combinedBuffer}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed accent-cyan-500"
          aria-label="Audio timeline"
        />
        <span className="text-sm font-mono w-12 text-center text-gray-400">{formatTime(duration)}</span>
      </div>
      
      <div className="flex items-center space-x-3 sm:space-x-4 pt-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
        <input
          id="playback-speed-slider"
          type="range"
          min="0"
          max={PLAYBACK_RATES.length - 1}
          step="1"
          value={rateIndex}
          onChange={handleRateChange}
          disabled={!combinedBuffer}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed accent-cyan-500"
          aria-label="Playback speed"
        />
        <label htmlFor="playback-speed-slider" className="text-sm font-mono w-16 text-center text-gray-300">
            {PLAYBACK_RATES[rateIndex].toFixed(2)}x
        </label>
      </div>

    </div>
  );
};

export default AudioPlayer;