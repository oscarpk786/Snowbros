import React, { useState } from 'react';
import { Download, ExternalLink, Laptop, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, inIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowGuide(true);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-sky-300/35 bg-[#0e2046]/90 px-4 text-sm font-semibold text-sky-200 backdrop-blur-md shadow-lg transition-colors hover:border-sky-300/70 hover:bg-[#163168] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-4 w-4 text-sky-300" />
        <span>Install on Laptop</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030816]/82 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-sky-200/25 bg-[#0b1838]/95 p-6 text-slate-100 backdrop-blur-md shadow-[0_28px_80px_rgba(0,0,0,0.85)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="pwa-install-title" className="font-display text-xl font-bold text-white">
                    Install Snow Bros on Laptop
                  </h3>
                  <p className="text-xs text-slate-400">
                    Standalone desktop app with offline play
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-200">
              {isIOS ? (
                <div className="space-y-2 rounded-xl border border-sky-200/15 bg-[#07112a] p-4">
                  <p className="font-semibold text-sky-300">iPhone / iPad (Safari)</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    <li>Tap the <strong>Share</strong> icon in Safari.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-sky-200/15 bg-[#07112a] p-4">
                  <p className="font-semibold text-sky-300">Windows / Mac Laptop (Chrome or Edge)</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    {inIframe && (
                      <li>
                        First open the game in its own browser tab using the button below.
                      </li>
                    )}
                    <li>
                      Click the <strong>Install</strong> icon in the browser address bar (or menu{' '}
                      <span className="font-mono text-xs text-sky-200">⋮ → Save &amp; share → Install Snow Bros</span>).
                    </li>
                    <li>
                      Confirm <strong>Install</strong> — the game icon will appear on your Desktop &amp; Start Menu and work offline.
                    </li>
                  </ol>
                </div>
              )}

              <div className="flex flex-col gap-2.5 sm:flex-row">
                {inIframe && (
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 font-display text-sm font-bold text-slate-950 hover:bg-sky-300 transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Standalone Tab
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-sky-200/20 bg-[#13254f] px-4 text-sm font-semibold text-slate-100 hover:bg-[#1a3269] transition-colors cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
