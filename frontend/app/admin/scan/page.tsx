"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { QrDimensions } from "html5-qrcode/esm/core";
import { toast } from "sonner";
import { CameraOff } from "lucide-react";
import { ProductService } from "@/services/product.service";
import { parseScannedText } from "@/lib/scanLookup";

// Re-showing an error for the exact same garbage/unmatched code every frame
// (it can fire many times a second) would spam toasts, so we ignore repeats
// of the same text within this window.
const REPEAT_SUPPRESS_MS = 2500;

// html5-qrcode throws if the qrbox it's given is below 50px in either
// dimension. A literal {width,height} is measured against whatever the
// camera actually negotiates (which varies by device/aspect ratio) rather
// than our container's CSS size, so a fixed literal can legitimately end up
// under 50px on some cameras. Computing it from the *actual* viewfinder size
// it hands us, with a floor well above 50, makes it correct by construction.
function qrBoxFn(viewfinderWidth: number, viewfinderHeight: number): QrDimensions {
  const size = Math.max(60, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7));
  return { width: size, height: size };
}

function barcodeBoxFn(viewfinderWidth: number, viewfinderHeight: number): QrDimensions {
  const width = Math.max(80, Math.floor(viewfinderWidth * 0.85));
  const height = Math.max(60, Math.floor(Math.min(viewfinderHeight * 0.5, width * 0.4)));
  return { width, height };
}

async function safeStop(scanner: Html5Qrcode) {
  try {
    if (!scanner.isScanning) return;
    await scanner.stop();
  } catch {
    // already stopped/never started — nothing to do
  } finally {
    try {
      scanner.clear();
    } catch {
      // ignore
    }
  }
}

function CameraScanner({
  elementId,
  label,
  formats,
  qrbox,
  minHeightClass,
  onDetect,
}: {
  elementId: string;
  label: string;
  formats: Html5QrcodeSupportedFormats[];
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => QrDimensions;
  minHeightClass: string;
  onDetect: (text: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(null);
    const scanner = new Html5Qrcode(elementId, {
      formatsToSupport: formats,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });
    let cancelled = false;

    const startPromise = scanner.start(
      { facingMode: "environment" },
      { fps: 20, qrbox, disableFlip: false },
      (decodedText) => {
        if (!cancelled) onDetectRef.current(decodedText);
      },
      () => { /* per-frame "no code found" noise, ignore */ }
    );

    startPromise
      .then(() => {
        // Cleanup ran before the camera finished starting (React's dev-mode
        // double-invoke does this reliably) — stop it now that it's safe to.
        if (cancelled) safeStop(scanner);
      })
      .catch((err) => {
        if (cancelled) return;
        setError("Camera unavailable — check permission and that you're on HTTPS (or localhost).");
        console.error(`${label} scanner failed to start:`, err);
      });

    return () => {
      cancelled = true;
      // Release the camera in the background...
      safeStop(scanner);
      // ...but wipe the DOM synchronously regardless, so a re-mount (Strict
      // Mode, or a Retry click) never sees a stale <video> from a stop()
      // that's still in flight.
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // formats/qrbox/onDetect are fixed for the lifetime of a given panel instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId, retryCount]);

  return (
    <div className="liquid-glass p-4 sm:p-6 rounded-3xl flex-1">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 text-center">{label}</p>
      {error ? (
        <div className="flex flex-col items-center text-center gap-3 py-10">
          <CameraOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div ref={containerRef} id={elementId} className={`overflow-hidden rounded-2xl bg-black ${minHeightClass}`} />
      )}
    </div>
  );
}

export default function ScanPage() {
  const router = useRouter();
  const navigatingRef = useRef(false);
  const lastSeenRef = useRef<{ text: string; at: number } | null>(null);

  const handleDetect = useCallback(
    async (decodedText: string) => {
      if (navigatingRef.current) return;

      const now = Date.now();
      if (lastSeenRef.current?.text === decodedText && now - lastSeenRef.current.at < REPEAT_SUPPRESS_MS) {
        return;
      }
      lastSeenRef.current = { text: decodedText, at: now };

      const target = parseScannedText(decodedText);
      try {
        if (target.kind === "path") {
          navigatingRef.current = true;
          router.push(target.path);
          return;
        }

        if (target.kind === "sku") {
          const productId = await ProductService.getIdBySku(target.sku);
          if (productId) {
            navigatingRef.current = true;
            router.push(`/admin/products/${productId}/edit`);
            return;
          }
          toast.error(`No product found for SKU "${target.sku}"`);
        } else {
          toast.error("Unrecognized code");
        }
      } catch (err: any) {
        toast.error("Lookup failed: " + (err?.message || "unknown error"));
      }
    },
    [router]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div>
        <h1 className="text-3xl sm:text-4xl font-display font-semibold text-foreground tracking-tight">Scan</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Scan a product's QR code or barcode to jump straight to it
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 max-w-4xl mx-auto">
        <CameraScanner
          elementId="scan-reader-qr"
          label="QR Code"
          formats={[Html5QrcodeSupportedFormats.QR_CODE]}
          qrbox={qrBoxFn}
          minHeightClass="min-h-70"
          onDetect={handleDetect}
        />
        <CameraScanner
          elementId="scan-reader-barcode"
          label="Barcode"
          formats={[Html5QrcodeSupportedFormats.CODE_128]}
          qrbox={barcodeBoxFn}
          minHeightClass="min-h-70"
          onDetect={handleDetect}
        />
      </div>
    </div>
  );
}
