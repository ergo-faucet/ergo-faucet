import { AuthenticationBody, ChallengeBody, RefreshTokenBody } from '.';
import { Static } from '@sinclair/typebox';

export type AuthenticationBodyType = Static<typeof AuthenticationBody>;
export type RefreshTokenBodyType = Static<typeof RefreshTokenBody>;
export type ChallengeBodyType = Static<typeof ChallengeBody>;
