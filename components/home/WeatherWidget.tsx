"use client";

import { useEffect, useState } from "react";

interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  code: number;
}

interface WeatherData {
  currentTemp: number;
  currentCode: number;
  days: WeatherDay[];
}

const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "⛈",
  71: "🌨", 73: "🌨", 75: "❄️",
  80: "🌦", 81: "🌧", 82: "⛈",
  95: "⛈", 96: "⛈", 99: "⛈",
};

const WMO_LABEL: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Showers", 81: "Heavy showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Severe storm",
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function emoji(code: number) { return WMO_EMOJI[code] ?? "🌡"; }
function label(code: number) { return WMO_LABEL[code] ?? "Unknown"; }

const API_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=6.2442&longitude=-75.5812" +
  "&current=temperature_2m,weather_code" +
  "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
  "&timezone=America%2FBogota&forecast_days=5";

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((d) => {
        setData({
          currentTemp: Math.round(d.current.temperature_2m),
          currentCode: d.current.weather_code,
          days: (d.daily.time as string[]).map((date: string, i: number) => ({
            date,
            maxTemp: Math.round(d.daily.temperature_2m_max[i]),
            minTemp: Math.round(d.daily.temperature_2m_min[i]),
            code: d.daily.weather_code[i],
          })),
        });
      })
      .catch(() => setErr(true));
  }, []);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        Weather — Medellín
      </p>

      {err ? (
        <p className="text-xs text-muted/50">Unable to load weather data.</p>
      ) : !data ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-raised rounded w-28" />
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-raised rounded" />)}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl leading-none">{emoji(data.currentCode)}</span>
            <div>
              <p className="text-2xl font-mono font-bold text-bright leading-none">
                {data.currentTemp}°C
              </p>
              <p className="text-[11px] text-muted mt-0.5">{label(data.currentCode)}</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {data.days.map((day, i) => {
              const d = new Date(day.date + "T12:00:00");
              const dayLabel = i === 0 ? "Today" : DAY_SHORT[d.getDay()];
              return (
                <div key={day.date} className="bg-raised rounded p-2 text-center">
                  <p className="text-[10px] font-mono text-muted mb-1">{dayLabel}</p>
                  <p className="text-xl leading-none mb-1">{emoji(day.code)}</p>
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
