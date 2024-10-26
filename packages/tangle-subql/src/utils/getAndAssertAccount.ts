import assert from 'assert';
import { Account } from '../types';

export default async function getAndAssertAccount(
  accountId: string,
  blockNumber: number,
) {
  const account = await Account.get(accountId);
  assert(account, `Account with ID ${accountId} not found`);
  account.lastUpdateAt = blockNumber;
  return account;
}
