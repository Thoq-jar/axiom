import { useState } from "preact/hooks";
import { Icon } from "../components/ui/icon.tsx";
import { Button } from "../components/ui/button.tsx";
import { Modal } from "../components/ui/modal.tsx";

export const AboutPage = () => {
  const [license, setLicense] = useState<string | null>(null);
  const [showLicense, setShowLicense] = useState(false);
  const [loadingLicense, setLoadingLicense] = useState(false);

  const handleViewLicense = async () => {
    if (license) {
      setShowLicense(true);
      return;
    }
    setLoadingLicense(true);
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/Thoq-jar/axiom/refs/heads/main/LICENSE",
      );
      const text = await res.text();
      setLicense(text);
      setShowLicense(true);
    } catch {
      setLicense("Failed to load license.");
      setShowLicense(true);
    } finally {
      setLoadingLicense(false);
    }
  };

  return (
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      <header
        class="mb-16 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-(--accent) bg-transparent rounded-lg text-2xl">
            <Icon name="box" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
              AxiomOS
            </h1>
            <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
              Server [OSS]
            </p>
          </div>
        </div>
      </header>

      <div
        class="about-container max-w-150 mx-auto opacity-0"
        style={{ animation: "fadeSlideIn 0.6s ease 0.2s forwards" }}
      >
        <h2
          class="about-title mb-4 text-2xl opacity-0"
          style={{ animation: "fadeSlideIn 0.5s ease 0.3s forwards" }}
        >
          About
        </h2>
        <p
          class="about-text text-(--text-secondary) leading-relaxed mb-4 opacity-0"
          style={{ animation: "fadeSlideIn 0.5s ease 0.4s forwards" }}
        >
          AxiomOS is an open-source system monitoring server built with modern
          web technologies.
        </p>
        <p
          class="about-text text-(--text-secondary) leading-relaxed mb-4 opacity-0"
          style={{ animation: "fadeSlideIn 0.5s ease 0.5s forwards" }}
        >
          Monitor your system resources in real-time with WebSocket streaming.
        </p>
        <div
          class="about-footer mt-8 pt-8 opacity-0"
          style={{ animation: "fadeSlideIn 0.5s ease 0.6s forwards" }}
        >
          <p class="text-(--text-muted) text-[0.85rem]">(c) 2025-2026 Thoq</p>
          <Button
            onClick={handleViewLicense}
            disabled={loadingLicense}
            class="mt-3 flex items-center gap-2 py-2 px-3 rounded-lg text-[0.82rem] font-semibold cursor-pointer bg-[rgba(var(--accent-rgb),0.1)] text-(--accent) transition-all duration-200 hover:bg-(--accent) hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="scroll" size={14} />
            {loadingLicense ? "Loading..." : "View License"}
          </Button>
        </div>
      </div>

      {showLicense && (
        <Modal
          title="License"
          icon="scroll"
          onClose={() => setShowLicense(false)}
          class="w-[90%]! max-w-160! h-[70vh]!"
        >
          <pre class="p-6 overflow-y-auto text-xs text-(--text-secondary) whitespace-pre-wrap wrap-break-word leading-[1.7] flex-1 min-h-0">{license}</pre>
        </Modal>
      )}
    </div>
  );
};
