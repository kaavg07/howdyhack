const textIds = ["profile-username", "profile-email", "profile-phone"];
const boxIds  = ["n-email", "n-text", "n-events", "n-nearby", "n-chat"];

// B: replace load/save below with reads/writes on the profiles table
const saved = JSON.parse(localStorage.getItem("tamufree-profile") || "{}");

textIds.forEach(id => {
  document.getElementById(id).value = saved[id] || "";
});
boxIds.forEach(id => {
  document.getElementById(id).checked = !!saved[id];
});

document.getElementById("profile-save").addEventListener("click", () => {
  const data = {};
  textIds.forEach(id => { data[id] = document.getElementById(id).value.trim(); });
  boxIds.forEach(id => { data[id] = document.getElementById(id).checked; });

  localStorage.setItem("tamufree-profile", JSON.stringify(data));
  document.getElementById("profile-msg").textContent = "Saved!";
});

document.getElementById("profile-logout").addEventListener("click", () => {
  // B: call supabase.auth.signOut() here first
  window.location.href = "login.html";
});