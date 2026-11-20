export const CONFIRMATION_COOLDOWN_SECONDS = 60;

export function validateSignupPasswords(password: string, confirmation: string): string | null {
  if (password.length < 6) return "Use at least 6 characters for your password.";
  if (password !== confirmation) return "Passwords don’t match. Re-enter your confirmation.";
  return null;
}
