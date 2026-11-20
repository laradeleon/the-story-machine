import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../../models/auth';
import { API_MESSAGES } from '../../models/api-messages';

// the message for an error that isn't about what was sent: no connection, or the server failing.
// null when the backend answered with its own reason, which the caller can show
export function server_problem(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    // not from the backend at all, so it's a bug in the app. logged so it can be found
    console.error(error);
    return API_MESSAGES.unknownError;
  }

  // request never reached the server
  if (error.status === 0) {
    return API_MESSAGES.serverUnreachable;
  }

  // the proxy couldn't reach the backend (it's down or restarting)
  if ([502, 503, 504].includes(error.status)) {
    return API_MESSAGES.serverUnreachable;
  }

  // the backend crashed, its message ("Internal server error") wouldn't help the user
  if (error.status >= 500) {
    return API_MESSAGES.unknownError;
  }
  return null;
}

// one message for why a request didn't work. no connection or the server failing get the friendly
// messages above, otherwise the backend's own reason, e.g. which part of a script it turned away
export function api_reason(error: unknown): string {
  const problem = server_problem(error);
  if (problem) {
    return problem;
  }
  const body = (error as HttpErrorResponse).error as Partial<ApiErrorBody> | null;
  // the first field's reason is more specific than the overall message ("Validation failed")
  return body?.errors?.[0]?.message ?? body?.message ?? API_MESSAGES.unknownError;
}
