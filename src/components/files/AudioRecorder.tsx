import { useEffect, useRef, useState, useCallback } from 'react';
import { uploadFile } from '@/lib/api/filesApi';
import type { FileItem } from '@/types/files';

interface AudioRecorderProps {
  folderId?: string;
  onUploaded?: (file: FileItem) => void;
  onError?: (error: Error) => void;
}

type RecordingState = 'idle' | 'recording' | 'stopping' | 'uploading';

export function AudioRecorder({ folderId, onUploaded, onError }: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const shouldUploadRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  useEffect(() => {
    setIsClient(true);
    return () => {
      cleanupRecorder();
    };
  }, []);

  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = window.setInterval(() => {
        setElapsedMs((prev) => prev + 1000);
      }, 1000);
      return () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
    return undefined;
  }, [recordingState]);

  const isSupported = isClient && typeof window !== 'undefined' && 'MediaRecorder' in window;

  async function startRecording() {
    if (!isSupported) {
      setPermissionError('Audio recording is not supported in this browser.');
      return;
    }

    setPermissionError(null);
    setUploadError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      setupAudioVisualization(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mimeTypeRef.current = mediaRecorder.mimeType || 'audio/webm';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopVisualization();
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];

        if (shouldUploadRef.current) {
          void handleUpload(blob);
        } else {
          cleanupRecorder();
          setRecordingState('idle');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      shouldUploadRef.current = false;
      setElapsedMs(0);
      setLevel(0);
      mediaRecorder.start();
      setRecordingState('recording');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to access microphone. Please check permissions.';
      setPermissionError(message);
      setRecordingState('idle');
      cleanupRecorder();
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }

  function stopRecording(upload: boolean) {
    if (!mediaRecorderRef.current) {
      return;
    }

    shouldUploadRef.current = upload;
    setRecordingState('stopping');
    mediaRecorderRef.current.stop();
  }

  async function handleUpload(blob: Blob) {
    if (!blob.size) {
      setUploadError('Recording is empty.');
      setRecordingState('idle');
      cleanupRecorder();
      return;
    }

    setRecordingState('uploading');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `recording-${timestamp}.webm`;
      const file = new File([blob], fileName, { type: mimeTypeRef.current });
      const uploaded = await uploadFile(file, folderId || undefined);
      onUploaded?.(uploaded);
      setRecordingState('idle');
      cleanupRecorder();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to upload audio recording.';
      setUploadError(message);
      setRecordingState('idle');
      cleanupRecorder();
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }

  function setupAudioVisualization(stream: MediaStream) {
    try {
      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextConstructor) {
        return;
      }

      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = sourceNode;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) {
          return;
        }
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const value = dataArray[i] - 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length) / 128;
        setLevel(Math.min(1, rms * 2));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    } catch (error) {
      console.warn('Audio visualization unavailable:', error);
    }
  }

  function stopVisualization() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setLevel(0);
  }

  const cleanupRecorder = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    stopVisualization();
  }, []);

  function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Quick Audio Recorder</h3>
      <p className="mt-1 text-sm text-slate-500">
        Record a short audio note and upload it directly to your files.
      </p>

      {!isSupported && (
        <p className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          Audio recording is not supported in this browser.
        </p>
      )}

      {permissionError && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {permissionError}
        </p>
      )}

      {uploadError && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </p>
      )}

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-slate-600">Status</span>
            <div className="text-lg font-semibold text-slate-900">
              {recordingState === 'recording' && 'Recording...'}
              {recordingState === 'idle' && 'Idle'}
              {recordingState === 'uploading' && 'Uploading...'}
              {recordingState === 'stopping' && 'Processing...'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-slate-600">Elapsed</span>
            <div className="text-lg font-semibold text-slate-900">{formatTime(elapsedMs)}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.max(5, Math.min(100, Math.round(level * 100)))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Live waveform intensity (approximate)</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startRecording}
          disabled={!isSupported || recordingState === 'recording' || recordingState === 'uploading'}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {recordingState === 'recording' ? 'Recording...' : 'Start Recording'}
        </button>
        <button
          type="button"
          onClick={() => stopRecording(true)}
          disabled={recordingState !== 'recording'}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:bg-green-400"
        >
          Stop & Upload
        </button>
        <button
          type="button"
          onClick={() => stopRecording(false)}
          disabled={recordingState !== 'recording'}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
