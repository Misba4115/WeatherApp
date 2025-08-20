const apikey = {
  key: "18577df95b4dc61027d66c165f2b9fd5",
  base: "https://api.openweathermap.org/data/2.5/"
};

const API_BASE = "http://localhost:3000/api";
const searchInput = document.querySelector(".search-box-input");

let debounceTimeout;
let controller; // for aborting previous fetch
let currentCity = null; // Track current city for favorites

// Handle input with debounce
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  const query = searchInput.value.trim();

  debounceTimeout = setTimeout(() => {
    if (query !== "") {
      getResults(query);
    }
  }, 500); // 500ms debounce
});

// Handle Enter key for search
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    clearTimeout(debounceTimeout);
    const query = searchInput.value.trim();
    if (query !== "") {
      getResults(query);
    }
  }
});

function getResults(query) {
  // Abort previous request if still in progress
  if (controller) {
    controller.abort();
  }
  controller = new AbortController();

  const url = `${apikey.base}weather?q=${query}&units=metric&appid=${apikey.key}`;
  console.log("Fetching:", url);

  // Show loading state
  showLoadingState();

  fetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) {
        if (res.status === 404) throw new Error("City not found");
        if (res.status === 401) throw new Error("Invalid API key");
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(displayResults)
    .catch((err) => {
      if (err.name === "AbortError") {
        console.log("Previous request aborted");
      } else {
        console.error("Weather API error:", err);
        showError(err.message);
      }
    });
}

function showLoadingState() {
  document.querySelector(".city").innerText = "Loading...";
  document.querySelector(".temp").innerHTML = "--°c";
  document.querySelector(".weather").innerText = "Fetching weather data";
  document.querySelector(".hi-low").innerText = "--°c / --°c";
}

function showError(message) {
  document.querySelector(".city").innerText = "Error";
  document.querySelector(".temp").innerHTML = "--°c";
  document.querySelector(".weather").innerText = message;
  document.querySelector(".hi-low").innerText = "--°c / --°c";
  
  const card = document.querySelector(".weather-card");
  card.className = "weather-card default-weather";
}

function displayResults(weather) {
  if (!weather || !weather.main) {
    showError("Invalid data received.");
    return;
  }

  const cityName = `${weather.name}, ${weather.sys.country}`;
  currentCity = cityName;

  document.querySelector(".city").innerText = cityName;
  document.querySelector(".date").innerText = dateBuilder(new Date());
  document.querySelector(".temp").innerHTML = `${Math.round(
    weather.main.temp
  )}<span>°c</span>`;
  document.querySelector(".weather").innerText = weather.weather[0].main;
  document.querySelector(".hi-low").innerText = `${Math.round(
    weather.main.temp_min
  )}°c / ${Math.round(weather.main.temp_max)}°c`;

  // Apply weather class for background
  const weatherType = weather.weather[0].main.toLowerCase();
  const card = document.querySelector(".weather-card");
  card.className = "weather-card"; // Reset classes

  if (weatherType.includes("clear")) card.classList.add("sunny");
  else if (weatherType.includes("cloud")) card.classList.add("cloudy");
  else if (weatherType.includes("rain")) card.classList.add("rain");
  else if (weatherType.includes("snow")) card.classList.add("snow");
  else if (weatherType.includes("thunder")) card.classList.add("thunderstorm");
  else card.classList.add("default-weather");

  // Update favorite button status
  updateFavoriteButton(cityName);
}

async function updateFavoriteButton(cityName) {
  const favBtn = document.querySelector("#favorite-btn");
  if (!favBtn) return;

  try {
    // Check if city is already in favorites
    const response = await fetch(`${API_BASE}/favorites/check/${encodeURIComponent(cityName)}`);
    const data = await response.json();
    
    if (data.success) {
      if (data.isFavorite) {
        favBtn.innerHTML = "⭐";
        favBtn.title = "Remove from favorites";
        favBtn.style.color = "#ffd700";
        favBtn.onclick = () => removeFavorite(cityName);
      } else {
        favBtn.innerHTML = "☆";
        favBtn.title = "Add to favorites";
        favBtn.style.color = "#666";
        favBtn.onclick = () => addFavorite(cityName);
      }
    }
  } catch (error) {
    console.error("Error checking favorite status:", error);
    // Default to add favorite if check fails
    favBtn.innerHTML = "☆";
    favBtn.title = "Add to favorites";
    favBtn.style.color = "#666";
    favBtn.onclick = () => addFavorite(cityName);
  }
}

async function addFavorite(cityName) {
  if (!cityName) {
    showNotification("No city selected", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: cityName })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(data.message, "success");
      updateFavoriteButton(cityName); // Update button state
    } else {
      showNotification(data.error || data.message, "warning");
    }
  } catch (error) {
    console.error("Add favorite error:", error);
    showNotification("Failed to add to favorites", "error");
  }
}

async function removeFavorite(cityName) {
  if (!cityName) {
    showNotification("No city selected", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/favorites/city/${encodeURIComponent(cityName)}`, {
      method: "DELETE"
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(data.message, "success");
      updateFavoriteButton(cityName); // Update button state
    } else {
      showNotification(data.error, "error");
    }
  } catch (error) {
    console.error("Remove favorite error:", error);
    showNotification("Failed to remove from favorites", "error");
  }
}

function showNotification(message, type = "info") {
  // Remove existing notification if any
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${getNotificationColor(type)};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    font-size: 14px;
    max-width: 300px;
    animation: slideInRight 0.3s ease;
  `;

  // Add CSS animation
  if (!document.querySelector("#notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

function getNotificationColor(type) {
  switch (type) {
    case "success": return "#10b981";
    case "error": return "#ef4444";
    case "warning": return "#f59e0b";
    default: return "#3b82f6";
  }
}

async function loadFavorites() {
  try {
    const response = await fetch(`${API_BASE}/favorites`);
    const data = await response.json();
    
    if (data.success && data.favorites.length > 0) {
      console.log("Favorite cities:", data.favorites);
      // You can display favorites in a dropdown or sidebar if needed
    }
  } catch (error) {
    console.error("Error loading favorites:", error);
  }
}

function dateBuilder(d) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  const day = days[d.getDay()];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day}, ${date} ${month} ${year}`;
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  console.log("Weather App initialized");
  loadFavorites(); // Load favorites on startup
  
  // Test backend connection
  fetch(`${API_BASE}/health`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        console.log("✅ Backend connected successfully");
      }
    })
    .catch(err => {
      console.error("❌ Backend connection failed:", err);
      showNotification("Backend server not connected", "warning");
    });
});