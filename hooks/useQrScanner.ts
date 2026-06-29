// hooks/useQrScanner.ts
"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const JSQR_CDN = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
const SCRIPT_ID = "jsqr-script";

/**
 * Reusable QR scanner hook.
 * Handles jsQR script loading, camera access, scan loop, and cleanup.
 *
 * @param onResult — called once when a QR code is successfully decoded
 */
export function useQrScanner(onResult: (data: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const jsqrReady = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [scanning, setScanning] = useState(false);

  // Load jsQR script once
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) {
      jsqrReady.current = true;
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = JSQR_CDN;
    s.onload = () => { jsqrReady.current = true; };
    document.head.appendChild(s);
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!jsqrReady.current || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const code = jsQR(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height
    );

    if (code?.data) {
      stopCamera();
      onResultRef.current(code.data);
      return;
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setScanning(true);
      scanLoop();
    } catch {
      throw new Error("Tidak dapat mengakses kamera");
    }
  }, [scanLoop]);

  return { videoRef, canvasRef, scanning, startCamera, stopCamera };
}
