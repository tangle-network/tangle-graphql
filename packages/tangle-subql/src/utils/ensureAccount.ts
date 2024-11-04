import { Account } from '../types';

export default async function ensureAccount(
  accountId: string,
  blockNumber: number,
) {
  const account = await Account.get(accountId);

  if (account === undefined) {
    return Account.create({
      id: accountId,
      createdAt: blockNumber,
      lastUpdateAt: blockNumber,
    });
  }

  return account;
}
