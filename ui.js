

const UPDATE_MINUTES = 1;   // keep as 1 for demo, but irl maybe change to like 5

const $ = id => document.getElementById(id);


//state

const events = [];          // loadevents in db.js
let selectedEvent = null;
let popupOpenedAt = 0;      
let scrollAtOpen = 0;
let liveCount = 0;         



function localDateString(d = new Date()) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function dayKey(ev) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (ev.date === localDateString()) return "today";
  if (ev.date === localDateString(tomorrow)) return "tomorrow";

  return new Date(ev.date + "T00:00:00")
    .toLocaleDateString("en-US", { weekday: "long" });
}


function formatTime(t) {
  let [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + String(m).padStart(2, "0") + ampm;
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function startLabel(ev) {
  return formatTime(ev.start_time);
}

function placeLabel(ev) {
  return ev.room_num ? ev.location + " " + ev.room_num : ev.location;
}

function eventTitle(ev) {
  return ev.free_stuff + " @ " + placeLabel(ev);
}

function byDateTime(a, b) {
  return a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time);
}

function sortEvents() {
  events.sort(byDateTime);
}

function endsAt(ev) {
  if (!ev.date || !ev.end_time) return null;

  const end = new Date(ev.date + "T" + ev.end_time);
  const start = new Date(ev.date + "T" + ev.start_time);
  if (end <= start) end.setDate(end.getDate() + 1);
  return end;
}

function hasEnded(ev) {
  const end = endsAt(ev);
  return end ? end <= new Date() : false;
}



function renderEvents(list) {
  const box = $("events-list");
  box.innerHTML = "";

  const visible = list.filter(ev => !hasEnded(ev)).sort(byDateTime);
  liveCount = visible.length;

  let lastDay = "";
  let selectedItem = null;

  visible.forEach(ev => {
    const day = dayKey(ev);

    if (day !== lastDay) {
      const label = document.createElement("h3");
      label.className = "day";
      label.textContent = day;
      box.appendChild(label);
      lastDay = day;
    }

    const item = document.createElement("div");
    item.className = "event-item";
    item.textContent = eventTitle(ev) + " at " + startLabel(ev);
    item.addEventListener("click", () => selectEvent(ev, item));
    box.appendChild(item);

    if (selectedEvent && selectedEvent.event_id != null &&
        ev.event_id === selectedEvent.event_id) {
      selectedEvent = ev;
      selectedItem = item;
    }
  });

  if (selectedItem) selectEvent(selectedEvent, selectedItem);
  else hidePopup();

  window.updateChatEventDropdown?.();
}

//popup

function clearSelection() {
  document.querySelectorAll("#events-list .event-item").forEach(i => {
    i.classList.remove("selected");
    i.style.width = "";
  });
}

function selectEvent(ev, item) {
  selectedEvent = ev;
  window.openEventChat?.(ev);

  clearSelection();
  item.classList.add("selected");
  fillPopup(ev);

  const popup = $("event-popup");
  popup.hidden = false;
  popup.classList.remove("flip");

  const wrapTop = document.querySelector(".events-wrap").getBoundingClientRect().top;
  const itemRect = item.getBoundingClientRect();
  const margin = 12;

  
  popup.style.top = (itemRect.top - wrapTop) + "px";

  if (popup.getBoundingClientRect().bottom > window.innerHeight - margin) {
    const popupHeight = popup.offsetHeight;

    if (itemRect.bottom - popupHeight >= margin) {
      popup.classList.add("flip");
      popup.style.top = (itemRect.bottom - wrapTop - popupHeight) + "px";
    } else {
      popup.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  item.style.width =
    Math.max(0, popup.getBoundingClientRect().left - itemRect.left) + "px";

  popupOpenedAt = Date.now();
  scrollAtOpen = $("events").scrollTop;
}

function fillPopup(ev) {
  $("pop-name").textContent  = ev.free_stuff;
  $("pop-place").textContent = placeLabel(ev);
  $("pop-time").textContent  = formatTime(ev.start_time) + " - " + formatTime(ev.end_time);
  $("busy-marker").style.left = ((ev.busy ?? 0.1) * 100) + "%";

  const updatedAt = ev.updatedAt || new Date();
  const waiting = (ev.pending || []).length;
  const next = new Date(updatedAt.getTime() + UPDATE_MINUTES * 60000);

  $("pop-updated").textContent =
    "Last updated " + formatClock(updatedAt) + "\n" +
    "Next update " + formatClock(next) +
    (waiting ? " (" + waiting + " check-in" + (waiting > 1 ? "s" : "") + " waiting)" : "");
}

function refreshPopup() {
  if (selectedEvent) fillPopup(selectedEvent);
}

function hidePopup() {
  selectedEvent = null;
  $("event-popup").hidden = true;
  clearSelection();
}

document.addEventListener("click", e => {
  if ($("event-popup").hidden) return;
  if (e.target.closest("#event-popup, #events-list .event-item, dialog")) return;
  hidePopup();
});

$("events").addEventListener("scroll", () => {
  if (!selectedEvent) return;
  const box = $("events");

  if (Date.now() - popupOpenedAt < 400) {
    scrollAtOpen = box.scrollTop;
    return;
  }
  if (Math.abs(box.scrollTop - scrollAtOpen) > 4) hidePopup();
}, { passive: true });


//busy

function maybeUpdate(ev) {
  if (!ev.pending || ev.pending.length === 0) return false;

  const updatedAt = ev.updatedAt || new Date(0);
  const due = Date.now() - updatedAt.getTime() >= UPDATE_MINUTES * 60000;
  if (!due) return false;

  const total = ev.pending.reduce((sum, v) => sum + v, 0);
  ev.busy = total / ev.pending.length;
  ev.pending = [];
  ev.updatedAt = new Date();
  return true;
}


setInterval(() => {
  events.forEach(maybeUpdate);

  if (events.filter(ev => !hasEnded(ev)).length !== liveCount) {
    renderEvents(events);
    window.refreshMapEvents?.();
  }

  refreshPopup();
}, 30000);


//check in

const checkinDialog = $("checkin-dialog");

$("im-here-btn").addEventListener("click", () => {
  if (!selectedEvent) return;

  $("checkin-event").textContent = eventTitle(selectedEvent);
  $("checkin-slider").value = Math.round((selectedEvent.busy ?? 0.1) * 100);
  checkinDialog.showModal();
});

$("checkin-cancel").addEventListener("click", () => checkinDialog.close());

$("checkin-save").addEventListener("click", () => {
  if (!selectedEvent) return;

  selectedEvent.pending = selectedEvent.pending || [];
  selectedEvent.pending.push(Number($("checkin-slider").value) / 100);

  maybeUpdate(selectedEvent);
  fillPopup(selectedEvent);
  checkinDialog.close();
});





function parseTypedTime(text, ampm) {
  const match = text.trim().match(/^(0[1-9]|1[0-2]):([0-5]\d)$/);
  if (!match) return null;

  let h = Number(match[1]) % 12;               
  if (ampm === "PM") h += 12;
  return String(h).padStart(2, "0") + ":" + match[2];
}


function maskTime(raw) {
  const digits = raw.replace(/\D/g, "");
  let out = "";

  for (const d of digits) {
    const pos = out.replace(":", "").length;     

    if (pos === 0) {                             
      if (d === "0" || d === "1") out += d;
      else if (/[2-9]/.test(d)) out += "0" + d + ":";
      continue;
    }
    if (pos === 1) {                             
      if (out[0] === "0" && !/[1-9]/.test(d)) continue;
      if (out[0] === "1" && !/[0-2]/.test(d)) continue;
      out += d + ":";
      continue;
    }
    if (pos === 2) {                             
      if (!/[0-5]/.test(d)) continue;
      out += d;
      continue;
    }
    if (pos === 3) {                             
      out += d;
      continue;
    }
    break;
  }
  return out;
}

["add-start", "add-end"].forEach(id => {
  const box = $(id);
  if (!box) return;

  box.addEventListener("input", e => {
    let v = maskTime(box.value);
    
    if (e.inputType && e.inputType.startsWith("delete") && v.endsWith(":")) {
      v = v.slice(0, -1);
    }
    box.value = v;
  });
});


//form

const addDialog = $("add-dialog");
const addBtn = $("add-event-btn");

if (addDialog && addBtn) {
  addBtn.addEventListener("click", () => addDialog.showModal());
  $("add-cancel").addEventListener("click", () => addDialog.close());

  $("add-save").addEventListener("click", async () => {
    const saveBtn = $("add-save");

    const name  = $("add-name").value.trim();
    const place = $("add-place").value.trim();
    const room  = $("add-room").value.trim();
    const date  = $("add-day").value;
    const start = parseTypedTime($("add-start").value, $("add-start-ampm").value);
    const end   = parseTypedTime($("add-end").value, $("add-end-ampm").value);

    if (!name || !place || !date || !start || !end) {
      alert("please fill in the name, location, date, and a start and end time like 04:00.");
      return;
    }

    const db = window.supabaseClient;
    if (!db) {
      alert("the database isn't connected yet.");
      return;
    }

    saveBtn.disabled = true;                      

    const { error } = await db.from("events").insert([{
      event_type: $("add-type").value,
      free_stuff: name,
      location: place,
      room_num: room,
      date: date,
      start_time: start,
      end_time: end,
      active: true
    }]);

    saveBtn.disabled = false;

    if (error) {
      console.error(error);
      alert("could not save the event. please try again.");
      return;
    }

    await loadEvents();
    window.refreshMapEvents?.();

    ["add-name", "add-place", "add-room", "add-start", "add-end"]
      .forEach(id => { $(id).value = ""; });
    addDialog.close();
  });
}


//place suggestions

const PLACES = ["MSC", "Zachry", "Evans Library", "Sbisa", "Commons",
                "Student Rec Center", "Kyle Field", "HEB"];

const placeInput = $("add-place");
const placeMenu = $("place-menu");

if (placeInput && placeMenu) {
  const showPlaces = () => {
    const q = placeInput.value.trim().toLowerCase();
    const matches = PLACES.filter(p => p.toLowerCase().includes(q));

    placeMenu.innerHTML = "";
    matches.forEach(p => {
      const row = document.createElement("div");
      row.textContent = p;
      row.addEventListener("mousedown", e => {
        e.preventDefault();                       // keeps the input from losing focus first
        placeInput.value = p;
        placeMenu.hidden = true;
      });
      placeMenu.appendChild(row);
    });

    placeMenu.hidden = matches.length === 0;
  };

  placeInput.addEventListener("focus", showPlaces);
  placeInput.addEventListener("input", showPlaces);
  placeInput.addEventListener("blur", () => { placeMenu.hidden = true; });
}




// events that haven't ended yet
window.getMapEvents = () => events.filter(ev => !hasEnded(ev));




loadEvents();      // defined in db.js