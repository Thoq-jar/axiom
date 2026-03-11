import { useEffect, useState } from "preact/hooks";
import { QuickNav } from "../components/quick-nav.tsx";
import { Clock } from "../components/clock.tsx";
import { SearchBar } from "../components/search-bar.tsx";
import { WeatherWidget } from "../components/weather-widget.tsx";
import { Location } from "../utils/lib.ts";
import { SystemStats } from "../components/system-stats.tsx";
import { Icon } from "../components/ui/icon.tsx";
import { Modal } from "../components/ui/modal.tsx";

export function OverviewPage() {
  const [location, setLocation] = useState<Location | null>(() => {
    const saved = localStorage.getItem("overviewLocation");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed.latitude || !parsed.longitude) {
      localStorage.removeItem("overviewLocation");
      return null;
    }
    return parsed;
  });
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const LocationSetupModal = (
    { onDone, onClose }: {
      onDone: (location: Location) => void;
      onClose: () => void;
    },
  ) => {
    const [step, setStep] = useState<"ask" | "manual" | "loading">("ask");
    const [manualInput, setManualInput] = useState("");
    const [error, setError] = useState("");

    const tryDeviceLocation = () => {
      setStep("loading");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            );
            const data = await response.json();
            const name = data.address?.city || data.address?.town ||
              data.address?.village || data.address?.county || "Your location";
            onDone({ latitude, longitude, name });
          } catch {
            onDone({ latitude, longitude, name: "Your location" });
          }
        },
        () => {
          setStep("ask");
          setError("Location access denied. Please enter manually.");
        },
      );
    };

    const tryIPGeolocation = async () => {
      setStep("loading");
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.latitude && data.longitude) {
          onDone({
            latitude: data.latitude,
            longitude: data.longitude,
            name: data.city || "Your location",
          });
        } else {
          throw new Error("No location data returned");
        }
      } catch {
        setStep("ask");
        setError("IP geolocation failed. Please enter manually.");
      }
    };

    const tryManualEntry = async () => {
      if (!manualInput.trim()) {
        setError("Please enter a location.");
        return;
      }
      setStep("loading");
      try {
        const encodedQuery = encodeURIComponent(manualInput.trim());
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`,
        );
        const results = await response.json();
        if (results.length === 0) throw new Error("Location not found");
        const { lat, lon, display_name } = results[0];
        onDone({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          name: display_name.split(",")[0].trim(),
        });
      } catch {
        setStep("manual");
        setError("Location not found. Try a different name.");
      }
    };

    return (
      <Modal
        title="Set your location"
        icon="map-pin"
        onClose={onClose}
        class="w-105!x-w-[95vw]"
      >
        <div class="flex flex-col items-center gap-4 p-6 text-center">
          <p class="text-[0.82rem] text-(--text-secondary) leading-relaxed m-0">
            Used for weather on the overview page. Stored locally only.
          </p>

          {error && (
            <div class="text-[0.8rem] text-(--danger) bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg py-2 px-4 w-full">
              {error}
            </div>
          )}

          {step === "ask" && (
            <div class="flex flex-col gap-2 w-full mt-1">
              <button
                class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-(--accent)-[inherit] transition-all duration-200 w-full bg-[vbg-(--accent)-white hover:brightness-110"
                type="button"
                onClick={tryDeviceLocation}
              >
                <Icon name="locate" size={16} />
                Use device location
              </button>
              <button
                class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-(--accent)-[inherit] transition-all duration-200 w-full bg-(--accent-dim)-[var(--accent)] hover:bg-(--accent)r:text-white"
                type="button"
                onClick={tryIPGeolocation}
              >
                <Icon name="globe" size={16} />
                Use IP geolocation
              </button>
              <button
                class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-(--border-subtle) font-[inherit] transition-all duration-200 w-full bg-(--bg-secondary) text-(--text-secondary) hover:text-(--text-primary)"
                type="button"
                onClick={() => setStep("manual")}
              >
                <Icon name="keyboard" size={16} />
                Enter manually
              </button>
            </div>
          )}

          {step === "manual" && (
            <div class="w-full flex flex-col gap-2">
              <input
                class="w-full bg-(--bg-secondary) border border-(--border-accent) rounded-lg py-2.5 px-3.5 text-(--text-primary) font-[inherit] text-[0.85rem] outline-none transition-[border-color] duration-200 focus:border-(--accent) placeholder:text-(--text-muted)"
                type="text"
                placeholder="City name, e.g. London"
                value={manualInput}
                onInput={(event) =>
                  setManualInput((event.target as HTMLInputElement).value)}
                onKeyDown={(event) => event.key === "Enter" && tryManualEntry()}
                autoFocus
              />
              <div class="flex flex-col gap-2 w-full mt-1">
                <button
                  class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-(--accent) font-[inherit] transition-all duration-200 w-full bg-(--accent) text-white hover:brightness-110"
                  type="button"
                  onClick={tryManualEntry}
                >
                  <Icon name="search" size={16} />
                  Find location
                </button>
                <button
                  class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-(--border-subtle) font-[inherit] transition-all duration-200 w-full bg-(--bg-secondary) text-(--text-secondary) hover:text-(--text-primary)"
                  type="button"
                  onClick={() => {
                    setStep("ask");
                    setError("");
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "loading" && (
            <div class="flex items-center gap-3 text-(--text-secondary) text-[0.85rem] mt-2">
              <div
                class="w-5 h-5 border-2 border-(--border-accent) border-t-(--accent) rounded-full shrink-0"
                style={{ animation: "spin 0.7s linear infinite" }}
              />
              <span>Fetching location…</span>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  useEffect(() => {
    if (!location) setShowLocationSetup(true);
  }, []);

  const handleLocationDone = (newLocation: Location) => {
    localStorage.setItem("overviewLocation", JSON.stringify(newLocation));
    setLocation(newLocation);
    setShowLocationSetup(false);
  };

  return (
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      {showLocationSetup && (
        <LocationSetupModal
          onDone={handleLocationDone}
          onClose={() => setShowLocationSetup(false)}
        />
      )}
      <header
        class="mb-16 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-(--accent) bg-transparent rounded-lg text-2xl">
            <Icon name="home" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
              Overview
            </h1>
            <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
              Home
            </p>
          </div>
        </div>
        {location && (
          <button
            type="button"
            class="flex items-center gap-1.5 bg-(--accent-dim) border border-(--accent) text-(--accent) rounded-lg py-1.5 px-3 text-[0.78rem] font-[inherit] cursor-pointer transition-all duration-200 hover:bg-(--accent) hover:text-white"
            onClick={() => setShowLocationSetup(true)}
            title="Change location"
          >
            <Icon name="map-pin" size={14} />
            {location.name}
          </button>
        )}
      </header>

      <div class="grid grid-cols-[1fr_340px] gap-6 items-start mt-6 max-[860px]:grid-cols-1">
        <div class="flex flex-col">
          <Clock />
          <SearchBar />
          <SystemStats />
          <QuickNav />
        </div>

        <div class="flex flex-col">
          {location ? <WeatherWidget location={location} /> : (
            <div
              class="rounded-xl p-8 flex flex-col items-center gap-3 text-(--text-muted) text-center border border-(--ui-border) backdrop-blur-sm  will-change-transform"
              style={{ background: "var(--ui-bg)" }}
            >
              <Icon name="cloud" size={32} />
              <p class="text-[0.9rem]">No location set</p>
              <button
                type="button"
                class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-(--accent) font-[inherit] transition-all duration-200 w-full bg-(--accent) text-white hover:brightness-110"
                onClick={() => setShowLocationSetup(true)}
              >
                <Icon name="map-pin" size={15} />
                Set location
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
