const apiKey = "3c562df671d42d99e50d85dd8d130319";

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const message = document.getElementById("message");
const weatherCard = document.getElementById("weatherCard");
const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");
const weatherIcon = document.getElementById("weatherIcon");
const weatherPlaceholder = document.getElementById("weatherPlaceholder");

let units = "m";
let currentQuery = "";

function setUnits(nextUnits) {
    units = nextUnits;
    const isCelsius = units === "m";

    celsiusBtn.classList.toggle("is-active", isCelsius);
    celsiusBtn.setAttribute("aria-pressed", String(isCelsius));
    fahrenheitBtn.classList.toggle("is-active", !isCelsius);
    fahrenheitBtn.setAttribute("aria-pressed", String(!isCelsius));
}

function setMessage(text, state = "info") {
    message.textContent = text;
    message.dataset.state = state;
}

function getUvDescription(index) {
    if (!Number.isFinite(index)) return "not available";
    if (index <= 2) return "low exposure";
    if (index <= 5) return "moderate exposure";
    if (index <= 7) return "high exposure";
    if (index <= 10) return "very high exposure";
    return "extreme exposure";
}

function displayWeather(data) {
    const location = data.location;
    const current = data.current;
    const temperatureUnit = units === "m" ? "°C" : "°F";
    const distanceUnit = units === "m" ? "km" : "mi";
    const windUnit = units === "m" ? "km/h" : "mph";
    const uvIndex = Number(current.uv_index);
    const condition = current.weather_descriptions?.[0] || "Conditions unavailable";

    document.getElementById("city").textContent = location.name;
    document.getElementById("region").textContent = location.region || location.name;
    document.getElementById("country").textContent = location.country;
    const temperature = document.getElementById("temperature");
    temperature.firstChild.textContent = current.temperature;
    temperature.setAttribute(
        "aria-label",
        `${current.temperature} degrees ${units === "m" ? "Celsius" : "Fahrenheit"}`
    );
    document.getElementById("description").textContent = condition;
    document.getElementById("feelsLike").textContent =
        `Feels like ${current.feelslike}${temperatureUnit}`;
    document.getElementById("humidity").textContent = `${current.humidity}%`;
    document.getElementById("wind").textContent = `${current.wind_speed} ${windUnit}`;
    document.getElementById("windDirection").textContent =
        current.wind_dir ? `from ${current.wind_dir}` : "wind speed";
    document.getElementById("visibility").textContent =
        `${current.visibility} ${distanceUnit}`;
    document.getElementById("uvIndex").textContent = current.uv_index ?? "--";
    document.getElementById("uvLabel").textContent = getUvDescription(uvIndex);
    document.getElementById("cloud").textContent = `${current.cloudcover}%`;
    document.getElementById("pressure").textContent = `${current.pressure} mb`;
    document.getElementById("localTime").textContent = `Local time ${location.localtime}`;
    document.getElementById("observationTime").textContent =
        `Observed ${current.observation_time || "recently"}`;

    const iconUrl = current.weather_icons?.[0];
    if (iconUrl) {
        weatherIcon.src = iconUrl;
        weatherIcon.alt = condition;
        weatherIcon.hidden = false;
        weatherPlaceholder.hidden = true;
    } else {
        weatherIcon.removeAttribute("src");
        weatherIcon.alt = "";
        weatherIcon.hidden = true;
        weatherPlaceholder.hidden = false;
    }

    cityInput.value = location.name;
}

async function getWeather(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
        setMessage("Enter a city or postal code to find its weather.", "error");
        cityInput.focus();
        return;
    }

    currentQuery = cleanQuery;
    searchBtn.disabled = true;
    locationBtn.disabled = true;
    celsiusBtn.disabled = true;
    fahrenheitBtn.disabled = true;
    weatherCard.setAttribute("aria-busy", "true");
    searchBtn.querySelector("span").textContent = "Loading";
    setMessage("Finding the latest conditions…");

    const params = new URLSearchParams({
        access_key: apiKey,
        query: cleanQuery,
        units
    });
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(
            `https://api.weatherstack.com/current?${params.toString()}`,
            { signal: controller.signal }
        );

        if (!response.ok) {
            throw new Error(`Weather service returned error ${response.status}.`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.info || "The weather service could not find that place.");
        }
        if (!data.location || !data.current) {
            throw new Error("The weather service returned an incomplete forecast.");
        }

        displayWeather(data);
        setMessage(`Weather updated for ${data.location.name}.`, "success");
    } catch (error) {
        console.error("Unable to load weather:", error);
        const errorMessage = error.name === "AbortError"
            ? "The request took too long. Please try again."
            : error.message || "Check your connection and try again.";
        setMessage(errorMessage, "error");
    } finally {
        window.clearTimeout(timeoutId);
        searchBtn.disabled = false;
        locationBtn.disabled = false;
        celsiusBtn.disabled = false;
        fahrenheitBtn.disabled = false;
        weatherCard.setAttribute("aria-busy", "false");
        searchBtn.querySelector("span").textContent = "Search";
    }
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    getWeather(cityInput.value);
});

locationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
        setMessage("Location services are not supported by this browser.", "error");
        return;
    }

    locationBtn.disabled = true;
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            locationBtn.disabled = false;
            getWeather(`${coords.latitude},${coords.longitude}`);
        },
        (error) => {
            locationBtn.disabled = false;
            const reason = error.code === error.PERMISSION_DENIED
                ? "Allow location access in your browser to use this feature."
                : error.code === error.TIMEOUT
                    ? "Location lookup timed out. Please try again."
                    : "Your location could not be determined. Try searching for a city.";
            setMessage(reason, "error");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
});

celsiusBtn.addEventListener("click", () => {
    if (units === "m") return;
    setUnits("m");
    if (currentQuery) getWeather(currentQuery);
});

fahrenheitBtn.addEventListener("click", () => {
    if (units === "f") return;
    setUnits("f");
    if (currentQuery) getWeather(currentQuery);
});
