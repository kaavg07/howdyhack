
/* ---------- PHASE 8: EVENT CHAT ---------- */

// db.js must expose the Supabase client as:
// window.supabaseClient

let activeChatEventId = null;
let chatChannel = null;
let chatVersion = 0;

const chatBox = document.getElementById("chat-box");
const chatName = document.getElementById("chat-name");
const chatInput = document.getElementById("chat-message");
const sendButton = document.getElementById("chat-send");
const chatTitle = document.getElementById("chat-event-name");

sendButton.disabled = true;

// Display one message
function displayMessage(message) {
  // Prevent duplicate messages
  if (chatBox.querySelector(
    `[data-message-id="${message.id}"]`
  )) return;

  const row = document.createElement("div");
  row.className = "chat-message";
  row.dataset.messageId = String(message.id);

  const sender = document.createElement("strong");
  sender.textContent = message.name + ": ";

  const body = document.createElement("span");
  body.textContent = message.body;

  row.append(sender, body);
  chatBox.appendChild(row);

  chatBox.scrollTop = chatBox.scrollHeight;
}

// Open chat for selected event
window.openEventChat = async function(event) {
  const db = window.supabaseClient;

  if (!db) {
    chatBox.textContent = "Supabase is not connected.";
    return;
  }

  // Stable event ID must exist
  if (event.id == null) {
    chatBox.textContent = "This event has no ID.";
    return;
  }

  const version = ++chatVersion;
  activeChatEventId = String(event.id);

  chatTitle.textContent = "Chat: " + event.name;
  chatBox.textContent = "Loading messages...";
  sendButton.disabled = false;

  // Leave the previous event's channel
  if (chatChannel) {
    await db.removeChannel(chatChannel);
    chatChannel = null;
  }

  if (version !== chatVersion) return;

  const eventId = activeChatEventId;

  // Subscribe to new messages
  const channel = db
    .channel("chat-" + eventId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `event_id=eq.${eventId}`
      },
      payload => {
        if (activeChatEventId !== eventId) return;

        displayMessage(payload.new);
      }
    )
    .subscribe(status => {
      if (status === "CHANNEL_ERROR") {
        console.error("Chat subscription failed");
      }
    });

  chatChannel = channel;

  // Load saved messages
  const { data, error } = await db
    .from("messages")
    .select("id, event_id, name, body, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (version !== chatVersion) return;

  if (error) {
    console.error(error);
    chatBox.textContent = "Could not load messages.";
    return;
  }

  // Preserve anything received live during loading
  const receivedLive = [...chatBox.children]
    .filter(row => row.dataset.messageId)
    .map(row => ({
      id: row.dataset.messageId,
      name: row.querySelector("strong")?.textContent
        .replace(/: $/, "") || "",
      body: row.querySelector("span")?.textContent || ""
    }));

  chatBox.replaceChildren();

  [...data, ...receivedLive].forEach(displayMessage);
};

// Send message
async function sendMessage() {
  const db = window.supabaseClient;

  const name = chatName.value.trim();
  const body = chatInput.value.trim();

  if (!activeChatEventId || !db) {
    alert("Select an event first.");
    return;
  }

  if (!name || !body) {
    alert("Enter your name and a message.");
    return;
  }

  const eventId = activeChatEventId;
  sendButton.disabled = true;

  const { error } = await db
    .from("messages")
    .insert({
      event_id: eventId,
      name: name,
      body: body
    });

  sendButton.disabled = false;

  if (error) {
    console.error(error);
    alert("Message failed to send.");
    return;
  }

  chatInput.value = "";

  // Reload to confirm the saved message appears,
  // even if Realtime is briefly delayed.
  if (activeChatEventId === eventId) {
    const { data, error: loadError } = await db
      .from("messages")
      .select("id, event_id, name, body, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (!loadError && activeChatEventId === eventId) {
      data.forEach(displayMessage);
    }
  }
}

// Send button
sendButton.addEventListener("click", sendMessage);

// Enter key
chatInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
