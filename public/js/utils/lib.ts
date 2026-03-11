export const SEARCH_ENGINES: Record<string, string> = {
  google: "https://www.google.com/search?q=%s",
  startpage: "https://www.startpage.com/search?q=%s",
};

export interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitation: number;
}

export interface DailyPoint {
  date: string;
  weatherCode: number;
  highTemperature: number;
  lowTemperature: number;
  precipitationSum: number;
  precipitationProbability: number;
  uvIndex: number;
}

export interface WeatherData {
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

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return size.toFixed(1) + " " + units[unitIndex];
}
