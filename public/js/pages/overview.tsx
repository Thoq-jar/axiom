import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "../components.tsx";
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
  { onDone }: { onDone: (location: Location) => void },
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
    <div class="overview-location-backdrop">
      <div class="overview-location-modal">
        <div class="overview-location-icon">
          <Icon name="map-pin" size={32} />
        </div>
        <h2>Set your location</h2>
        <p>Used for weather on the overview page. Stored locally only.</p>

        {error && <div class="overview-location-error">{error}</div>}

        {step === "ask" && (
          <div class="overview-location-actions">
            <button
              class="overview-loc-btn primary"
              type="button"
              onClick={tryDeviceLocation}
            >
              <Icon name="locate" size={16} />
              Use device location
            </button>
            <button
              class="overview-loc-btn secondary"
              type="button"
              onClick={tryIPGeolocation}
            >
              <Icon name="globe" size={16} />
              Use IP geolocation
            </button>
            <button
              class="overview-loc-btn ghost"
              type="button"
              onClick={() => setStep("manual")}
            >
              <Icon name="keyboard" size={16} />
              Enter manually
            </button>
          </div>
        )}

        {step === "manual" && (
          <div class="overview-location-manual">
            <input
              class="overview-loc-input"
              type="text"
              placeholder="City name, e.g. London"
              value={manualInput}
              onInput={(event) =>
                setManualInput((event.target as HTMLInputElement).value)}
              onKeyDown={(event) => event.key === "Enter" && tryManualEntry()}
              autoFocus
            />
            <div class="overview-location-actions">
              <button
                class="overview-loc-btn primary"
                type="button"
                onClick={tryManualEntry}
              >
                <Icon name="search" size={16} />
                Find location
              </button>
              <button
                class="overview-loc-btn ghost"
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
          <div class="overview-location-loading">
            <div class="overview-spinner" />
            <span>Fetching location…</span>
          </div>
        )}
      </div>
    </div>
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
    <div class="overview-clock">
      <div class="overview-greeting">{greeting}</div>
      <div class="overview-time">{timeString}</div>
      <div class="overview-date">{dateString}</div>
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
    <div class="overview-search-wrapper">
      <form class="overview-search-bar" onSubmit={handleSubmit}>
        <Icon name="search" size={16} class="overview-search-icon" />
        <input
          ref={inputRef}
          class="overview-search-input"
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
            class="overview-search-clear"
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
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
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
      <div class="overview-weather loading">
        <div class="overview-spinner" />
        <span>Loading weather…</span>
      </div>
    );
  }

  if (hasError || !weather) {
    return (
      <div class="overview-weather error">
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
    <div class="overview-weather">
      <div class="weather-hero">
        <div class="weather-hero-main">
          <Icon
            name={wmoIcon(weather.weatherCode)}
            size={56}
            class="overview-weather-icon"
          />
          <div>
            <div class="weather-hero-temp">{weather.temperature}°C</div>
            <div class="weather-hero-desc">
              {wmoDescription(weather.weatherCode)}
            </div>
          </div>
        </div>
        <div class="weather-hero-location">
          <Icon name="map-pin" size={12} />
          {location.name}
        </div>
      </div>

      <div class="weather-conditions">
        {conditions.map(({ icon, label, value }) => (
          <div key={label} class="weather-condition-item">
            <Icon name={icon} size={13} />
            <span class="weather-condition-label">{label}</span>
            <span class="weather-condition-val">{value}</span>
          </div>
        ))}
      </div>

      <div class="weather-section-title">
        <Icon name="clock" size={12} />
        Next 24 hours
      </div>
      <div class="weather-hourly">
        {weather.hourly.slice(0, 12).map((point) => {
          const barHeight = maxHourlyTemp === minHourlyTemp ? 50 : Math.round(
            ((point.temperature - minHourlyTemp) /
                  (maxHourlyTemp - minHourlyTemp)) * 60 + 10,
          );
          return (
            <div key={point.time} class="weather-hourly-item">
              <span class="weather-hourly-time">{point.time}</span>
              <Icon
                name={wmoIcon(point.weatherCode)}
                size={14}
                class="weather-hourly-icon"
              />
              {point.precipitation > 0 && (
                <span class="weather-hourly-precip">
                  {point.precipitation.toFixed(1)}
                </span>
              )}
              <div class="weather-hourly-bar-wrap">
                <div
                  class="weather-hourly-bar"
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <span class="weather-hourly-temp">{point.temperature}°</span>
            </div>
          );
        })}
      </div>

      <div class="weather-section-title">
        <Icon name="calendar-days" size={12} />
        7-day forecast
      </div>
      <div class="weather-daily">
        {weather.daily.map((point, index) => (
          <div
            key={point.date}
            class={`weather-daily-row${index === 0 ? " today" : ""}`}
          >
            <span class="weather-daily-day">
              {index === 0 ? "Today" : point.date.split(",")[0]}
            </span>
            <Icon
              name={wmoIcon(point.weatherCode)}
              size={15}
              class="weather-daily-icon"
            />
            <div class="weather-daily-bar-wrap">
              <div
                class="weather-daily-bar"
                title={`${point.precipitationProbability}% chance`}
                style={{ width: `${point.precipitationProbability}%` }}
              />
            </div>
            {point.precipitationProbability > 0 && (
              <span class="weather-daily-precip">
                {point.precipitationProbability}%
              </span>
            )}
            <span class="weather-daily-low">{point.lowTemperature}°</span>
            <span class="weather-daily-high">{point.highTemperature}°</span>
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
        class="overview-stat-block"
        onClick={() => navigate(targetPage)}
      >
        <div class="overview-stat-block-header">
          <div class="overview-stat-block-icon">
            <Icon name={icon} size={16} />
          </div>
          <span class="overview-stat-block-label">{label}</span>
          <span class="overview-stat-block-value" style={{ color: barColor }}>
            {percentageString}
          </span>
        </div>
        {detail && <div class="overview-stat-block-sub">{detail}</div>}
        <div class="overview-stat-block-bar">
          <div
            class="overview-stat-block-fill"
            style={{ width: `${percentage ?? 0}%`, background: barColor }}
          />
        </div>
      </div>
    );
  }

  return (
    <div class="overview-stats-section">
      <div class="overview-section-title">
        <Icon name="activity" size={14} />
        System
      </div>
      <div class="overview-stat-blocks">
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
    <div class="overview-quicknav-section">
      <div class="overview-section-title">
        <Icon name="layout-grid" size={14} />
        Quick access
      </div>
      <div class="overview-quicknav-grid">
        {navigationCards.map((card) => (
          <div
            key={card.targetPage}
            class="overview-quicknav-card"
            onClick={() => navigate(card.targetPage)}
          >
            <div class="overview-quicknav-icon">
              <Icon name={card.icon} size={18} />
            </div>
            <div class="overview-quicknav-text">
              <span class="overview-quicknav-label">{card.label}</span>
              <span class="overview-quicknav-desc">{card.description}</span>
            </div>
            <Icon
              name="chevron-right"
              size={14}
              class="overview-quicknav-arrow"
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
    <div class="container">
      {showLocationSetup && <LocationSetupModal onDone={handleLocationDone} />}

      <header>
        <div class="logo">
          <div class="logo-mark">
            <Icon name="home" size={24} />
          </div>
          <div class="logo-content">
            <h1>Overview</h1>
            <p class="subtitle">Home</p>
          </div>
        </div>
        {location && (
          <button
            type="button"
            class="overview-change-loc-btn"
            onClick={() => setShowLocationSetup(true)}
            title="Change location"
          >
            <Icon name="map-pin" size={14} />
            {location.name}
          </button>
        )}
      </header>

      <div class="overview-grid">
        <div class="overview-left">
          <Clock />
          <SearchBar />
          <SystemStats />
          <QuickNav />
        </div>

        <div class="overview-right">
          {location
            ? <WeatherWidget location={location} />
            : (
              <div class="overview-weather-placeholder">
                <Icon name="cloud" size={32} />
                <p>No location set</p>
                <button
                  type="button"
                  class="overview-loc-btn primary"
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
