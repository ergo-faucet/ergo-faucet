export interface PackageToAdd {
  assets: {
    tokenId: string;
    amount: bigint;
    decimals: number;
    usageDescription: string;
  }[];
  openAt?: string | undefined;
  closeAt?: string | undefined;
  name: string;
  description: string;
  type: 'normal' | 'random';
  status: 'show' | 'hide';
  delay: number;
  numberEachUser: number;
  authMethods: { id: number; order?: number }[];
}
