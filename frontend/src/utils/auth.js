const CREDENTIALS_KEY = "confirmly.credentials";

export function toBasicAuth(username, password) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

export function loadSavedCredentials() {
  const saved = localStorage.getItem(CREDENTIALS_KEY);
  return saved ? JSON.parse(saved) : { username: "", password: "" };
}

export function saveCredentials(credentials) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function removeSavedCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY);
}
