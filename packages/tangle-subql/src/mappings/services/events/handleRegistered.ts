import assert from 'assert';
import { u64, Vec } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import {
  TanglePrimitivesServicesField,
  TanglePrimitivesServicesOperatorPreferences,
} from '@polkadot/types/lookup';
import { SubstrateEvent } from '@subql/types';
import {
  Account,
  Blueprint,
  BlueprintOperator,
  Operator,
} from '../../../types';

export default async function handleRegistered(
  event: SubstrateEvent<
    [
      provider: AccountId32,
      blueprintId: u64,
      preferences: TanglePrimitivesServicesOperatorPreferences,
      registrationArgs: Vec<TanglePrimitivesServicesField>,
    ]
  >,
) {
  const [provider, blueprintId] = event.event.data;

  const blockNumber = event.block.block.header.number.toNumber();

  const operator = await Operator.get(provider.toString());
  assert(operator, 'Operator not found');

  const account = await Account.get(operator.accountId);
  assert(account, 'Account not found');

  const blueprint = await Blueprint.get(blueprintId.toString());
  assert(blueprint, 'Blueprint not found');

  operator.totalBlueprints += 1;
  account.lastUpdateAt = blockNumber;

  const blueprintOperator = BlueprintOperator.create({
    id: `${blueprint.id}-${operator.id}`,
    blueprintId: blueprint.id,
    operatorId: operator.id,
    registeredAt: blockNumber,
    updatedAt: blockNumber,
    isActive: true,
  });

  await Promise.all([
    blueprintOperator.save(),
    operator.save(),
    account.save(),
  ]);
}
