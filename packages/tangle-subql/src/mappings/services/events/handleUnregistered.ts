import { u64 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { Account, BlueprintOperator, Operator } from '../../../types';

export default async function handleUnregistered(
  event: SubstrateEvent<[operator: AccountId32, blueprintId: u64]>,
) {
  const [operatorAccountId, blueprintId] = event.event.data;

  const blockNumber = event.block.block.header.number.toNumber();

  const operator = await Operator.get(operatorAccountId.toString());
  assert(operator, 'Operator not found');

  const account = await Account.get(operator.accountId);
  assert(account, 'Account not found');

  const blueprintOperator = await BlueprintOperator.get(
    `${blueprintId.toString()}-${operator.id}`,
  );
  assert(blueprintOperator, 'BlueprintOperator not found');

  blueprintOperator.isActive = false;
  blueprintOperator.updatedAt = blockNumber;
  account.lastUpdateAt = blockNumber;

  await Promise.all([
    blueprintOperator.save(),
    operator.save(),
    account.save(),
  ]);
}
