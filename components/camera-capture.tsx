"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCcw, VideoOff, X } from "lucide-react";

export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>();
  const [captureUrl, setCaptureUrl] = useState<string>();
  const [capturedFile, setCapturedFile] = useState<File>();

  async function startCamera() {
    setError(undefined);
    setCaptureUrl(undefined);
    setCapturedFile(undefined);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não oferece acesso à câmera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (reason) {
      const denied =
        reason instanceof DOMException &&
        (reason.name === "NotAllowedError" || reason.name === "SecurityError");
      setError(
        denied
          ? "Permissão de câmera negada. Autorize o acesso nas configurações do navegador."
          : "Não foi possível acessar uma câmera neste dispositivo.",
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void startCamera(), 0);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Falha ao capturar a imagem.");
          return;
        }
        stopCamera();
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        setCapturedFile(file);
        setCaptureUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.88,
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tirar foto"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Tirar foto</h2>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Fechar câmera"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5">
          {error ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
              <VideoOff className="size-10" style={{ color: "var(--danger)" }} />
              <p className="mt-4 max-w-md text-sm leading-6">{error}</p>
              <button
                type="button"
                className="btn-secondary mt-5"
                onClick={() => void startCamera()}
              >
                <RefreshCcw className="size-4" />
                Tentar novamente
              </button>
            </div>
          ) : captureUrl ? (
            <img
              src={captureUrl}
              alt="Prévia da foto capturada"
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[4/3] w-full rounded-xl bg-black object-cover"
              aria-label="Prévia da câmera"
            />
          )}
        </div>
        {!error && (
          <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
            {captureUrl ? (
              <>
                <button type="button" className="btn-secondary" onClick={() => void startCamera()}>
                  <RefreshCcw className="size-4" />
                  Refazer
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => capturedFile && onCapture(capturedFile)}
                >
                  <Check className="size-4" />
                  Usar foto
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary" onClick={capture}>
                <Camera className="size-4" />
                Capturar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
