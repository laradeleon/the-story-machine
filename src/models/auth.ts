// shapes used for accounts and signing in

// the signed in user, as the backend sends it (never includes the password)
export interface User {
  _id: string;
  email: string;
  username: string;
  displayName: string;
  roles: string[];
  bio: string;
  profileUrl: string;
  followerCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
}

// what the register form sends
export interface RegisterDetails {
  email: string;
  username: string;
  password: string;
}

// one field that failed the backend's checks, e.g. { field: 'password', message: '...' }
export interface FieldError {
  field: string;
  message: string;
}

// what the backend sends back when something goes wrong
export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: FieldError[];
}
