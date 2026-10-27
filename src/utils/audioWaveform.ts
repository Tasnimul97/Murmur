/**
 * Manages Web Audio API microphone stream and analyser node for live waveform rendering
 */
export class WebAudioWaveformManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  async start(
    onAmplitude: (level: number) => void,
    canvasRef?: HTMLCanvasElement | null
  ): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 128);
        onAmplitude(normalized);

        // Render waveform to canvas if provided
        if (canvasRef) {
          const ctx = canvasRef.getContext('2d');
          if (ctx) {
            const width = canvasRef.width;
            const height = canvasRef.height;
            ctx.clearRect(0, 0, width, height);

            const barWidth = 4;
            const gap = 3;
            const barCount = Math.floor(width / (barWidth + gap));
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
              const val = dataArray[i * step] || 0;
              const percent = val / 255;
              const barHeight = Math.max(4, percent * height * 0.85);
              const x = i * (barWidth + gap);
              const y = (height - barHeight) / 2;

              ctx.fillStyle = percent > 0.4 ? '#6366f1' : '#a5b4fc';
              ctx.beginPath();
              ctx.roundRect(x, y, barWidth, barHeight, 2);
              ctx.fill();
            }
          }
        }

        this.animationFrameId = requestAnimationFrame(draw);
      };

      draw();
      return true;
    } catch (err) {
      console.warn('Microphone permission not granted or audio error:', err);
      return false;
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.analyser = null;
  }
}
