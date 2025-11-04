const WEATHER_CODE_MAP = {
  0: { label: "Clear sky", icon: "☀️", variant: "clear" },
  1: { label: "Mainly clear", icon: "🌤️", variant: "clear" },
  2: { label: "Partly cloudy", icon: "⛅", variant: "clouds" },
  3: { label: "Overcast", icon: "☁️", variant: "clouds" },
  45: { label: "Foggy", icon: "🌫️", variant: "mist" },
  48: { label: "Rime fog", icon: "🌫️", variant: "mist" },
  51: { label: "Light drizzle", icon: "🌦️", variant: "rain" },
  53: { label: "Drizzle", icon: "🌦️", variant: "rain" },
  55: { label: "Heavy drizzle", icon: "🌧️", variant: "rain" },
  56: { label: "Freezing drizzle", icon: "🌧️", variant: "snow" },
  57: { label: "Freezing drizzle", icon: "🌧️", variant: "snow" },
  61: { label: "Light rain", icon: "🌧️", variant: "rain" },
  63: { label: "Rain", icon: "🌧️", variant: "rain" },
  65: { label: "Heavy rain", icon: "🌧️", variant: "rain" },
  66: { label: "Freezing rain", icon: "🌨️", variant: "snow" },
  67: { label: "Freezing rain", icon: "🌨️", variant: "snow" },
  71: { label: "Light snow", icon: "🌨️", variant: "snow" },
  73: { label: "Snow", icon: "🌨️", variant: "snow" },
  75: { label: "Heavy snow", icon: "❄️", variant: "snow" },
  77: { label: "Snow grains", icon: "❄️", variant: "snow" },
  80: { label: "Light showers", icon: "🌦️", variant: "rain" },
  81: { label: "Showers", icon: "🌧️", variant: "rain" },
  82: { label: "Heavy showers", icon: "🌧️", variant: "rain" },
  85: { label: "Snow showers", icon: "🌨️", variant: "snow" },
  86: { label: "Heavy snow showers", icon: "❄️", variant: "snow" },
  95: { label: "Thunderstorm", icon: "⛈️", variant: "thunder" },
  96: { label: "Thunder w/ hail", icon: "⛈️", variant: "thunder" },
  99: { label: "Severe thunder", icon: "⛈️", variant: "thunder" },
};

const DEFAULT_INFO = {
  label: "Unknown",
  icon: "❔",
  variant: "default",
};

export function getWeatherInfo(code) {
  return WEATHER_CODE_MAP[code] || DEFAULT_INFO;
}

export function getThemeVariant(code) {
  return getWeatherInfo(code).variant;
}

export { WEATHER_CODE_MAP };

