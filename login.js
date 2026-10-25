document.getElementById("auth-submit").addEventListener("click", () => {
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const error    = document.getElementById("auth-error");

  if (!email || !password) {
    error.textContent = "Please fill in every box.";
    return;
  }

  // B: replace this line with supabase.auth.signInWithPassword().
  // Show error.textContent = "Wrong email or password." if it fails,
  // and only redirect if it succeeds.
  window.location.href = "index.html";
});