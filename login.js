document.getElementById("auth-submit").addEventListener("click", async () => {
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const error    = document.getElementById("auth-error");
  const btn      = document.getElementById("auth-submit");

  error.textContent = "";

  if (!email || !password) {
    error.textContent = "Please fill in every box.";
    return;
  }
  if (!/^[^\s@]+@tamu\.edu$/i.test(email)) {
    error.textContent = "Invalid email";
    return;
  }

  btn.disabled = true;

  // SUPABASE: sign in with email + password
  const { error: authError } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  btn.disabled = false;

  if (authError) {
    console.error(authError);   // real reason, e.g. "Email not confirmed"
    error.textContent = "Wrong email or password.";
    return;
  }

  window.location.href = "index.html";
});