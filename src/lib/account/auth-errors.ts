export function authErrorMessage(error: {
  code?: string | undefined;
  status?: number | undefined;
  message?: string | undefined;
}): string {
  if (error.status === 429 || /rate_limit|too_many/.test(error.code ?? ""))
    return "Too many attempts. Wait a few minutes, then try again.";
  switch (error.code) {
    case "email_not_confirmed":
      return "Confirm your email before signing in. You can resend the confirmation below.";
    case "invalid_credentials":
      return "Email or password doesn’t match. Try again or reset your password.";
    case "signup_disabled":
      return "New accounts are disabled. The app owner needs to enable signups in Users → Auth settings.";
    case "email_provider_disabled":
      return "Email sign-in is unavailable. Try a configured social sign-in or browse as a guest.";
    case "weak_password":
      return "Choose a stronger password that meets the account password requirements.";
    case "user_already_exists":
      return "An account already exists for this email. Sign in or reset your password.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "over_email_send_rate_limit":
      return "Email sending is temporarily limited. Wait before requesting another email.";
    default:
      return error.status && error.status >= 500
        ? "The account service couldn’t complete this request. Retry shortly; if it persists, the owner should check auth email delivery."
        : "Couldn’t complete this request. Check your connection and details, then retry.";
  }
}
