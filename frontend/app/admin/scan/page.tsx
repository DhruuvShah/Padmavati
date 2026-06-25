"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { QrDimensions } from "html5-qrcode/esm/core";
import { toast } from "sonner";
import { ArrowLeft, CameraOff, QrCode, ScanBarcode, TriangleAlert } from "lucide-react";
import { ProductService } from "@/services/product.service";
import { parseScannedText } from "@/lib/scanLookup";

type Mode = "choose" | "qr" | "barcode";

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

const READER_ELEMENT_ID = "scan-reader";

function CameraScanner({
  formats,
  qrbox,
  onDetect,
}: {
  formats: Html5QrcodeSupportedFormats[];
  // Omitted entirely for barcode scanning -- a Code128 barcode is wide and
  // horizontal, so constraining the scan region to a small box means the
  // user has to align it precisely inside that box. Without a qrbox,
  // html5-qrcode searches the whole frame instead.
  qrbox?: (viewfinderWidth: number, viewfinderHeight: number) => QrDimensions;
  onDetect: (text: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(null);
    // Prefer the native browser BarcodeDetector API when available (Android
    // Chrome/Edge — hardware/OS-accelerated, no try-harder limitation) and
    // fall back to the bundled zxing-js decoder otherwise (e.g. iOS Safari,
    // which has no native BarcodeDetector at all). html5-qrcode's own zxing
    // wrapper hardcodes TRY_HARDER=false with no way to override it through
    // the public API, which is fine for QR (redundant finder patterns make
    // it decodable on one quick pass) but hurts a 1D barcode the moment it's
    // slightly rotated or skewed — so for Code128 in particular, getting the
    // native decoder in the loop matters far more than for QR.
    const scanner = new Html5Qrcode(READER_ELEMENT_ID, {
      formatsToSupport: formats,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });
    let cancelled = false;

    const startPromise = scanner.start(
      {
        facingMode: "environment",
      },
      {
        fps: 10,
        qrbox,
        disableFlip: false,
        // Passing videoConstraints requests the sharpest feed the camera
        // can give us. More pixels per bar is the other big lever for
        // decoding thin 1D bars reliably, especially since try-harder isn't
        // available as a fallback for the zxing path.
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
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
        console.error("Scanner failed to start:", err);
      });

    return () => {
      cancelled = true;
      // Release the camera in the background...
      safeStop(scanner);
      // ...but wipe the DOM synchronously regardless, so a re-mount (Strict
      // Mode, switching modes, or a Retry click) never sees a stale <video>
      // from a stop() that's still in flight.
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // formats/qrbox/onDetect are fixed for the lifetime of a given mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  if (error) {
    return (
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
    );
  }

  return <div ref={containerRef} id={READER_ELEMENT_ID} className="overflow-hidden rounded-2xl bg-black min-h-70" />;
}

export default function ScanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
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

      <div
        className={
          mode === "choose"
            ? "liquid-glass p-6 sm:p-8 rounded-3xl max-w-xl mx-auto"
            // html5-qrcode sizes its decode canvas directly off this box's
            // on-screen CSS width (not the camera's actual resolution), so a
            // wider box with less padding eaten away is a straight increase
            // in how many pixels each barcode bar gets to decode from --
            // this matters far more for 1D barcodes than for QR.
            : "liquid-glass p-2 sm:p-3 rounded-3xl max-w-3xl mx-auto"
        }
      >
        {mode === "choose" ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode("qr")}
              className="flex flex-col items-center gap-3 p-8 rounded-2xl liquid-glass hover:bg-white/40 transition cursor-pointer focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
            >
              <QrCode className="h-10 w-10 text-primary" />
              <span className="text-sm font-semibold text-foreground">QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("barcode")}
              className="flex flex-col items-center gap-3 p-8 rounded-2xl liquid-glass hover:bg-white/40 transition cursor-pointer focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
            >
              <ScanBarcode className="h-10 w-10 text-primary" />
              <span className="text-sm font-semibold text-foreground">Barcode</span>
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4" /> Choose differently
            </button>
            {mode === "qr" ? (
              <CameraScanner formats={[Html5QrcodeSupportedFormats.QR_CODE]} qrbox={qrBoxFn} onDetect={handleDetect} />
            ) : (
              // Phone-camera scanning of 1D barcodes is unreliable industry-wide
              // (that's why real stores use a dedicated scanner gun, not a phone)
              // -- rather than keep fighting that physics, disable it here and
              // point people at the hardware that's actually built for this job.
              <div className="flex flex-col items-center text-center gap-3 py-10 px-4">
                <TriangleAlert className="h-8 w-8 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">Barcode scanning is disabled</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Phone cameras aren't reliable at reading barcodes — that's true everywhere, not just here, which is
                  why real stores use a dedicated laser/CCD barcode scanner instead of a phone. Get a USB or Bluetooth
                  barcode scanner gun (~₹1,500–3,000) and it will read this exact barcode instantly, every time.
                </p>
                <p className="text-xs text-muted-foreground">For phone scanning, use QR Code instead.</p>
                <button
                  type="button"
                  onClick={() => setMode("qr")}
                  className="mt-1 text-xs font-semibold text-primary hover:underline"
                >
                  Switch to QR Code
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
