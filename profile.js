const boxIds  = ["n-email", "n-text", "n-events", "n-nearby", "n-chat"];
const msg     = document.getElementById("profile-msg");
const saveBtn = document.getElementById("profile-save");
let currentUser = null;

// ---------- LOAD ----------
async function loadProfile() {
  // SUPABASE: who is logged in? If nobody, go to login
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  currentUser = session.user;

  // SUPABASE: read this user's row from profiles
  const { data: p, error } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    msg.textContent = "Couldn't load your profile.";
    console.error(error);
    return;
  }

  document.getElementById("profile-username").value = p.username ?? "";
  document.getElementById("profile-phone").value    = p.phone ?? "";
  document.getElementById("profile-email").value    = currentUser.email;  // email lives in auth

  boxIds.forEach(id => {
    document.getElementById(id).checked = !!p[id.replace("-", "_")];  // "n-email" -> "n_email"
  });
}

// ---------- SAVE ----------
saveBtn.addEventListener("click", async () => {
  msg.textContent = "";

  const username = document.getElementById("profile-username").value.trim();
  const phone    = document.getElementById("profile-phone").value.trim();
  const newEmail = document.getElementById("profile-email").value.trim();

  if (document.getElementById("n-text").checked && !phone) {
    msg.textContent = "Add a phone number to get text notifications.";
    return;
  }

  const update = {
    username: username || null,   // empty saves as NULL, not ""
    phone:    phone || null
  };
  boxIds.forEach(id => {
    update[id.replace("-", "_")] = document.getElementById(id).checked;
  });

  saveBtn.disabled = true;

  // SUPABASE: write to this user's row in profiles
  const { data: updated, error } = await window.supabaseClient
    .from("profiles")
    .update(update)
    .eq("id", currentUser.id)
    .select();

  console.log("update result:", updated, error);

  if (error) {
    saveBtn.disabled = false;
    msg.textContent = error.code === "23505"
      ? "That username is taken."
      : "Couldn't save: " + error.message;
    return;
  }

  if (!updated || updated.length === 0) {
    saveBtn.disabled = false;
    msg.textContent = "Nothing was saved: no profile row found for this account.";
    return;
  }

  // SUPABASE: changing email is a separate auth call
  if (newEmail && newEmail !== currentUser.email) {
    const { error: emailError } =
      await window.supabaseClient.auth.updateUser({ email: newEmail });
    saveBtn.disabled = false;
    msg.textContent = emailError
      ? "Saved, but the email change failed: " + emailError.message
      : "Saved. Check your new email to confirm the change.";
    return;
  }

  saveBtn.disabled = false;
  msg.textContent = "Saved!";
});

// ---------- LOG OUT ----------
document.getElementById("profile-logout").addEventListener("click", async () => {
  // SUPABASE: end the session first
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

loadProfile();