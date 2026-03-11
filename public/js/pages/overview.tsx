import { useEffect, useRef, useState } from "preact/hooks";
import { Icon, Modal } from "../components.tsx";
import { connectWebSocket, SystemData } from "../websocket.ts";
import { formatBytes } from "../utils.ts";
import { useRouter } from "../router.tsx";

function wmoDescription(weatherCode: number): string {
  switch (true) {
    case weatherCode === 0:
      return "Clear sky";
    case weatherCode === 1:
      return "Mainly clear";
    case weatherCode === 2:
      return "Partly cloudy";
    case weatherCode === 3:
      return "Overcast";
    case weatherCode === 45 || weatherCode === 48:
      return "Fog";
    case weatherCode >= 51 && weatherCode <= 57:
      return "Drizzle";
    case weatherCode >= 61 && weatherCode <= 67:
      return "Rain";
    case weatherCode >= 71 && weatherCode <= 77:
      return "Snow";
    case weatherCode >= 80 && weatherCode <= 82:
      return "Rain showers";
    case weatherCode >= 85 && weatherCode <= 86:
      return "Snow showers";
    case weatherCode >= 95 && weatherCode <= 99:
      return "Thunderstorm";
    default:
      return "Unknown";
  }
}

function wmoIcon(weatherCode: number): string {
  switch (true) {
    case weatherCode === 0 || weatherCode === 1:
      return "sun";
    case weatherCode === 2:
      return "cloud-sun";
    case weatherCode === 3:
      return "cloud";
    case weatherCode === 45 || weatherCode === 48:
      return "cloud-fog";
    case weatherCode >= 51 && weatherCode <= 57:
      return "cloud-drizzle";
    case weatherCode >= 61 && weatherCode <= 67:
      return "cloud-rain";
    case weatherCode >= 71 && weatherCode <= 77:
      return "snowflake";
    case weatherCode >= 80 && weatherCode <= 86:
      return "cloud-rain";
    case weatherCode >= 95 && weatherCode <= 99:
      return "cloud-lightning";
    default:
      return "thermometer";
  }
}

interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

interface HourlyPoint {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitation: number;
}

interface DailyPoint {
  date: string;
  weatherCode: number;
  highTemperature: number;
  lowTemperature: number;
  precipitationSum: number;
  precipitationProbability: number;
  uvIndex: number;
}

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  uvIndex: number;
  visibility: number;
  pressure: number;
  cloudCover: number;
  precipitationProbability: number;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}

const SEARCH_ENGINES: Record<string, string> = {
  google: "https://www.google.com/search?q=%s",
  startpage: "https://www.startpage.com/search?q=%s",
};

function getSearchUrl(query: string): string {
  const engine = localStorage.getItem("searchEngine") || "google";
  const template = engine === "custom"
    ? (localStorage.getItem("customSearchUrl") || SEARCH_ENGINES.google)
    : (SEARCH_ENGINES[engine] || SEARCH_ENGINES.google);
  return template.replace("%s", encodeURIComponent(query));
}

function LocationSetupModal(
  { onDone, onClose }: {
    onDone: (location: Location) => void;
    onClose: () => void;
  },
) {
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
      class="!w-[420px] !max-w-[95vw]"
    >
      <div class="flex flex-col items-center gap-4 p-6 text-center">
        <p class="text-[0.82rem] text-[var(--text-secondary)] leading-relaxed m-0">
          Used for weather on the overview page. Stored locally only.
        </p>

        {error && (
          <div class="text-[0.8rem] text-[var(--danger)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg py-2 px-4 w-full">
            {error}
          </div>
        )}

        {step === "ask" && (
          <div class="flex flex-col gap-2 w-full mt-1">
            <button
              class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-[var(--accent)] font-[inherit] transition-all duration-200 w-full bg-[var(--accent)] text-white hover:brightness-110"
              type="button"
              onClick={tryDeviceLocation}
            >
              <Icon name="locate" size={16} />
              Use device location
            </button>
            <button
              class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-[var(--accent)] font-[inherit] transition-all duration-200 w-full bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
              type="button"
              onClick={tryIPGeolocation}
            >
              <Icon name="globe" size={16} />
              Use IP geolocation
            </button>
            <button
              class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-[var(--border-subtle)] font-[inherit] transition-all duration-200 w-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
              class="w-full bg-[var(--bg-secondary)] border border-[var(--border-accent)] rounded-lg py-2.5 px-3.5 text-[var(--text-primary)] font-[inherit] text-[0.85rem] outline-none transition-[border-color] duration-200 focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
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
                class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-[var(--accent)] font-[inherit] transition-all duration-200 w-full bg-[var(--accent)] text-white hover:brightness-110"
                type="button"
                onClick={tryManualEntry}
              >
                <Icon name="search" size={16} />
                Find location
              </button>
              <button
                class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-[var(--border-subtle)] font-[inherit] transition-all duration-200 w-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
          <div class="flex items-center gap-3 text-[var(--text-secondary)] text-[0.85rem] mt-2">
            <div
              class="w-5 h-5 border-2 border-[var(--border-accent)] border-t-[var(--accent)] rounded-full shrink-0"
              style={{ animation: "spin 0.7s linear infinite" }}
            />
            <span>Fetching location…</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

function getGreeting(hour: number): string {
  switch (true) {
    case hour < 5:
      return "Good night";
    case hour < 12:
      return "Good morning";
    case hour < 17:
      return "Good afternoon";
    case hour < 21:
      return "Good evening";
    default:
      return "Good night";
  }
}

function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const timeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const greeting = getGreeting(now.getHours());

  return (
    <div
      class="mb-6 opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.1s forwards" }}
    >
      <div class="text-[0.85rem] text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">
        {greeting}
      </div>
      <div class="text-[3.5rem] font-bold tracking-tighter text-[var(--text-primary)] tabular-nums leading-none">
        {timeString}
      </div>
      <div class="text-[0.85rem] text-[var(--text-secondary)] mt-1.5">
        {dateString}
      </div>
    </div>
  );
}

function SearchBar() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event?: Event) => {
    event?.preventDefault();
    if (!query.trim()) return;
    globalThis.open(getSearchUrl(query.trim()), "_blank", "noopener");
    setQuery("");
  };

  return (
    <div
      class="relative mb-6 opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.2s forwards" }}
    >
      <form
        class="flex items-center gap-2 border border-[var(--ui-border)] rounded-[10px] py-2.5 px-3 transition-all duration-200 [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-dim)]"
        style={{ background: "var(--ui-bg)" }}
        onSubmit={handleSubmit}
      >
        <Icon
          name="search"
          size={16}
          class="text-[var(--text-muted)] shrink-0"
        />
        <input
          ref={inputRef}
          class="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] font-[inherit] text-[0.9rem] placeholder:text-[var(--text-muted)]"
          type="text"
          placeholder="Search the web…"
          value={query}
          onInput={(event) =>
            setQuery((event.target as HTMLInputElement).value)}
          autoComplete="off"
          spellcheck={false}
        />
        {query && (
          <button
            type="button"
            class="bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-0.5 flex items-center rounded transition-all duration-200 hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </form>
    </div>
  );
}

function getWindDirectionLabel(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

function getUVLabel(uvIndex: number): string {
  switch (true) {
    case uvIndex <= 2:
      return "Low";
    case uvIndex <= 5:
      return "Moderate";
    case uvIndex <= 7:
      return "High";
    case uvIndex <= 10:
      return "Very high";
    default:
      return "Extreme";
  }
}

function getUVColor(uvIndex: number): string {
  switch (true) {
    case uvIndex <= 2:
      return "var(--success)";
    case uvIndex <= 5:
      return "var(--warning)";
    case uvIndex <= 7:
      return "#f97316";
    default:
      return "var(--danger)";
  }
}

function WeatherWidget({ location }: { location: Location }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    const { latitude, longitude } = location;
    if (!latitude || !longitude) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,windspeed_10m,winddirection_10m,uv_index,visibility,surface_pressure,cloudcover,precipitation_probability` +
        `&hourly=temperature_2m,weathercode,precipitation` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max` +
        `&wind_speed_unit=kmh&timeformat=unixtime&timezone=auto&forecast_days=7`,
    )
      .then((response) => response.json())
      .then((data) => {
        const current = data.current;
        const nowTimestamp = Math.floor(Date.now() / 1000);

        const hourlyPoints: HourlyPoint[] = [];
        for (
          let index = 0;
          index < data.hourly.time.length && hourlyPoints.length < 24;
          index++
        ) {
          if (data.hourly.time[index] >= nowTimestamp) {
            hourlyPoints.push({
              time: new Date(data.hourly.time[index] * 1000).toLocaleTimeString(
                [],
                { hour: "2-digit", minute: "2-digit" },
              ),
              temperature: Math.round(data.hourly.temperature_2m[index]),
              weatherCode: data.hourly.weathercode[index],
              precipitation: data.hourly.precipitation[index],
            });
          }
        }

        const dailyPoints: DailyPoint[] = data.daily.time.map((
          timestamp: number,
          index: number,
        ) => ({
          date: new Date(timestamp * 1000).toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          weatherCode: data.daily.weathercode[index],
          highTemperature: Math.round(data.daily.temperature_2m_max[index]),
          lowTemperature: Math.round(data.daily.temperature_2m_min[index]),
          precipitationSum: data.daily.precipitation_sum[index],
          precipitationProbability:
            data.daily.precipitation_probability_max[index],
          uvIndex: data.daily.uv_index_max[index],
        }));

        setWeather({
          temperature: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.windspeed_10m),
          windDirection: current.winddirection_10m,
          weatherCode: current.weathercode,
          uvIndex: current.uv_index ?? 0,
          visibility: Math.round((current.visibility ?? 0) / 1000),
          pressure: Math.round(current.surface_pressure ?? 0),
          cloudCover: current.cloudcover ?? 0,
          precipitationProbability: current.precipitation_probability ?? 0,
          hourly: hourlyPoints,
          daily: dailyPoints,
        });
        setIsLoading(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
  }, [location.latitude, location.longitude]);

  if (isLoading) {
    return (
      <div
        class="flex items-center gap-3 text-[var(--text-secondary)] text-[0.85rem] p-6 rounded-[14px] border border-[var(--ui-border)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform] opacity-0"
        style={{
          background: "var(--ui-bg)",
          animation: "fadeSlideIn 0.5s ease 0.15s forwards",
        }}
      >
        <div
          class="w-5 h-5 border-2 border-[var(--border-accent)] border-t-[var(--accent)] rounded-full shrink-0"
          style={{ animation: "spin 0.7s linear infinite" }}
        />
        <span>Loading weather…</span>
      </div>
    );
  }

  if (hasError || !weather) {
    return (
      <div
        class="flex items-center gap-3 text-[var(--text-secondary)] text-[0.85rem] p-6 rounded-[14px] border border-[var(--ui-border)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform] opacity-0"
        style={{
          background: "var(--ui-bg)",
          animation: "fadeSlideIn 0.5s ease 0.15s forwards",
        }}
      >
        <Icon name="cloud-off" size={20} />
        <span>Weather unavailable</span>
      </div>
    );
  }

  const minHourlyTemp = Math.min(
    ...weather.hourly.map((point) => point.temperature),
  );
  const maxHourlyTemp = Math.max(
    ...weather.hourly.map((point) => point.temperature),
  );

  const conditions = [
    {
      icon: "thermometer",
      label: "Feels like",
      value: `${weather.feelsLike}°C`,
    },
    { icon: "droplets", label: "Humidity", value: `${weather.humidity}%` },
    {
      icon: "wind",
      label: "Wind",
      value: `${weather.windSpeed} km/h ${
        getWindDirectionLabel(weather.windDirection)
      }`,
    },
    { icon: "cloud", label: "Cloud cover", value: `${weather.cloudCover}%` },
    { icon: "gauge", label: "Pressure", value: `${weather.pressure} hPa` },
    { icon: "eye", label: "Visibility", value: `${weather.visibility} km` },
    {
      icon: "umbrella",
      label: "Precip. prob.",
      value: `${weather.precipitationProbability}%`,
    },
    {
      icon: "sun",
      label: "UV Index",
      value: (
        <span style={{ color: getUVColor(weather.uvIndex) }}>
          {weather.uvIndex.toFixed(1)} — {getUVLabel(weather.uvIndex)}
        </span>
      ),
    },
  ];

  return (
    <div
      class="flex flex-col rounded-[14px] border border-[var(--ui-border)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform] opacity-0"
      style={{
        background: "var(--ui-bg)",
        animation: "fadeSlideIn 0.5s ease 0.15s forwards",
      }}
    >
      <div class="p-6 pb-4 border-b border-[var(--border-subtle)]">
        <div class="flex items-center gap-4 mb-2">
          <Icon
            name={wmoIcon(weather.weatherCode)}
            size={56}
            class="text-[var(--accent)]"
          />
          <div>
            <div class="text-[3rem] font-bold text-[var(--text-primary)] tracking-tighter tabular-nums leading-none">
              {weather.temperature}°C
            </div>
            <div class="text-[0.95rem] text-[var(--text-secondary)] mt-1">
              {wmoDescription(weather.weatherCode)}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Icon name="map-pin" size={12} />
          {location.name}
        </div>
      </div>

      <div class="grid grid-cols-2 border-b border-[var(--border-subtle)]">
        {conditions.map(({ icon, label, value }, idx) => (
          <div
            key={label}
            class={`flex items-center gap-2 py-2.5 px-5 text-[0.78rem] text-[var(--text-secondary)] ${
              idx < conditions.length - 2
                ? "border-b border-[var(--border-subtle)]"
                : ""
            } ${idx % 2 === 0 ? "border-r border-[var(--border-subtle)]" : ""}`}
          >
            <Icon name={icon} size={13} />
            <span class="flex-1 text-[var(--text-secondary)] text-[0.72rem]">
              {label}
            </span>
            <span class="font-semibold text-[var(--text-primary)] text-[0.78rem] tabular-nums text-right">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div class="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-muted)] py-3 px-5 pt-3 pb-1.5">
        <Icon name="clock" size={12} />
        Next 24 hours
      </div>
      <div
        class="weather-hourly flex overflow-x-auto py-1 px-4 pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {weather.hourly.slice(0, 12).map((point) => {
          const barHeight = maxHourlyTemp === minHourlyTemp ? 50 : Math.round(
            ((point.temperature - minHourlyTemp) /
                  (maxHourlyTemp - minHourlyTemp)) * 60 + 10,
          );
          return (
            <div
              key={point.time}
              class="flex flex-col items-center gap-0.5 min-w-[48px] px-1 shrink-0"
            >
              <span class="text-[0.65rem] text-[var(--text-muted)] whitespace-nowrap">
                {point.time}
              </span>
              <Icon
                name={wmoIcon(point.weatherCode)}
                size={14}
                class="text-[var(--accent)]"
              />
              {point.precipitation > 0 && (
                <span class="text-[0.6rem] text-[#60a5fa]">
                  {point.precipitation.toFixed(1)}
                </span>
              )}
              <div class="h-[70px] w-1.5 bg-[var(--bg-secondary)] rounded-sm flex items-end overflow-hidden my-0.5">
                <div
                  class="w-full bg-[var(--accent)] rounded-sm opacity-70 min-h-1"
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <span class="text-[0.72rem] font-semibold text-[var(--text-primary)] tabular-nums">
                {point.temperature}°
              </span>
            </div>
          );
        })}
      </div>

      <div class="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-muted)] py-3 px-5 pt-3 pb-1.5">
        <Icon name="calendar-days" size={12} />
        7-day forecast
      </div>
      <div class="flex flex-col border-t border-[var(--border-subtle)]">
        {weather.daily.map((point, index) => (
          <div
            key={point.date}
            class={`flex items-center gap-3 py-2 px-5 border-b border-[var(--border-subtle)] text-[0.8rem] last:border-b-0 ${
              index === 0 ? "bg-[var(--accent-dim)]" : ""
            }`}
          >
            <span
              class={`w-[52px] text-[0.78rem] shrink-0 ${
                index === 0
                  ? "text-[var(--accent)] font-semibold"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {index === 0 ? "Today" : point.date.split(",")[0]}
            </span>
            <Icon
              name={wmoIcon(point.weatherCode)}
              size={15}
              class="text-[var(--accent)] shrink-0"
            />
            <div class="flex-1 h-1 bg-[var(--bg-secondary)] rounded-sm overflow-hidden">
              <div
                class="h-full bg-[var(--accent)] rounded-sm opacity-70 min-w-0.5"
                title={`${point.precipitationProbability}% chance`}
                style={{ width: `${point.precipitationProbability}%` }}
              />
            </div>
            {point.precipitationProbability > 0 && (
              <span class="text-[0.68rem] text-[var(--accent)] w-[30px] text-right shrink-0">
                {point.precipitationProbability}%
              </span>
            )}
            <span class="text-[0.78rem] text-[var(--text-muted)] w-7 text-right shrink-0 tabular-nums">
              {point.lowTemperature}°
            </span>
            <span class="text-[0.78rem] font-semibold text-[var(--text-primary)] w-7 text-right shrink-0 tabular-nums">
              {point.highTemperature}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemStats() {
  const [systemData, setSystemData] = useState<SystemData>({});
  const { navigate } = useRouter();

  useEffect(() => {
    connectWebSocket((data) => {
      if (!data.error) setSystemData(data);
    });
  }, []);

  const cpuPercentage = systemData.cpu_usage_percent ?? null;
  const memoryPercentage = systemData.memory
    ? (systemData.memory.used / systemData.memory.total) * 100
    : null;
  const memoryDetail = systemData.memory
    ? `${formatBytes(systemData.memory.used)} / ${
      formatBytes(systemData.memory.total)
    }`
    : null;

  let gpuPercentage: number | null = null;
  let gpuLabel = "GPU";
  if (systemData.gpu != null) {
    if (Array.isArray(systemData.gpu) && systemData.gpu.length > 0) {
      gpuPercentage = systemData.gpu.reduce((sum, gpu) =>
        sum + gpu.utilization, 0) / systemData.gpu.length;
      gpuLabel = systemData.gpu.length > 1
        ? `${systemData.gpu.length} GPUs`
        : (systemData.gpu[0].name?.split(" ").slice(-1)[0] || "GPU");
    } else if (typeof systemData.gpu === "number") {
      gpuPercentage = systemData.gpu;
    }
  }

  function getBarColor(percentage: number | null): string {
    if (percentage == null) return "var(--accent)";
    if (percentage > 80) return "var(--danger)";
    if (percentage > 60) return "var(--warning)";
    return "var(--accent)";
  }

  function StatBlock({ icon, label, percentage, detail, targetPage }: {
    icon: string;
    label: string;
    percentage: number | null;
    detail?: string | null;
    targetPage: string;
  }) {
    const percentageString = percentage != null
      ? `${percentage.toFixed(1)}%`
      : "—";
    const barColor = getBarColor(percentage);
    return (
      <div
        class="rounded-[10px] py-3 px-4 cursor-pointer border border-[var(--ui-border)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform]"
        style={{ background: "var(--ui-bg)" }}
        onClick={() => navigate(targetPage)}
      >
        <div class="flex items-center gap-2 mb-2">
          <div class="w-[26px] h-[26px] bg-[var(--accent-dim)] rounded-md flex items-center justify-center text-[var(--accent)] shrink-0">
            <Icon name={icon} size={16} />
          </div>
          <span class="text-[0.8rem] text-[var(--text-secondary)] flex-1">
            {label}
          </span>
          <span
            class="text-[0.9rem] font-bold tabular-nums"
            style={{ color: barColor }}
          >
            {percentageString}
          </span>
        </div>
        {detail && (
          <div class="text-[0.72rem] text-[var(--text-muted)] mb-1.5 pl-8">
            {detail}
          </div>
        )}
        <div class="h-[3px] bg-[var(--bg-secondary)] rounded-sm overflow-hidden">
          <div
            class="h-full rounded-sm min-w-0.5 transition-[width] duration-400"
            style={{ width: `${percentage ?? 0}%`, background: barColor }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      class="mb-6 opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.35s forwards" }}
    >
      <div class="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">
        <Icon name="activity" size={14} />
        System
      </div>
      <div class="flex flex-col gap-2">
        <StatBlock
          icon="cpu"
          label="Processor"
          percentage={cpuPercentage}
          targetPage="cpu-details"
        />
        <StatBlock
          icon="memory-stick"
          label="Memory"
          percentage={memoryPercentage}
          detail={memoryDetail}
          targetPage="memory-details"
        />
        {gpuPercentage != null && (
          <StatBlock
            icon="monitor"
            label={gpuLabel}
            percentage={gpuPercentage}
            targetPage="monitor"
          />
        )}
      </div>
    </div>
  );
}

function QuickNav() {
  const { navigate } = useRouter();

  const navigationCards = [
    {
      targetPage: "monitor",
      icon: "line-chart",
      label: "Monitor",
      description: "Real-time system overview",
    },
    {
      targetPage: "app-store",
      icon: "package",
      label: "Apps",
      description: "Manage Docker containers",
    },
    {
      targetPage: "about",
      icon: "info",
      label: "About",
      description: "Version & license info",
    },
  ];

  return (
    <div
      class="opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.45s forwards" }}
    >
      <div class="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">
        <Icon name="layout-grid" size={14} />
        Quick access
      </div>
      <div class="flex flex-col gap-1.5">
        {navigationCards.map((card) => (
          <div
            key={card.targetPage}
            class="rounded-[10px] py-3 px-4 flex items-center gap-3 cursor-pointer border border-[var(--ui-border)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform] group"
            style={{ background: "var(--ui-bg)" }}
            onClick={() => navigate(card.targetPage)}
          >
            <div class="w-8 h-8 bg-[var(--accent-dim)] rounded-lg flex items-center justify-center text-[var(--accent)] shrink-0">
              <Icon name={card.icon} size={18} />
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-[0.85rem] font-semibold text-[var(--text-primary)]">
                {card.label}
              </span>
              <span class="text-[0.72rem] text-[var(--text-muted)]">
                {card.description}
              </span>
            </div>
            <Icon
              name="chevron-right"
              size={14}
              class="text-[var(--text-muted)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (!location) setShowLocationSetup(true);
  }, []);

  const handleLocationDone = (newLocation: Location) => {
    localStorage.setItem("overviewLocation", JSON.stringify(newLocation));
    setLocation(newLocation);
    setShowLocationSetup(false);
  };

  return (
    <div class="max-w-[1100px] mx-auto py-12 px-8 relative z-[1]">
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
          <div class="w-10 h-10 relative flex items-center justify-center text-[var(--accent)] bg-transparent rounded-lg text-2xl">
            <Icon name="home" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-[var(--text-primary)] leading-none mb-1">
              Overview
            </h1>
            <p class="text-[0.7rem] text-[var(--text-muted)] tracking-widest uppercase">
              Home
            </p>
          </div>
        </div>
        {location && (
          <button
            type="button"
            class="flex items-center gap-1.5 bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)] rounded-lg py-1.5 px-3 text-[0.78rem] font-[inherit] cursor-pointer transition-all duration-200 hover:bg-[var(--accent)] hover:text-white"
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
              class="rounded-xl p-8 flex flex-col items-center gap-3 text-[var(--text-muted)] text-center border border-[var(--ui-border)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform]"
              style={{ background: "var(--ui-bg)" }}
            >
              <Icon name="cloud" size={32} />
              <p class="text-[0.9rem]">No location set</p>
              <button
                type="button"
                class="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[10px] text-[0.95rem] font-semibold cursor-pointer border border-[var(--accent)] font-[inherit] transition-all duration-200 w-full bg-[var(--accent)] text-white hover:brightness-110"
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
