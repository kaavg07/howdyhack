document.getElementById("auth-submit").addEventListener("click", async () => {
  console.log("signup clicked", window.supabaseClient);   // temporary, delete once it works

  const username = document.getElementById("auth-username").value.trim();
  const password = document.getElementById("auth-password").value;
  const email    = document.getElementById("auth-email").value.trim();
  const error    = document.getElementById("auth-error");
  const btn      = document.getElementById("auth-submit");

  error.textContent = "";

  if (!password || !email) {
    error.textContent = "Please fill in every box.";
    return;
  }
  if (password.length < 6) {
    error.textContent = "Password needs at least 6 characters.";
    return;
  }

  btn.disabled = true;

  // SUPABASE: create the account. The username goes in as metadata and the
  // database trigger copies it into the profiles row.
  const { data, error: authError } = await window.supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });

  btn.disabled = false;

  if (authError) {
    console.error(authError);
    error.textContent = authError.message.includes("Database error")
      ? "That username is taken."
      : authError.message;
    return;
  }

  // Already-registered email (confirmation on) returns no error but no identities
  if (data.user?.identities?.length === 0) {
    error.textContent = "That email already has an account. Try logging in.";
    return;
  }

  // Confirmation on: no session until they click the email link
  if (!data.session) {
    error.textContent = "Check your email to confirm your account, then log in.";
    return;
  }

  window.location.href = "index.html";
});