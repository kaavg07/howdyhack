
/* ---------- SETTINGS ---------- */

const UPDATE_MINUTES = 5;

const minutesAgo = m => new Date(Date.now() - m * 60000);


/* ---------- SAMPLE EVENT DATA ---------- */
// Person B will replace this with Supabase later.

const events = [
  {
    day: "Today",
    name: "Poppi",
    place: "MSC",
    time: "4:00PM - 7:00PM",
    busy: 0.2,
    start: "16:00",
    updatedAt: minutesAgo(5),
    pending: []
  },
  {
    day: "Today",
    name: "Pizza",
    place: "Zachry",
    time: "6:00PM - 7:00PM",
    busy: 0.7,
    start: "18:00",
    updatedAt: minutesAgo(12),
    pending: []
  },
  {
    day: "Tomorrow",
    name: "Donuts",
    place: "Evans Library",
    time: "9:00AM - 11:00AM",
    busy: 0.4,
    start: "09:00",
    updatedAt: minutesAgo(30),
    pending: []
  }
];

let selectedEvent = null;


/* ---------- HELPER FUNCTIONS ---------- */

function startLabel(ev) {
  return ev.time.split(" - ")[0];
}

function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTime(t) {
  let [h, m] = t.split(":").map(Number);

  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12 || 12;

  return h + ":" + String(m).padStart(2, "0") + ampm;
}


/* ---------- EVENTS LIST ---------- */

function renderEvents(list) {
  const box = document.getElementById("events-list");

  box.innerHTML = "";

  let lastDay = "";
  let selectedItem = null;

  list.forEach(ev => {

    if (ev.day !== lastDay) {
      const label = document.createElement("h3");

      label.className = "day";
      label.textContent = ev.day;

      box.appendChild(label);

      lastDay = ev.day;
    }

    const item = document.createElement("div");

    item.className = "event-item";

    item.textContent =
      ev.name + " @ " +
      ev.place +
      (ev.room ? " " + ev.room : "") +
      " at " + startLabel(ev);

    item.addEventListener("click", () => {
      selectEvent(ev, item);
    });

    box.appendChild(item);

    if (ev === selectedEvent) {
      selectedItem = item;
    }
  });

  if (selectedItem) {
    selectEvent(selectedEvent, selectedItem);
  } else {
    hidePopup();
  }
}


/* ---------- EVENT POPUP ---------- */

function selectEvent(ev, item) {
  selectedEvent = ev;

  document.querySelectorAll("#events-list .event-item")
    .forEach(i => {
      i.classList.remove("selected");
      i.style.width = "";
    });

  item.classList.add("selected");

  fillPopup(ev);

  const popup = document.getElementById("event-popup");

  popup.hidden = false;

  const wrapTop = document.querySelector(".events-wrap")
    .getBoundingClientRect().top;

  const itemRect = item.getBoundingClientRect();

  popup.style.top =
    (itemRect.top - wrapTop) + "px";

  const popupLeft = popup.getBoundingClientRect().left;

  item.style.width =
    Math.max(0, popupLeft - itemRect.left) + "px";
}


function fillPopup(ev) {
  document.getElementById("pop-name").textContent =
    ev.name;

  document.getElementById("pop-place").textContent =
    ev.room ? ev.place + " " + ev.room : ev.place;

  document.getElementById("pop-time").textContent =
    ev.time;

  document.getElementById("busy-marker").style.left =
    (ev.busy * 100) + "%";

  const next = new Date(
    ev.updatedAt.getTime() + UPDATE_MINUTES * 60000
  );

  const waiting = ev.pending.length;

  document.getElementById("pop-updated").textContent =
    "Last updated " + formatClock(ev.updatedAt) + "\n" +
    "Next update " + formatClock(next) +
    (waiting
      ? " (" + waiting + " check-in" +
        (waiting > 1 ? "s" : "") + " waiting)"
      : "");
}


function refreshPopup() {
  if (selectedEvent) {
    fillPopup(selectedEvent);
  }
}


function hidePopup() {
  selectedEvent = null;

  document.getElementById("event-popup").hidden = true;

  document.querySelectorAll("#events-list .event-item")
    .forEach(i => {
      i.classList.remove("selected");
      i.style.width = "";
    });
}


// Close popup when clicking outside
document.addEventListener("click", e => {
  const popup = document.getElementById("event-popup");

  if (popup.hidden) return;

  if (e.target.closest(
    "#event-popup, #events-list .event-item, dialog"
  )) {
    return;
  }

  hidePopup();
});


/* ---------- BUSY BAR UPDATES ---------- */

function maybeUpdate(ev) {
  const due =
    Date.now() - ev.updatedAt.getTime() >=
    UPDATE_MINUTES * 60000;

  if (due && ev.pending.length > 0) {

    const total = ev.pending.reduce(
      (sum, value) => sum + value,
      0
    );

    ev.busy = total / ev.pending.length;

    ev.pending = [];

    ev.updatedAt = new Date();

    return true;
  }

  return false;
}


// Check every 30 seconds
setInterval(() => {
  events.forEach(maybeUpdate);
  refreshPopup();
}, 30000);


/* ---------- I'M HERE CHECK-IN ---------- */

const checkinDialog =
  document.getElementById("checkin-dialog");

document.getElementById("im-here-btn")
  .addEventListener("click", () => {

    if (!selectedEvent) return;

    document.getElementById("checkin-event")
      .textContent =
      selectedEvent.name + " @ " +
      selectedEvent.place +
      (selectedEvent.room
        ? " " + selectedEvent.room
        : "");

    document.getElementById("checkin-slider").value =
      Math.round(selectedEvent.busy * 100);

    checkinDialog.showModal();
  });


document.getElementById("checkin-cancel")
  .addEventListener("click", () => {
    checkinDialog.close();
  });


document.getElementById("checkin-save")
  .addEventListener("click", () => {

    if (!selectedEvent) return;

    const value =
      Number(document.getElementById("checkin-slider").value)
      / 100;

    selectedEvent.pending.push(value);

    maybeUpdate(selectedEvent);

    fillPopup(selectedEvent);

    checkinDialog.close();
  });


/* ---------- ADD EVENT FORM ---------- */

const addDialog = document.getElementById("add-dialog");
const addBtn = document.getElementById("add-event-btn");

if (addDialog && addBtn) {

  addBtn.addEventListener("click", () => {
    addDialog.showModal();
  });

  document.getElementById("add-cancel")
    .addEventListener("click", () => {
      addDialog.close();
    });


  document.getElementById("add-save")
    .addEventListener("click", () => {

      const name =
        document.getElementById("add-name").value.trim();

      const start =
        document.getElementById("add-start").value;

      const end =
        document.getElementById("add-end").value;

      const place =
        document.getElementById("add-place").value.trim();

      const room =
        document.getElementById("add-room").value.trim();

      if (!name || !start || !end || !place) {
        alert(
          "Please fill in the name, location, " +
          "start time, and end time."
        );
        return;
      }

      // Create new event
      const newEvent = {
        day: document.getElementById("add-day").value,
        name: name,
        place: place,
        room: room,
        time: formatTime(start) + " - " + formatTime(end),
        busy: 0.1,
        type: document.getElementById("add-type").value,
        anonymous:
          document.getElementById("add-anon").checked,
        start: start,
        updatedAt: new Date(),
        pending: []
      };

      events.push(newEvent);

      // Sort events by day and start time
      const rank = {
        today: 0,
        tomorrow: 1
      };

      events.sort((a, b) => {
        const dayA = String(a.day).toLowerCase();
        const dayB = String(b.day).toLowerCase();

        return (
          (rank[dayA] ?? 2) - (rank[dayB] ?? 2) ||
          a.start.localeCompare(b.start)
        );
      });

      // Refresh events list
      renderEvents(events);

      // PHASE 7: Refresh map and Nearby
      if (window.refreshMapEvents) {
        window.refreshMapEvents();
      }

      // Clear form inputs
      document.getElementById("add-name").value = "";
      document.getElementById("add-place").value = "";
      document.getElementById("add-room").value = "";

      // Close form
      addDialog.close();
    });
}


/* ---------- START WEBSITE ---------- */

// Display event list
renderEvents(events);

// PHASE 7: Share event data with map.js
window.getMapEvents = function () {
  return events;
};
