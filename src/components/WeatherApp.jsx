import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getWeatherInfo } from "../utils/weatherCodes";

const DEFAULT_LOCATION = {
  name: "New York",
  country: "United States",
  admin1: "New York",
  label: "New York, United States",
  latitude: 40.7128,
  longitude: -74.006,
};

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const longDayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatTemperature(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value)}°`;
}

function buildLocationLabel(meta) {
  if (!meta) return "";
  if (meta.label) return meta.label;
  return [meta.name, meta.admin1, meta.country].filter(Boolean).join(", ");
}

const HOURS_TO_SHOW = 10;
const DAYS_TO_SHOW = 6;

function WeatherApp() {
  const [query, setQuery] = useState(DEFAULT_LOCATION.name);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [current, setCurrent] = useState(null);
  const [daily, setDaily] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchForecastForLocation = useCallback(async (targetLocation) => {
    const params = new URLSearchParams({
      latitude: targetLocation.latitude,
      longitude: targetLocation.longitude,
      timezone: "auto",
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
      daily:
        "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset",
      hourly:
        "temperature_2m,apparent_temperature,precipitation_probability,weather_code",
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Unable to retrieve forecast details right now.");
    }

    const payload = await response.json();

    if (!payload.current || !payload.daily || !payload.hourly) {
      throw new Error("Incomplete weather data received.");
    }

    const todayIndex = 0;

    const currentSnapshot = {
      time: payload.current.time,
      temperature: payload.current.temperature_2m,
      apparentTemperature: payload.current.apparent_temperature,
      humidity: payload.current.relative_humidity_2m,
      windSpeed: payload.current.wind_speed_10m,
      code: payload.current.weather_code,
      high: payload.daily.temperature_2m_max[todayIndex],
      low: payload.daily.temperature_2m_min[todayIndex],
      precipitationChance: payload.daily.precipitation_probability_max[todayIndex],
      sunrise: payload.daily.sunrise[todayIndex],
      sunset: payload.daily.sunset[todayIndex],
    };

    const dailyForecast = payload.daily.time.map((date, index) => ({
      date,
      label: dayFormatter.format(new Date(date)),
      fullLabel: longDayFormatter.format(new Date(date)),
      max: payload.daily.temperature_2m_max[index],
      min: payload.daily.temperature_2m_min[index],
      code: payload.daily.weather_code[index],
      precipitation: payload.daily.precipitation_probability_max[index],
    }));

    const currentTimeIndex = payload.hourly.time.findIndex(
      (stamp) => stamp === payload.current.time
    );
    const hoursStart = currentTimeIndex >= 0 ? currentTimeIndex : 0;

    const hourlyForecast = payload.hourly.time
      .slice(hoursStart, hoursStart + HOURS_TO_SHOW)
      .map((timestamp, offset) => ({
        time: timestamp,
        hourLabel: timeFormatter.format(new Date(timestamp)),
        temperature: payload.hourly.temperature_2m[hoursStart + offset],
        feelsLike:
          payload.hourly.apparent_temperature[hoursStart + offset] ?? null,
        precipitation:
          payload.hourly.precipitation_probability[hoursStart + offset] ?? null,
        code: payload.hourly.weather_code[hoursStart + offset],
      }));

    setLocation(targetLocation);
    setCurrent(currentSnapshot);
    setDaily(dailyForecast);
    setHourly(hourlyForecast);
    setLastUpdated(new Date().toISOString());
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        if (!isMounted) return;
        await fetchForecastForLocation(DEFAULT_LOCATION);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the initial forecast."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fetchForecastForLocation]);

  const handleSearch = useCallback(
    async (searchTerm) => {
      const trimmed = searchTerm.trim();
      if (!trimmed) {
        setError("Please enter a city or region to search.");
        return;
      }

      try {
        setError("");
        setLoading(true);

        const geoParams = new URLSearchParams({
          name: trimmed,
          count: "1",
          language: "en",
          format: "json",
        });

        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?${geoParams.toString()}`
        );

        if (!geoResponse.ok) {
          throw new Error("Unable to search for that location.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error("We couldn't find that location. Try another search.");
        }

        const match = geoData.results[0];
        const labelParts = [match.name, match.admin1, match.country].filter(
          Boolean
        );

        const nextLocation = {
          name: match.name,
          country: match.country,
          admin1: match.admin1,
          label: labelParts.join(", "),
          latitude: match.latitude,
          longitude: match.longitude,
        };

        await fetchForecastForLocation(nextLocation);
        setQuery(match.name);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while searching."
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchForecastForLocation]
  );

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location access.");
      return;
    }

    setError("");
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const reverseParams = new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            count: "1",
            language: "en",
          });

          let descriptiveLabel = "Current location";
          let namedLocation = {
            name: "Current location",
            country: "",
            admin1: "",
            label: descriptiveLabel,
            latitude,
            longitude,
          };

          try {
            const reverseResponse = await fetch(
              `https://geocoding-api.open-meteo.com/v1/reverse?${reverseParams.toString()}`
            );

            if (reverseResponse.ok) {
              const reverseData = await reverseResponse.json();
              const candidate = reverseData.results?.[0];
              if (candidate) {
                const labelParts = [
                  candidate.name,
                  candidate.admin1,
                  candidate.country,
                ].filter(Boolean);
                descriptiveLabel = labelParts.join(", ") || descriptiveLabel;
                namedLocation = {
                  name: candidate.name || "Current location",
                  country: candidate.country,
                  admin1: candidate.admin1,
                  label: descriptiveLabel,
                  latitude,
                  longitude,
                };
              }
            }
          } catch (reverseError) {
            console.warn("Reverse geocoding failed", reverseError);
          }

          await fetchForecastForLocation(namedLocation);
          setQuery(namedLocation.name);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't fetch weather for your location."
          );
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        setLoading(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            "Please allow location access to use automatic weather detection."
          );
        } else {
          setError("We couldn't access your location just now.");
        }
      }
    );
  }, [fetchForecastForLocation]);

  const themeVariant = useMemo(() => {
    if (!current) return "default";
    return getWeatherInfo(current.code).variant;
  }, [current]);

  const locationLabel = useMemo(() => buildLocationLabel(location), [location]);

  return (
    <div className={`weather-app theme-${themeVariant}`}>
      <div className="weather-app__inner">
        <header className="weather-app__header">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onUseLocation={handleUseMyLocation}
          />
          <div className="weather-app__meta">
            <span className="weather-app__meta-location">{locationLabel}</span>
            {lastUpdated && (
              <span className="weather-app__meta-updated">
                Updated {timeFormatter.format(new Date(lastUpdated))}
              </span>
            )}
          </div>
        </header>

        {error && <StatusBanner kind="error" message={error} />}
        {loading && <StatusBanner kind="loading" message="Loading weather..." />}

        {current ? (
          <main className="weather-app__content">
            <CurrentWeather
              current={current}
              locationLabel={locationLabel}
            />
            <section className="weather-app__side">
              <WeatherHighlights current={current} />
              <HourlyForecast hours={hourly} />
            </section>
          </main>
        ) : (
          !loading && (
            <div className="weather-app__placeholder">
              Enter a city to explore the forecast.
            </div>
          )
        )}

        {daily.length > 0 && (
          <ForecastList days={daily.slice(0, DAYS_TO_SHOW)} />
        )}
      </div>
    </div>
  );
}

function SearchBar({ query, onQueryChange, onSearch, onUseLocation }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(query);
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        className="search-bar__input"
        type="text"
        placeholder="Search city, region, or country"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <div className="search-bar__actions">
        <button type="submit" className="btn btn--primary">
          Search
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onUseLocation}
        >
          Use my location
        </button>
      </div>
    </form>
  );
}

function CurrentWeather({ current, locationLabel }) {
  const info = getWeatherInfo(current.code);

  return (
    <section className="current-weather card">
      <div className="current-weather__header">
        <div className="current-weather__location">{locationLabel}</div>
        <div className="current-weather__conditions">
          <span className="current-weather__icon" aria-hidden="true">
            {info.icon}
          </span>
          <div>
            <div className="current-weather__status">{info.label}</div>
            <div className="current-weather__detail">
              High {formatTemperature(current.high)} · Low {" "}
              {formatTemperature(current.low)}
            </div>
          </div>
        </div>
      </div>

      <div className="current-weather__body">
        <div className="current-weather__temperature">
          {formatTemperature(current.temperature)}
        </div>
        <div className="current-weather__metrics">
          <Metric label="Feels like" value={formatTemperature(current.apparentTemperature)} />
          <Metric label="Humidity" value={`${current.humidity}%`} />
          <Metric label="Wind" value={`${Math.round(current.windSpeed)} km/h`} />
          <Metric
            label="Chance of rain"
            value={`${current.precipitationChance ?? 0}%`}
          />
        </div>
      </div>
    </section>
  );
}

function WeatherHighlights({ current }) {
  return (
    <section className="weather-highlights card">
      <h2 className="card__title">Today's Highlights</h2>
      <div className="weather-highlights__grid">
        <Highlight
          label="Sunrise"
          value={timeFormatter.format(new Date(current.sunrise))}
          secondary="Start your day"
        />
        <Highlight
          label="Sunset"
          value={timeFormatter.format(new Date(current.sunset))}
          secondary="Golden hour"
        />
        <Highlight
          label="Feels like"
          value={formatTemperature(current.apparentTemperature)}
          secondary="Apparent temperature"
        />
        <Highlight
          label="Humidity"
          value={`${current.humidity}%`}
          secondary="Relative"
        />
        <Highlight
          label="Wind"
          value={`${Math.round(current.windSpeed)} km/h`}
          secondary="At 10 m"
        />
        <Highlight
          label="Rain chance"
          value={`${current.precipitationChance ?? 0}%`}
          secondary="Today"
        />
      </div>
    </section>
  );
}

function HourlyForecast({ hours }) {
  if (!hours || hours.length === 0) return null;

  return (
    <section className="hourly-forecast card">
      <h2 className="card__title">Next Hours</h2>
      <div className="hourly-forecast__strip">
        {hours.map((hour) => {
          const info = getWeatherInfo(hour.code);
          return (
            <div key={hour.time} className="hourly-forecast__item">
              <span className="hourly-forecast__time">{hour.hourLabel}</span>
              <span className="hourly-forecast__icon" aria-hidden="true">
                {info.icon}
              </span>
              <span className="hourly-forecast__temp">
                {formatTemperature(hour.temperature)}
              </span>
              {hour.precipitation != null && (
                <span className="hourly-forecast__precip">
                  {hour.precipitation}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ForecastList({ days }) {
  return (
    <section className="forecast card">
      <h2 className="card__title">Daily Outlook</h2>
      <div className="forecast__grid">
        {days.map((day) => {
          const info = getWeatherInfo(day.code);
          return (
            <article key={day.date} className="forecast__item">
              <span className="forecast__day" title={day.fullLabel}>
                {day.label}
              </span>
              <span className="forecast__icon" aria-hidden="true">
                {info.icon}
              </span>
              <span className="forecast__status">{info.label}</span>
              <div className="forecast__temperatures">
                <span className="forecast__temp-high">
                  {formatTemperature(day.max)}
                </span>
                <span className="forecast__temp-low">
                  {formatTemperature(day.min)}
                </span>
              </div>
              <span className="forecast__precip">
                {day.precipitation ?? 0}% chance of rain
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StatusBanner({ kind, message }) {
  return <div className={`status-banner status-banner--${kind}`}>{message}</div>;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
    </div>
  );
}

function Highlight({ label, value, secondary }) {
  return (
    <div className="highlight">
      <span className="highlight__label">{label}</span>
      <span className="highlight__value">{value}</span>
      <span className="highlight__secondary">{secondary}</span>
    </div>
  );
}

export default WeatherApp;

