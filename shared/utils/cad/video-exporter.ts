/**
 * Video Export Utility
 * Captures Three.js canvas frames and exports to MP4 using MediaRecorder API
 */

export interface VideoExportOptions {
  width: number;
  height: number;
  fps: number;
  bitrate: number; // bits per second
  mimeType?: string;
}

export class VideoExporter {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;

  /**
   * Start recording from canvas
   */
  async startRecording(
    canvas: HTMLCanvasElement,
    options: Partial<VideoExportOptions> = {}
  ): Promise<void> {
    const defaultOptions: VideoExportOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 5000000, // 5 Mbps
      mimeType: 'video/webm;codecs=vp9'
    };

    const config = { ...defaultOptions, ...options };

    this.canvas = canvas;
    this.recordedChunks = [];

    // Check for MediaRecorder support
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder API not supported in this browser');
    }

    // Get supported MIME type
    let mimeType = config.mimeType || 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      // Fallback options
      const fallbacks = [
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      
      mimeType = fallbacks.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
      console.warn(`Original MIME type not supported. Using: ${mimeType}`);
    }

    // Capture stream from canvas
    this.stream = canvas.captureStream(config.fps);

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: config.bitrate
    });

    // Handle data available
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Start recording
    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  /**
   * Stop recording and download video
   */
  async stopRecording(filename: string = 'assembly-animation.webm'): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Create blob from recorded chunks
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || 'video/webm'
        });

        // Download the video
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // Cleanup
        this.cleanup();

        resolve(blob);
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this.cleanup();
        reject(error);
      };

      // Stop recording
      this.mediaRecorder.stop();

      // Stop all stream tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.canvas = null;
    this.stream = null;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get recording state
   */
  getState(): RecordingState {
    if (!this.mediaRecorder) return 'inactive';
    return this.mediaRecorder.state;
  }
}

/**
 * Alternative frame-by-frame exporter using canvas.toBlob()
 * More control but requires manual frame capture
 */
export class FrameExporter {
  private frames: Blob[] = [];
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Initialize frame exporter
   */
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.frames = [];
  }

  /**
   * Capture current frame
   */
  async captureFrame(): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    return new Promise((resolve, reject) => {
      this.canvas!.toBlob((blob) => {
        if (blob) {
          this.frames.push(blob);
          resolve();
        } else {
          reject(new Error('Failed to capture frame'));
        }
      }, 'image/png');
    });
  }

  /**
   * Get captured frame count
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * Export frames as ZIP
   */
  async exportFramesAsZip(filename: string = 'animation-frames.zip'): Promise<void> {
    // This would require a ZIP library like JSZip
    // For now, we'll export individual frames
    for (let i = 0; i < this.frames.length; i++) {
      const url = URL.createObjectURL(this.frames[i]);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame-${String(i).padStart(5, '0')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Clear captured frames
   */
  clear(): void {
    this.frames = [];
  }
}

/**
 * Export animation with full control over playback
 */
export async function exportAnimationToVideo(
  canvas: HTMLCanvasElement,
  animationCallback: (progress: number) => void,
  duration: number,
  fps: number = 30,
  options: Partial<VideoExportOptions> = {}
): Promise<Blob> {
  const exporter = new VideoExporter();
  
  // Start recording
  await exporter.startRecording(canvas, {
    fps,
    ...options
  });

  // Play animation
  const frameTime = 1000 / fps;
  const totalFrames = Math.ceil(duration * fps);

  for (let frame = 0; frame <= totalFrames; frame++) {
    const progress = frame / totalFrames;
    animationCallback(progress);
    
    // Wait for next frame
    await new Promise(resolve => setTimeout(resolve, frameTime));
  }

  // Stop recording and get blob
  const blob = await exporter.stopRecording();
  
  return blob;
}
