// Live weather for the next boarding destination via Open-Meteo
// (free, no API key). Decorative: every failure path returns null and the
// board simply doesn't show a weather line.

export const DEST_COORDS: Record<string, { lat: number; lon: number }> = {
  DENPASAR:       { lat: -8.65,  lon: 115.22 },
  JAKARTA:        { lat: -6.2,   lon: 106.85 },
  BANGKOK:        { lat: 13.75,  lon: 100.5  },
  'KUALA LUMPUR': { lat: 3.14,   lon: 101.69 },
  'HONG KONG':    { lat: 22.3,   lon: 114.17 },
  COLOMBO:        { lat: 6.93,   lon: 79.85  },
  MILAN:          { lat: 45.46,  lon: 9.19   },
};

// WMO weather interpretation codes → short labels in the board's voice.
export function wmoLabel(code: number): string {
  if (code === 0) return 'CLEAR';
  if (code === 1) return 'MOSTLY CLEAR';
  if (code === 2) return 'PARTLY CLOUDY';
  if (code === 3) return 'OVERCAST';
  if (code === 45 || code === 48) return 'FOG';
  if (code >= 51 && code <= 57) return 'DRIZZLE';
  if (code >= 61 && code <= 67) return 'RAIN';
  if (code >= 71 && code <= 77) return 'SNOW';
  if (code >= 80 && code <= 82) return 'SHOWERS';
  if (code === 85 || code === 86) return 'SNOW';
  if (code >= 95) return 'STORM';
  return 'CLOUDY';
}

export async function fetchWeather(
  dest: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const coords = DEST_COORDS[dest];
  if (!coords) return null;
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&current=temperature_2m,weather_code`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const current = (json as { current?: { temperature_2m?: unknown; weather_code?: unknown } })
    .current;
  const temp = current?.temperature_2m;
  const code = current?.weather_code;
  if (typeof temp !== 'number' || typeof code !== 'number') return null;
  return `${Math.round(temp)}° ${wmoLabel(code)}`;
}
