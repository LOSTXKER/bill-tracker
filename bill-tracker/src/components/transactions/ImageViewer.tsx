"use client";

import { useState } from "react";
import { FileText, ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

function isPdfUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().endsWith(".pdf");
  }
}

export function ImageViewer({ urls, title }: { urls: string[]; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (!urls || urls.length === 0) return null;

  const currentUrl = typeof urls[currentIndex] === "string" ? urls[currentIndex] : String(urls[currentIndex] || "");
  const isPdf = isPdfUrl(currentUrl);

  const prev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1));
  const next = () => setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
        <div className={`relative flex items-center justify-center bg-muted/50 ${isPdf ? "aspect-[3/4]" : "aspect-video"}`}>
          {isPdf ? (
            <iframe
              src={`${currentUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
              title={`${title} ${currentIndex + 1}`}
            />
          ) : (
            <img
              src={currentUrl}
              alt={`${title} ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onClick={() => setShowFullscreen(true)}
            />
          )}

          {urls.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {urls.length > 1 && (
          <div className="flex gap-1 p-2 overflow-x-auto">
            {urls.map((url, index) => {
              const thumbUrl = typeof url === "string" ? url : String(url || "");
              const isThumbPdf = isPdfUrl(thumbUrl);
              return (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                    index === currentIndex
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {isThumbPdf ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ) : (
                    <img src={thumbUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-0.5 rounded">
          {currentIndex + 1} / {urls.length}
        </div>
      </div>

      {showFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>
          {isPdf ? (
            <iframe
              src={currentUrl}
              className="w-[90vw] h-[90vh] border-0 rounded-lg bg-background"
              title="PDF Fullscreen"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={currentUrl}
              alt="Fullscreen"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
