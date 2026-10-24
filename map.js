/* ---------- CAMPUS MAP ---------- */

// Center on Texas A&M campus
const map = L.map("map").setView(
  [30.6159, -96.3410],
  15
);

// Add map background
L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }
).addTo(map);