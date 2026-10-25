
const notificationButton =
  document.getElementById("enable-notifications");

notificationButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Your browser does not support notifications.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    notificationButton.textContent = "🔔 Alerts Enabled!";

    new Notification("🍕 Free Food Finder", {
      body: "Notifications are working! You'll get alerts for new food events."
    });
  } else {
    alert("Please allow notifications in your browser settings.");
  }
});
