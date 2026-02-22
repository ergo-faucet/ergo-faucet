import { Static } from '@sinclair/typebox';

import { AuthenticationBody, ChallengeBody } from '.';

export type AuthenticationBodyType = Static<typeof AuthenticationBody>;
export type ChallengeBodyType = Static<typeof ChallengeBody>;
