export interface userDiscordData {
  userId: string;
  username: string;
  first_join: Date;
  global_name?: string;
  email?: string;
}

export interface discordToken {
  accessToken: string;
  refreshToken: string;
  expiresInSecond: number;
}
