const nameInput = document.getElementById("name");
const roomInput = document.getElementById("room");
const joinButton = document.getElementById("join");
const copyButton = document.getElementById("copyLink");
const messagesEl = document.getElementById("messages");
const form = document.getElementById("form");
const textInput = document.getElementById("text");
const sendButton = document.getElementById("send");

let events = null;
let currentRoom = "";
let currentName = "";

function normalizeRoom(value) {
  return String(value || "general")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "general";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showEmpty() {
  messagesEl.innerHTML = '<div class="empty">Todavia no hay mensajes en esta sala.</div>';
}

function appendMessage(message) {
  const empty = messagesEl.querySelector(".empty");
  if (empty) empty.remove();

  const mine = message.name === currentName;
  const item = document.createElement("article");
  item.className = `message${mine ? " mine" : ""}`;
  item.innerHTML = `
    <div class="meta">
      <span>${escapeHtml(message.name)}</span>
      <span>${timeLabel(message.time)}</span>
    </div>
    <div class="text">${escapeHtml(message.text)}</div>
  `;
  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function connect() {
  currentName = nameInput.value.trim().slice(0, 24) || "Invitado";
  currentRoom = normalizeRoom(roomInput.value);
  nameInput.value = currentName;
  roomInput.value = currentRoom;
  history.replaceState(null, "", `?room=${encodeURIComponent(currentRoom)}`);

  if (events) events.close();
  messagesEl.innerHTML = "";
  showEmpty();

  events = new EventSource(`/api/events?room=${encodeURIComponent(currentRoom)}`);
  events.addEventListener("history", (event) => {
    messagesEl.innerHTML = "";
    const messages = JSON.parse(event.data);
    if (!messages.length) showEmpty();
    messages.forEach(appendMessage);
  });
  events.addEventListener("message", (event) => {
    appendMessage(JSON.parse(event.data));
  });
  events.onerror = () => {
    textInput.placeholder = "Reconectando...";
  };

  textInput.disabled = false;
  sendButton.disabled = false;
  textInput.placeholder = `Mensaje para #${currentRoom}`;
  textInput.focus();
}

async function sendMessage(event) {
  event.preventDefault();
  const text = textInput.value.trim();
  if (!text || !currentRoom) return;

  textInput.value = "";
  await fetch("/api/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      room: currentRoom,
      name: currentName,
      text
    })
  });
}

async function copyLink() {
  const room = normalizeRoom(roomInput.value || currentRoom);
  const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`;
  await navigator.clipboard.writeText(url);
  copyButton.textContent = "Copiado";
  setTimeout(() => {
    copyButton.textContent = "Copiar enlace";
  }, 1200);
}

joinButton.addEventListener("click", connect);
form.addEventListener("submit", sendMessage);
copyButton.addEventListener("click", copyLink);

const params = new URLSearchParams(location.search);
roomInput.value = normalizeRoom(params.get("room") || "amigos");
nameInput.value = localStorage.getItem("chatName") || "";

nameInput.addEventListener("change", () => {
  localStorage.setItem("chatName", nameInput.value.trim().slice(0, 24));
});

showEmpty();
