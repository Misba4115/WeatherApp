const apikey = {
  key: "18577df95b4dc61027d66c165f2b9fd5",
  base : 'https://api.openweathermap.org/data/2.5/'
};

const searchInput = document.querySelector('.search-box-input');
searchInput.addEventListener('keypress', setQuery);

function setQuery(e) {
  if (e.keyCode === 13) {
    getResults(searchInput.value);
  }
}

function getResults(query) {
  const url = `${apikey.base}weather?q=${query}&units=metric&appid=${apikey.key}`;
  console.log("Fetching: ",url);
  fetch(url)
    .then(res => res.json())
    .then(displayResults)
    .catch(() => alert("City not found."));
}

function displayResults(weather) {
  if (!weather || !weather.main) {
    alert("Invalid data received.");
    return;
  }

  document.querySelector('.city').innerText = `${weather.name}, ${weather.sys.country}`;
  document.querySelector('.date').innerText = dateBuilder(new Date());
  document.querySelector('.temp').innerHTML = `${Math.round(weather.main.temp)}<span>°c</span>`;
  document.querySelector('.weather').innerText = weather.weather[0].main;
  document.querySelector('.hi-low').innerText =
    `${Math.round(weather.main.temp_min)}°c / ${Math.round(weather.main.temp_max)}°c`;

  // Apply weather class for background
  const weatherType = weather.weather[0].main.toLowerCase();
  const card = document.querySelector('.weather-card');
  card.className = 'weather-card'; // Reset classes

  if (weatherType.includes("clear")) card.classList.add("sunny");
  else if (weatherType.includes("cloud")) card.classList.add("cloudy");
  else if (weatherType.includes("rain")) card.classList.add("rain");
  else if (weatherType.includes("snow")) card.classList.add("snow");
  else if (weatherType.includes("thunder")) card.classList.add("thunderstorm");
  else card.classList.add("default-weather");
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
