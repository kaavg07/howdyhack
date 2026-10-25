// settings
const UPDATE_MINUTES = 1;   //updates every time a new rating is added but we'll change this to like 10 min if this actually becomes an app


const minutesAgo = m => new Date(Date.now() - m * 60000);

// ---------- button click animation ----------
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  btn.classList.remove("pressed");
  void btn.offsetWidth;                         // restarts the animation on quick repeat clicks
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 300);
});

// fake data
// busy is current bar position (0 to 1), updatedAt is when the bar last changed,
// pending is check-ins waiting for the next update
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
// ---------- day names: ignore capitals, keep today before tomorrow ----------
function dayKey(ev) {
  return ev.day.toLowerCase();
}

function sortEvents() {
  const rank = { today: 0, tomorrow: 1 };
  events.sort((a, b) =>
    (rank[dayKey(a)] ?? 2) - (rank[dayKey(b)] ?? 2) || a.start.localeCompare(b.start)
  );
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
            if (dayKey(ev) !== lastDay) {
      const label = document.createElement("h3");

      label.className = "day";
      label.textContent = dayKey(ev);

      box.appendChild(label);

      lastDay = dayKey(ev);
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

    if (window.openEventChat) {
    window.openEventChat(ev);
  }

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

// reads "04:30" plus AM/PM and returns 24-hour "16:30", or null if it isn't complete
function parseTypedTime(text, ampm) {
  const match = text.trim().match(/^(0[1-9]|1[0-2]):([0-5]\d)$/);
  if (!match) return null;

  let h = Number(match[1]) % 12;               // 12 becomes 0
  if (ampm === "PM") h += 12;
  return String(h).padStart(2, "0") + ":" + match[2];
}

// ---------- time boxes: only allow a valid 12-hour time as you type ----------
function maskTime(raw) {
  const digits = raw.replace(/\D/g, "");
  let out = "";

  for (const d of digits) {
    const pos = out.replace(":", "").length;     // digits already in the box

    if (pos === 0) {                             // 1st digit
      if (d === "0" || d === "1") out += d;
      else if (/[2-9]/.test(d)) out += "0" + d + ":";   // typing 4 becomes 04:
      continue;
    }
    if (pos === 1) {                             // 2nd digit
      if (out[0] === "0" && !/[1-9]/.test(d)) continue;   // 01-09 only
      if (out[0] === "1" && !/[0-2]/.test(d)) continue;   // 10-12 only
      out += d + ":";                            // colon appears by itself
      continue;
    }
    if (pos === 2) {                             // 3rd digit: 0-5
      if (!/[0-5]/.test(d)) continue;
      out += d;
      continue;
    }
    if (pos === 3) {                             // 4th digit: 0-9
      out += d;
      continue;
    }
    break;
  }
  return out;
}

["add-start", "add-end"].forEach(id => {
  const box = document.getElementById(id);
  if (!box) return;

  box.addEventListener("input", e => {
    let v = maskTime(box.value);
    // let backspace remove the colon instead of re-adding it
    if (e.inputType && e.inputType.startsWith("delete") && v.endsWith(":")) {
      v = v.slice(0, -1);
    }
    box.value = v;
  });
});

if (addDialog && addBtn) {
  addBtn.addEventListener("click", () => addDialog.showModal());
  document.getElementById("add-cancel").addEventListener("click", () => addDialog.close());

  document.getElementById("add-save").addEventListener("click", () => {
    const name  = document.getElementById("add-name").value.trim();
    const start = parseTypedTime(document.getElementById("add-start").value,
                                 document.getElementById("add-start-ampm").value);
    const end   = parseTypedTime(document.getElementById("add-end").value,
                                 document.getElementById("add-end-ampm").value);
    const place = document.getElementById("add-place").value.trim();
    const room  = document.getElementById("add-room").value.trim();

    if (!name || !start || !end || !place) {
      alert("Please fill in the name, location, and a start and end time like 4:00.");
      return;
    }

    events.push({
      id: crypto.randomUUID(),
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
      pending: []
    });

    sortEvents();
    renderEvents(events);
    if (window.updateChatEventDropdown) {
  window.updateChatEventDropdown();
}

    // redraw the map pins and Nearby (C's map code)
    if (window.refreshMapEvents) {
      window.refreshMapEvents();
    }

    document.getElementById("add-start").value = "";
    document.getElementById("add-end").value = "";
    document.getElementById("add-name").value = "";
    document.getElementById("add-place").value = "";
    document.getElementById("add-room").value = "";
    addDialog.close();
  });
}


/* ---------- PROFILE ---------- */

const profileDialog = document.getElementById("profile-dialog");

// local stand-in until B's Supabase profiles table exists
let profile = { name: "", email: "", phone: "", isOrg: false };

document.getElementById("profile-btn").addEventListener("click", () => {
  document.getElementById("profile-name").value  = profile.name;
  document.getElementById("profile-email").value = profile.email;
  document.getElementById("profile-phone").value = profile.phone;
  document.getElementById("profile-org").checked = profile.isOrg;

  profileDialog.showModal();
});

document.getElementById("profile-cancel").addEventListener("click", () => {
  profileDialog.close();
});

document.getElementById("profile-save").addEventListener("click", () => {
  profile = {
    name:  document.getElementById("profile-name").value.trim(),
    email: document.getElementById("profile-email").value.trim(),
    phone: document.getElementById("profile-phone").value.trim(),
    isOrg: document.getElementById("profile-org").checked
  };

  profileDialog.close();
});

/* ---------- NOTIFICATION SETTINGS ---------- */

const notifDialog = document.getElementById("notif-dialog");
const notifIds = ["n-food", "n-events", "n-leftovers", "n-chat", "n-nearby",
                  "m-text", "m-email", "m-push"];

// local stand-in until B saves these to the profiles table
let notifSettings = {};

document.getElementById("open-notif-btn").addEventListener("click", () => {
  profileDialog.close();
  notifIds.forEach(id => {
    document.getElementById(id).checked = !!notifSettings[id];
  });
  notifDialog.showModal();
});

document.getElementById("notif-cancel").addEventListener("click", () => {
  notifDialog.close();
});

document.getElementById("notif-save").addEventListener("click", () => {
  notifIds.forEach(id => {
    notifSettings[id] = document.getElementById(id).checked;
  });
  notifDialog.close();
});

/* ---------- START WEBSITE ---------- */

// Display event list
sortEvents();
renderEvents(events);

// PHASE 7: Share event data with map.js
window.getMapEvents = function () {
  return events;
};


/* ---------- PHASE 8: CHAT INTEGRATION ---------- */

// Give sample events stable IDs
const chatSampleIds = {
  "Poppi|MSC": "poppi-msc",
  "Pizza|Zachry": "pizza-zachry",
  "Donuts|Evans Library": "donuts-evans"
};

events.forEach(event => {
  if (event.id == null) {
    const key = event.name + "|" + event.place;

    event.id =
      chatSampleIds[key] ||
      crypto.randomUUID();
  }
});

// Update chat dropdown after adding a new event
const originalRenderEvents = renderEvents;

renderEvents = function(list) {
  originalRenderEvents(list);

  if (window.updateChatEventDropdown) {
    window.updateChatEventDropdown();
  }
};

