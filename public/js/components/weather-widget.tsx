import { useEffect, useState } from "preact/hooks";
import {
  DailyPoint,
  HourlyPoint,
  Location,
  WeatherData,
} from "../utils/lib.ts";
import { Icon } from "./ui/icon.tsx";

export const WeatherWidget = ({ location }: { location: Location }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const getWindDirectionLabel = (degrees: number): string => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[Math.round(degrees / 45) % 8];
  };

  const getUVLabel = (uvIndex: number): string => {
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
  };

  const getUVColor = (uvIndex: number): string => {
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
  };

  const wmoDescription = (weatherCode: number): string => {
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
  };

  const wmoIcon = (weatherCode: number): string => {
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
  };

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
        class="flex items-center gap-3 text-(--text-secondary) text-[0.85rem] p-6 rounded-[14px] backdrop-blur-sm will-change-transform opacity-0"
        style={{
          background: "var(--ui-bg)",
          animation: "fadeSlideIn 0.5s ease 0.15s forwards",
        }}
      >
        <div
          class="w-5 h-5 border-2 border-(--border-accent) border-t-(--accent) rounded-full shrink-0"
          style={{ animation: "spin 0.7s linear infinite" }}
        />
        <span>Loading weather…</span>
      </div>
    );
  }

  if (hasError || !weather) {
    return (
      <div
        class="flex items-center gap-3 text-(--text-secondary) text-[0.85rem] p-6 rounded-[14px] backdrop-blur-sm will-change-transform opacity-0"
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
      class="flex flex-col rounded-[14px] backdrop-blur-sm will-change-transform opacity-0"
      style={{
        background: "var(--ui-bg)",
        animation: "fadeSlideIn 0.5s ease 0.15s forwards",
      }}
    >
      <div class="p-6 pb-4">
        <div class="flex items-center gap-4 mb-2">
          <Icon
            name={wmoIcon(weather.weatherCode)}
            size={56}
            class="text-(--accent)"
          />
          <div>
            <div class="text-[3rem] font-bold text-(--text-primary) tracking-tighter tabular-nums leading-none">
              {weather.temperature}°C
            </div>
            <div class="text-[0.95rem] text-(--text-secondary) mt-1">
              {wmoDescription(weather.weatherCode)}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 text-xs text-(--text-muted)">
          <Icon name="map-pin" size={12} />
          {location.name}
        </div>
      </div>

      <div class="grid grid-cols-2">
        {conditions.map(({ icon, label, value }, _idx) => (
          <div
            key={label}
            class="flex items-center gap-2 py-2.5 px-5 text-[0.78rem] text-(--text-secondary)"
          >
            <Icon name={icon} size={13} />
            <span class="flex-1 text-(--text-secondary) text-[0.72rem]">
              {label}
            </span>
            <span class="font-semibold text-(--text-primary) text-[0.78rem] tabular-nums text-right">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div class="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.12em] text-(--text-muted) py-3 px-5 pt-3 pb-1.5">
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
              class="flex flex-col items-center gap-0.5 min-w-12 px-1 shrink-0"
            >
              <span class="text-[0.65rem] text-(--text-muted) whitespace-nowrap">
                {point.time}
              </span>
              <Icon
                name={wmoIcon(point.weatherCode)}
                size={14}
                class="text-(--accent)"
              />
              {point.precipitation > 0 && (
                <span class="text-[0.6rem] text-[#60a5fa]">
                  {point.precipitation.toFixed(1)}
                </span>
              )}
              <div class="h-17.5 w-1.5 bg-(--bg-secondary) rounded-sm flex items-end overflow-hidden my-0.5">
                <div
                  class="w-full bg-(--accent) rounded-sm opacity-70 min-h-1"
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <span class="text-[0.72rem] font-semibold text-(--text-primary) tabular-nums">
                {point.temperature}°
              </span>
            </div>
          );
        })}
      </div>

      <div class="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.12em] text-(--text-muted) py-3 px-5 pt-3 pb-1.5">
        <Icon name="calendar-days" size={12} />
        7-day forecast
      </div>
      <div class="flex flex-col">
        {weather.daily.map((point, index) => (
          <div
            key={point.date}
            class={`flex items-center gap-3 py-2 px-5 text-[0.8rem] ${
              index === 0 ? "bg-(--accent-dim)" : ""
            }`}
          >
            <span
              class={`w-13 text-[0.78rem] shrink-0 ${
                index === 0
                  ? "text-(--accent) font-semibold"
                  : "text-(--text-secondary)"
              }`}
            >
              {index === 0 ? "Today" : point.date.split(",")[0]}
            </span>
            <Icon
              name={wmoIcon(point.weatherCode)}
              size={15}
              class="text-(--accent) shrink-0"
            />
            <div class="flex-1 h-1 bg-(--bg-secondary) rounded-sm overflow-hidden">
              <div
                class="h-full bg-(--accent) rounded-sm opacity-70 min-w-0.5"
                title={`${point.precipitationProbability}% chance`}
                style={{ width: `${point.precipitationProbability}%` }}
              />
            </div>
            {point.precipitationProbability > 0 && (
              <span class="text-[0.68rem] text-(--accent) w-7.5 text-right shrink-0">
                {point.precipitationProbability}%
              </span>
            )}
            <span class="text-[0.78rem] text-(--text-muted) w-7 text-right shrink-0 tabular-nums">
              {point.lowTemperature}°
            </span>
            <span class="text-[0.78rem] font-semibold text-(--text-primary) w-7 text-right shrink-0 tabular-nums">
              {point.highTemperature}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
