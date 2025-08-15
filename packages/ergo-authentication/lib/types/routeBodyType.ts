import { AuthenticationBody, ChallengeBody } from '.';
import { Static } from '@sinclair/typebox';

export type AuthenticationBodyType = Static<typeof AuthenticationBody>;
export type ChallengeBodyType = Static<typeof ChallengeBody>;
