export const AUTH_MESSAGES = {
  emailRequired: 'Enter your email address.',
  emailInvalid: 'Enter an email address in the format name@example.com.',
  passwordRequired: 'Enter your password.',
  // the email or password is wrong (the backend doesn't say which, so nobody can check which emails have an account)
  invalidLogin: 'The email or password is incorrect. Check them and try again.',
  passwordWeak: "Your password doesn't meet all the rules below yet.",
  passwordTooLong: 'Use a shorter password, at most 72 characters (emojis count as more than one).',
  usernameRequired: 'Choose a username.',
  // hint under the username field and also shows as an error if the rules arent met
  usernameRules: 'Use 3 to 9 letters, numbers or underscores (_).',
  usernameReserved: "That username isn't available. Please choose a different one.",
  passwordsDontMatch:
    "The passwords don't match. Make sure to enter the same password in both fields.",

  // the password checklist on the create account form, each one turns green once it's met
  passwordRuleLength: 'At least 8 characters',
  passwordRuleUppercase: 'An uppercase letter',
  passwordRuleLowercase: 'A lowercase letter',
  passwordRuleNumber: 'A number',
  passwordRuleSymbol: 'A symbol, like ! or ?',

  // goes above form, for problems the backend reports
  accountTaken:
    'An account with that email or username already exists. Sign in instead, or use a different email or username.',
  checkFields: 'Some details need fixing. Check the messages below each field.',
  serverUnreachable: "Can't connect to the server. Check your internet connection and try again.",
  unknownError: 'Something went wrong on our end. Please try again in a moment.',

  // in sign in form when the account was made but signing in straight after didnt work for whatever reason
  accountCreatedSignIn:
    "Your account was created but we couldn't sign you in. Enter your password to sign in.",
} as const;
