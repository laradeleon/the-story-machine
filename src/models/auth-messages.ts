export const AUTH_MESSAGES = {
  emailRequired: 'Enter your email address.',
  emailInvalid: 'Enter an email address in the format name@example.com.',
  passwordRequired: 'Enter your password.',
  usernameRequired: 'Choose a username.',
  // hint under the username field and also shows as an error if the rules arent met
  usernameRules: 'Use 3 to 9 letters, numbers or underscores (_).',
  usernameReserved: "That username isn't available. Please choose a different one.",
  passwordsDontMatch:
    "The passwords don't match. Make sure to enter the same password in both fields.",

  // goes above form, for problems the backend reports
  accountTaken:
    'An account with that email or username already exists. Sign in instead, or use a different email or username.',
  checkFields: 'Some details need fixing. Check the messages below each field.',
  serverUnreachable: "Can't connect to the server. Check your internet connection and try again.",
  unknownError: 'Something went wrong on our end. Please try again in a moment.',
} as const;
