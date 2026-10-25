document.getElementById("auth-submit").addEventListener("click", () => {
 
  const password = document.getElementById("auth-password").value;
  const email    = document.getElementById("auth-email").value.trim();
  const error    = document.getElementById("auth-error");

  if (  !password || !email) {
    error.textContent = "Please fill in every box.";
    return;
  }
  if (password.length < 6) {
    error.textContent = "Password needs at least 6 characters.";
    return;
  }

  // B: replace this line with supabase.auth.signUp(), save the username
  // to the profiles row, and only redirect if it succeeds.
  window.location.href = "index.html";
});