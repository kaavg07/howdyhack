

/* ---------- PHASE 8: REALTIME EVENT CHAT ---------- */

// Person B provides the Supabase client.
// Expected: window.supabaseClient or window.db

let activeChatEventId = null;
let chatChannel = null;
let chatVersion = 0;

const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-message");
const sendButton = document.getElementById("chat-send");
const chatTitle = document.getElementById("chat-event-name");
const eventSelect = document.getElementById("chat-event-select");

sendButton.disabled = true;


// ---------- DATABASE CONNECTION ----------

function getChatDatabase() {
  if (window.supabaseClient?.from) {
    return window.supabaseClient;
  }

  if (window.db?.from) {
    return window.db;
  }

  return null;
}


// ---------- DISPLAY MESSAGE ----------

function displayMessage(message) {
  if (message.id == null) return;

  const id = String(message.id);

  const exists = Array.from(chatBox.children).some(
    row => row.dataset.messageId === id
  );

  if (exists) return;

  const row = document.createElement("div");
  row.className = "chat-message";
  row.dataset.messageId = id;

  const text = document.createElement("span");
  text.textContent = message.body || "";

  row.appendChild(text);
  chatBox.appendChild(row);

  chatBox.scrollTop = chatBox.scrollHeight;
}


// ---------- UPDATE EVENT DROPDOWN ----------

window.updateChatEventDropdown = function() {
  const getEvents = window.getMapEvents;

  const events = typeof getEvents === "function"
    ? getEvents()
    : [];

  const previous = eventSelect.value;

  eventSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select an event...";
  eventSelect.appendChild(placeholder);

    events.forEach(event => {
    if (event.event_id == null) return;

    const option = document.createElement("option");

    option.value = String(event.event_id);
    option.textContent =
      event.free_stuff + " @ " + event.location;

    eventSelect.appendChild(option);
  });

  const stillExists = Array.from(eventSelect.options)
    .some(option => option.value === previous);

  if (stillExists) {
    eventSelect.value = previous;
  }
};


// ---------- OPEN SELECTED EVENT CHAT ----------

window.openEventChat = async function(event) {
  if (event.event_id == null) {
    chatBox.textContent =
      "This event does not have an ID.";
    return;
  }

  const eventId = String(event.event_id);

  if (
    activeChatEventId === eventId &&
    chatChannel
  ) {
    eventSelect.value = eventId;
    return;
  }

  const version = ++chatVersion;
  const oldChannel = chatChannel;

  chatChannel = null;
  activeChatEventId = eventId;

  eventSelect.value = eventId;
  chatTitle.textContent = "Chat: " + event.free_stuff;
  chatBox.textContent = "Loading messages...";
  sendButton.disabled = true;

  const db = getChatDatabase();

  if (!db) {
    chatBox.textContent =
      "Supabase is not connected yet.";
    return;
  }

  try {
    if (oldChannel) {
      await db.removeChannel(oldChannel);
    }

    if (version !== chatVersion) return;

    // Buffer messages arriving during initial loading.
    const pendingMessages = [];
    let historyLoaded = false;

    const channel = db
      .channel("chat-" + eventId + "-" + version)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "event_id=eq." + eventId
        },
        payload => {
          if (version !== chatVersion) return;

          if (!historyLoaded) {
            pendingMessages.push(payload.new);
          } else {
            displayMessage(payload.new);
          }
        }
      );

    chatChannel = channel;

    // Subscribe before loading message history.
    await new Promise((resolve, reject) => {
      channel.subscribe(status => {
        if (status === "SUBSCRIBED") {
          resolve();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          reject(new Error(status));
        }
      });
    });

    if (version !== chatVersion) return;

    const { data, error } = await db
      .from("messages")
      .select("id, event_id, name, body, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    if (version !== chatVersion) return;

    chatBox.replaceChildren();

    const messages = [
      ...(data || []),
      ...pendingMessages
    ];

    messages.sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at) ||
      Number(a.id) - Number(b.id)
    );

    messages.forEach(displayMessage);

    historyLoaded = true;
    sendButton.disabled = false;

  } catch (error) {
    if (version !== chatVersion) return;

    console.error("chat loading error:", error);

    chatBox.textContent =
      "could not load chat. check Supabase connection.";

    if (chatChannel) {
      const failedChannel = chatChannel;
      chatChannel = null;
      await db.removeChannel(failedChannel);
    }
  }
};


// ---------- SEND ANONYMOUS MESSAGE ----------

async function sendMessage() {
  const db = getChatDatabase();
  const body = chatInput.value.trim();
  const eventId = activeChatEventId;

  if (!db || !eventId) {
    alert("please select an event first.");
    return;
  }

  if (!body) {
    alert("please enter a message.");
    return;
  }

  if (body.length > 500) {
    alert("message is too long.");
    return;
  }

  sendButton.disabled = true;

  try {
    const { data, error } = await db
      .from("messages")
      .insert({
        event_id: eventId,
        name: "anonymous",
        body: body
      })
      .select("id, event_id, name, body, created_at")
      .single();

    if (error) throw error;

    if (activeChatEventId === eventId) {
      displayMessage(data);

      if (chatInput.value.trim() === body) {
        chatInput.value = "";
      }
    }

  } catch (error) {
    console.error("send error:", error);
    alert("could not send message.");

  } finally {
    if (
      activeChatEventId === eventId &&
      chatChannel
    ) {
      sendButton.disabled = false;
    }
  }
}


// ---------- EVENT SELECTOR ----------

eventSelect.addEventListener("change", () => {
  const getEvents = window.getMapEvents;

  const events = typeof getEvents === "function"
    ? getEvents()
    : [];

  const selected = events.find(event =>
        String(event.event_id) === eventSelect.value
  );

  if (selected) {
    window.openEventChat(selected);
  } else {
    chatVersion++;

    const db = getChatDatabase();

    if (chatChannel && db) {
      db.removeChannel(chatChannel);
    }

    chatChannel = null;
    activeChatEventId = null;

    chatTitle.textContent = "select an event";
    chatBox.textContent =
      "choose an event to view messages.";

    sendButton.disabled = true;
  }
});


// ---------- SEND BUTTON ----------

sendButton.addEventListener("click", sendMessage);


// ---------- ENTER KEY ----------

chatInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !sendButton.disabled) {
    event.preventDefault();
    sendMessage();
  }
});


// ---------- INITIALIZE DROPDOWN ----------

window.updateChatEventDropdown();
