// structure of responses from backend

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface StoryResponse {
  _id: string;
  authorId: string;
  title: string;
}

export interface UserResponse {
  _id: string;
  username: string;
  displayName: string;
}
