export interface userDiscordData {
  userId: string;
  username: string;
  join_date: Date;
  global_name?: string;
  email?: string;
}

export interface discordToken {
  accessToken: string;
  refreshToken: string;
  expiresInSecond: number;
}

export interface SessionData {
  userId: number;
  frontState: string;
}
