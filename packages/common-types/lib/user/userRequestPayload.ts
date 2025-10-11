export interface UserRequestPayload {
  userId: number;
  address: string;
  name?: string;
  isAdmin?: boolean;
}
