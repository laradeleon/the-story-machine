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

// what the backend sends back when you sign in
export interface LoginResult {
  accessToken: string; // sent on later requests as "Authorization: Bearer <accessToken>"
  tokenType: 'Bearer';
  expiresIn: number; // seconds until the token stops working
  user: User;
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

// who you are before signing in, so the app always has a user to show
export const GUEST_USER: User = {
  _id: 'guest',
  email: '',
  username: 'guest',
  displayName: 'Guest',
  roles: ['guest'],
  bio: '',
  profileUrl: '',
  followerCount: 0,
  followingCount: 0,
  createdAt: '',
  updatedAt: '',
};
