/**
 * Whisper Transcription Module
 *
 * Lazy-load whisper-node to avoid cwd corruption at module load time.
 * (whisper-node changes process.cwd() when imported, breaking path resolution)
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import https from 'https';
import path from 'path';
import os from 'os';

// Set ffmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath.path);

export const WHISPER_MODEL = 'base.en'; // 244M params, best accuracy/speed balance

/**
 * Download file from URL to local path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(destPath).catch(() => {});
      reject(err);
    });
  });
}

/**
 * Convert audio file to 16kHz mono WAV (Whisper requirement)
 */
async function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .format('wav')
      .on('end', () => resolve())
      .on('error', reject)
      .save(outputPath);
  });
}

/**
 * Lazy-load whisper-node to avoid cwd corruption
 */
async function getWhisper(): Promise<any> {
  // @ts-ignore - whisper-node has no type definitions
  const whisper = await import('whisper-node');
  return whisper.default || whisper;
}

/**
 * Transcribe audio file using local Whisper model
 * @param audioUrl - URL to download audio from
 * @returns Transcribed text
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const tempOga = path.join(tempDir, `telegram_${timestamp}.oga`);
  const tempWav = path.join(tempDir, `telegram_${timestamp}.wav`);

  try {
    // 1. Download audio file
    await downloadFile(audioUrl, tempOga);

    // 2. Convert to 16kHz mono WAV
    await convertToWav(tempOga, tempWav);

    // 3. Transcribe with Whisper (lazy-loaded)
    const whisper = await getWhisper();
    const transcript = await whisper(tempWav, {
      modelName: WHISPER_MODEL,
      whisperOptions: {
        language: 'en',
        word_timestamps: false
      }
    });

    // Join speech segments
    const text = Array.isArray(transcript)
      ? transcript.map((t: any) => t.speech).join(' ').trim()
      : '[No speech detected]';

    return text || '[No speech detected]';
  } catch (error: any) {
    console.error('[transcription] Error:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  } finally {
    // Cleanup temp files
    await fs.unlink(tempOga).catch(() => {});
    await fs.unlink(tempWav).catch(() => {});
  }
}

/**
 * Check if Whisper model is available
 */
export async function checkWhisperModel(): Promise<{ available: boolean; path?: string; message?: string }> {
  const modelPaths = [
    path.join(os.homedir(), '.cache', 'whisper', `ggml-${WHISPER_MODEL}.bin`),
    path.join(process.cwd(), 'node_modules', 'whisper-node', 'lib', 'whisper.cpp', 'models', `ggml-${WHISPER_MODEL}.bin`)
  ];

  for (const modelPath of modelPaths) {
    try {
      await fs.access(modelPath);
      return { available: true, path: modelPath };
    } catch {
      // Continue checking other paths
    }
  }

  return {
    available: false,
    message: `Whisper model not found. Install with: npx whisper-node download`
  };
}
