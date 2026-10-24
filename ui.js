// ---------- settings ----------
const UPDATE_MINUTES = 5;   // bar updates this often. Set to 1 while testing!

const minutesAgo = m => new Date(Date.now() - m * 60000);

// ---------- fake data (Person B replaces this with Supabase later) ----------
// busy = current bar position (0 to 1), updatedAt = when the bar last changed,
// pending = check-ins waiting for the next update
const events = [
  { day: "today",    name: "Poppi",  place: "MSC",           time: "4:00PM - 7:00PM",  busy: 0.2, start: "16:00", updatedAt: minutesAgo(5),  pending: [] },
  { day: "today",    name: "Pizza",  place: "Zachry",        time: "6:00PM - 7:00PM",  busy: 0.7, start: "18:00", updatedAt: minutesAgo(12), pending: [] },
  { day: "tomorrow", name: "Donuts", place: "Evans Library", time: "9:00AM - 11:00AM", busy: 0.4, start: "09:00", updatedAt: minutesAgo(30), pending: [] },
];

let selectedEvent = null;

// ---------- small helpers ----------
function startLabel(ev) {
  return ev.time.split(" - ")[0];            // "4:00PM - 7:00PM" becomes "4:00PM"
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ---------- events list ----------
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
    item.textContent = ev.name + " @ " + ev.place + " at " + startLabel(ev);
    item.addEventListener("click", () => selectEvent(ev, item));
    box.appendChild(item);

    if (ev === selectedEvent) selectedItem = item;
  });

  // keep the popup open on the same event after the list redraws
  if (selectedItem) selectEvent(selectedEvent, selectedItem);
  else hidePopup();
}

// ---------- popup ----------
function selectEvent(ev, item) {
  selectedEvent = ev;

  document.querySelectorAll(".event-item").forEach(i => {
    i.classList.remove("selected");
    i.style.width = "";
  });
  item.classList.add("selected");

  fillPopup(ev);

  const popup = document.getElementById("event-popup");
  popup.hidden = false;

  // line the popup's top up with the selected row, and stretch the row to meet it
  const wrapTop  = document.querySelector(".events-wrap").getBoundingClientRect().top;
  const itemRect = item.getBoundingClientRect();
  popup.style.top = (itemRect.top - wrapTop) + "px";

  const popupLeft = popup.getBoundingClientRect().left;
  item.style.width = (popupLeft - itemRect.left) + "px";
}

function fillPopup(ev) {
  document.getElementById("pop-name").textContent  = ev.name;
    document.getElementById("pop-place").textContent =
    ev.room ? ev.place + " " + ev.room : ev.place;
  document.getElementById("pop-time").textContent  = ev.time;
  document.getElementById("busy-marker").style.left = (ev.busy * 100) + "%";

  const next = new Date(ev.updatedAt.getTime() + UPDATE_MINUTES * 60000);
  const waiting = ev.pending.length;
  document.getElementById("pop-updated").textContent =
    "Last updated " + formatClock(ev.updatedAt) + "\n" +
    "Next update " + formatClock(next) +
    (waiting ? " (" + waiting + " check-in" + (waiting > 1 ? "s" : "") + " waiting)" : "");
}

function refreshPopup() {
  if (selectedEvent) fillPopup(selectedEvent);
}

function hidePopup() {
  selectedEvent = null;
  document.getElementById("event-popup").hidden = true;
  document.querySelectorAll(".event-item").forEach(i => {
    i.classList.remove("selected");
    i.style.width = "";
  });
}

// close the popup when clicking anywhere outside it
document.addEventListener("click", e => {
  if (document.getElementById("event-popup").hidden) return;
  if (e.target.closest("#event-popup, .event-item, dialog")) return;
  hidePopup();
});

// ---------- busy bar: average of check-ins every UPDATE_MINUTES ----------
function maybeUpdate(ev) {
  const due = Date.now() - ev.updatedAt.getTime() >= UPDATE_MINUTES * 60000;
  if (due && ev.pending.length > 0) {
    const total = ev.pending.reduce((sum, v) => sum + v, 0);
    ev.busy = total / ev.pending.length;     // the average
    ev.pending = [];
    ev.updatedAt = new Date();
    return true;
  }
  return false;
}

// every 30 seconds, see if any event is due for an update
setInterval(() => {
  events.forEach(maybeUpdate);
  refreshPopup();
}, 30000);

// ---------- "I'm Here!" check-in ----------
const checkinDialog = document.getElementById("checkin-dialog");

document.getElementById("im-here-btn").addEventListener("click", () => {
  if (!selectedEvent) return;
  document.getElementById("checkin-event").textContent =
    selectedEvent.name + " @ " + selectedEvent.place;
  document.getElementById("checkin-slider").value = Math.round(selectedEvent.busy * 100);
  checkinDialog.showModal();
});

document.getElementById("checkin-cancel").addEventListener("click", () => checkinDialog.close());

document.getElementById("checkin-save").addEventListener("click", () => {
  const value = Number(document.getElementById("checkin-slider").value) / 100;
  selectedEvent.pending.push(value);         // save this check-in
  maybeUpdate(selectedEvent);                // update right away if 20+ minutes have passed
  fillPopup(selectedEvent);
  checkinDialog.close();
});

// ---------- nearby box ----------
function renderNearby(list) {
  const box = document.getElementById("nearby-list");
  box.innerHTML = "";
  list.slice(0, 2).forEach(ev => {
    const row = document.createElement("div");
    row.textContent = ev.name + " @ " + ev.place + " at " + startLabel(ev);
    box.appendChild(row);
  });
}

// ---------- add event form (only runs if the form exists in index.html) ----------
const addDialog = document.getElementById("add-dialog");
const addBtn = document.getElementById("add-event-btn");

if (addDialog && addBtn) {
  addBtn.addEventListener("click", () => addDialog.showModal());
  document.getElementById("add-cancel").addEventListener("click", () => addDialog.close());
      // show the "type it in" box only when "Other" is picked
 
  function formatTime(t) {
    let [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + String(m).padStart(2, "0") + ampm;
  }

  document.getElementById("add-save").addEventListener("click", () => {
  const name  = document.getElementById("add-name").value.trim();
  const start = document.getElementById("add-start").value;
  const end   = document.getElementById("add-end").value;

    const place = document.getElementById("add-place").value.trim();
  const room  = document.getElementById("add-room").value.trim();

  if (!name || !start || !end || !place) {
    alert("Please fill in the name, location, start time, and end time.");
    return;
  }

    events.push({
      day: document.getElementById("add-day").value,
      name: name,
      place: place,
      room: room,
      time: formatTime(start) + " - " + formatTime(end),
      busy: 0.1,
      type: document.getElementById("add-type").value,
      anonymous: document.getElementById("add-anon").checked,
      start: start,
      updatedAt: new Date(),
      pending: [],
    });

    const rank = { today: 0, tomorrow: 1 };
    events.sort((a, b) =>
      (rank[a.day] ?? 2) - (rank[b.day] ?? 2) || a.start.localeCompare(b.start)
    );

    renderEvents(events);
    renderNearby(events);
       document.getElementById("add-name").value = "";
    document.getElementById("add-place").value = "";
    document.getElementById("add-room").value = "";
    addDialog.close();
  });
}

// ---------- start ----------
renderEvents(events);
renderNearby(events);