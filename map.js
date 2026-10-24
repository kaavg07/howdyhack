
/* ---------- PHASE 7: CAMPUS MAP + NEARBY ---------- */

// Building coordinates (Texas A&M)
// Verify these approximate coordinates in Google Maps.
// Add any additional buildings from your dropdown.

const buildingLocations = {
  "MSC": [30.6129, -96.3413],
  "Zachry": [30.6210, -96.3400],
  "Evans Library": [30.6164, -96.3398]
};

// ---------- CREATE CAMPUS MAP ----------

const map = L.map("map").setView(
  [30.6159, -96.3410],
  15
);

// Add OpenStreetMap background
L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }
).addTo(map);

// Layer to hold event markers
const eventMarkers = L.layerGroup().addTo(map);

// Store user's current location
let userLocation = null;


// ---------- GET EVENTS FROM UI.JS ----------

function getEvents() {
  if (typeof window.getMapEvents === "function") {
    return window.getMapEvents();
  }

  console.warn("Events not connected to map.js");
  return [];
}


// ---------- ADD EVENT PINS ----------

function refreshMapEvents() {

  // Remove old event markers before redrawing
  eventMarkers.clearLayers();

  const events = getEvents();
  const locatedEvents = [];

  events.forEach(ev => {

    // Use event coordinates if available,
    // otherwise look up coordinates by building.
    const coordinates =
      Number.isFinite(Number(ev.lat)) &&
      Number.isFinite(Number(ev.lng)) &&
      ev.lat != null &&
      ev.lng != null
        ? [Number(ev.lat), Number(ev.lng)]
        : buildingLocations[ev.place];

    if (!coordinates) {
      console.warn("Missing coordinates for:", ev.place);
      return;
    }

    // Save coordinates with this event
    locatedEvents.push({
      ...ev,
      lat: coordinates[0],
      lng: coordinates[1]
    });

    // Add marker
   
const maroonIcon = L.divIcon({
  className: "maroon-pin",
  html: `
    <svg width="30" height="42" viewBox="0 0 30 42">
      <path
        d="M15 1 C7 1 1 7 1 15
           C1 26 15 40 15 40
           C15 40 29 26 29 15
           C29 7 23 1 15 1Z"
        fill="#500000"
        stroke="white"
        stroke-width="2"
      />
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>
  `,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42]
});

const marker = L.marker(coordinates, {
  icon: maroonIcon
}).addTo(eventMarkers);


    // Create popup
    const popup = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = ev.name;

    const place = document.createElement("p");
    place.textContent = ev.place;

    const time = document.createElement("p");
    time.textContent = ev.time;

    popup.append(name, place, time);

    marker.bindPopup(popup);
  });

  // Update Nearby whenever events change
  updateNearby(locatedEvents);
}


// ---------- NEARBY EVENTS ----------

function updateNearby(events) {

  const nearbyBox =
    document.getElementById("nearby-list");

  nearbyBox.replaceChildren();

  // If user hasn't allowed location yet
  if (!userLocation) {
    nearbyBox.textContent =
      "Enable location to find nearby food!";
    return;
  }

  // Calculate straight-line distance in meters
  const nearbyEvents = events.map(ev => {

    const distance = map.distance(
      userLocation,
      [ev.lat, ev.lng]
    );

    return {
      ...ev,
      distance: distance
    };
  });

  // Sort closest to farthest
  nearbyEvents.sort(
    (a, b) => a.distance - b.distance
  );

  // Show up to three closest events
  const closestEvents = nearbyEvents.slice(0, 3);

  if (closestEvents.length === 0) {
    nearbyBox.textContent =
      "No nearby food events found.";
    return;
  }

  closestEvents.forEach(ev => {

    const row = document.createElement("div");
    row.className = "nearby-event";

    const name = document.createElement("strong");
    name.textContent = ev.name;

    const details = document.createElement("div");

    const distance = Math.round(ev.distance);

    details.textContent =
      
      distance + " meters away";

    row.append(name, details);
    nearbyBox.appendChild(row);
  });
}


// ---------- USER GEOLOCATION ----------

if ("geolocation" in navigator) {

  navigator.geolocation.getCurrentPosition(

    // Location successfully found
    function(position) {

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      userLocation = [userLat, userLng];

      // Add blue "You are here" marker
      L.circleMarker(userLocation, {
        radius: 10,
        color: "white",
        weight: 3,
        fillColor: "blue",
        fillOpacity: 1
      })
        .addTo(map)
        .bindPopup("You are here!");

      // Refresh Nearby with actual distances
      refreshMapEvents();
    },

    // Location request failed
    function(error) {

      console.warn(
        "Location unavailable:",
        error.message
      );

      document.getElementById("nearby-list")
        .textContent =
        "Please enable location access to see nearby events.";
    },

    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );

} else {

  document.getElementById("nearby-list")
    .textContent =
    "Your browser does not support geolocation.";
}


// ---------- CONNECT TO UI.JS ----------

// Allow ui.js to refresh map after adding events
window.refreshMapEvents = refreshMapEvents;

// Display existing event pins
refreshMapEvents();
