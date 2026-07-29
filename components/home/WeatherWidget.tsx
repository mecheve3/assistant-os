"use client";

import { useEffect, useState } from "react";

interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  code: number;
}

interface HourlySlot {
  time: string;
  temp: number;
  code: number;
  precip: number;
}

interface WeatherData {
  currentTemp: number;
  currentCode: number;
  days: WeatherDay[];
  hourly: HourlySlot[];
}

const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌧",
  56: "🌧", 57: "🌧",
  61: "🌧", 63: "🌧", 65: "⛈",
  66: "🌧", 67: "⛈",
  71: "🌨", 73: "🌨", 75: "❄️", 77: "🌨",
  80: "🌦", 81: "🌧", 82: "⛈",
  85: "🌨", 86: "❄️",
  95: "⛈", 96: "⛈", 99: "⛈",
};

const WMO_LABEL: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  56: "Freezing drizzle", 57: "Heavy freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Showers", 81: "Heavy showers", 82: "Violent showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Severe storm",
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weatherEmoji(code: number) {
  return WMO_EMOJI[Math.round(code)] ?? "🌡";
}
function weatherLabel(code: number) {
  return WMO_LABEL[Math.round(code)] ?? "Unknown";
}

// El Poblado, Medellín
const API_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=6.2087&longitude=-75.5679" +
  "&current=temperature_2m,weather_code" +
  "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
  "&hourly=temperature_2m,weather_code,precipitation_probability" +
  "&timezone=America%2FBogota&forecast_days=5";

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((d) => {
        // Current Bogota time string matching API format "YYYY-MM-DDTHH:MM"
        const bogotaNow = new Date()
          .toLocaleString("sv-SE", { timeZone: "America/Bogota" })
          .replace(" ", "T")
          .slice(0, 16);

        const hourlyTimes = d.hourly.time as string[];
        const hourlyTemps = d.hourly.temperature_2m as number[];
        const hourlyCodes = d.hourly.weather_code as number[];
        const hourlyPrecip = d.hourly.precipitation_probability as number[];

        const startIdx = Math.max(
          0,
          hourlyTimes.findIndex((t) => t >= bogotaNow)
        );

        const hourly: HourlySlot[] = hourlyTimes
          .slice(startIdx, startIdx + 12)
          .map((time, i) => ({
            time,
            temp: Math.round(hourlyTemps[startIdx + i]),
            code: hourlyCodes[startIdx + i],
            precip: hourlyPrecip[startIdx + i] ?? 0,
          }));

        setData({
          currentTemp: Math.round(d.current.temperature_2m),
          currentCode: d.current.weather_code,
          days: (d.daily.time as string[]).map((date: string, i: number) => ({
            date,
            maxTemp: Math.round(d.daily.temperature_2m_max[i]),
            minTemp: Math.round(d.daily.temperature_2m_min[i]),
            code: d.daily.weather_code[i],
          })),
          hourly,
        });
      })
      .catch(() => setErr(true));
  }, []);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        Weather — El Poblado
      </p>

      {err ? (
        <p className="text-xs text-muted/50">Unable to load weather data.</p>
      ) : !data ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-raised rounded w-28" />
          <div className="flex gap-1.5 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-raised rounded w-10 shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-raised rounded" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Current conditions */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl leading-none">
              {weatherEmoji(data.currentCode)}
            </span>
            <div>
              <p className="text-2xl font-mono font-bold text-bright leading-none">
                {data.currentTemp}°C
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {weatherLabel(data.currentCode)}
              </p>
            </div>
          </div>

          {/* Hourly strip — next 12 hours */}
          <div className="overflow-x-auto scrollbar-none -mx-1 mb-4">
            <div className="flex gap-1.5 px-1 min-w-max">
              {data.hourly.map((slot, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-0.5 min-w-[42px] bg-raised rounded px-1 py-1.5"
                >
                  <p className="text-[9px] font-mono text-muted leading-none">
                    {slot.time.slice(11, 16)}
                  </p>
                  <p className="text-sm leading-none my-0.5">
                    {weatherEmoji(slot.code)}
                  </p>
                  <p className="text-[10px] font-mono text-bright leading-none">
                    {slot.temp}°
                  </p>
                  {slot.precip > 0 && (
                    <p className="text-[8px] font-mono text-info leading-none">
                      {slot.precip}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5-day forecast */}
          <div className="grid grid-cols-5 gap-2">
            {data.days.map((day, i) => {
              const d = new Date(day.date + "T12:00:00");
              const dayLabel = i === 0 ? "Today" : DAY_SHORT[d.getDay()];
              return (
                <div key={day.date} className="bg-raised rounded p-2 text-center">
                  <p className="text-[10px] font-mono text-muted mb-1">{dayLabel}</p>
                  <p className="text-xl leading-none mb-1">{weatherEmoji(day.code)}</p>
                  <p className="text-xs font-mono text-bright">{day.maxTemp}°</p>
                  <p className="text-[10px] font-mono text-muted">{day.minTemp}°</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
