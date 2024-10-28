import { u128 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  Delegation,
  DelegationHistory,
  Delegator,
  Operator,
} from '../../../../types';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';
import getAndAssertAccount from '../../../../utils/getAndAssertAccount';

export default async function handleDelegate(
  extrinsic: SubstrateExtrinsic<
    [operator: AccountId32, assetId: u128, amount: u128]
  >,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [operatorAccountId, assetId, amount] = extrinsic.extrinsic.args;

  const delegator = await Delegator.get(signer);
  assert(delegator, `Delegator with ID ${signer} not found`);
  delegator.lastUpdateAt = blockNumber;

  const delegatorAccount = await getAndAssertAccount(
    delegator.accountId,
    blockNumber,
  );

  const operator = await Operator.get(operatorAccountId.toString());
  assert(
    operator,
    `Operator with ID ${operatorAccountId.toString()} not found`,
  );
  operator.lastUpdateAt = blockNumber;

  const operatorAccount = await getAndAssertAccount(operator.id, blockNumber);

  const delegationId = `${delegatorAccount.id}-${operatorAccount.id}-${assetId.toString()}`;
  let delegation = await Delegation.get(delegationId);

  if (delegation === undefined) {
    delegation = Delegation.create({
      id: delegationId,
      delegatorId: delegator.id,
      operatorId: operator.id,
      assetId: assetId.toBigInt(),
      hasActiveUnstakeRequest: false,
      totalAmount: 0n,
    });
  }

  delegation.totalAmount += amount.toBigInt();

  const history = DelegationHistory.create({
    id: `${delegation.id}-${blockNumber.toString()}`,
    delegationId: delegation.id,
    amount: amount.toBigInt(),
    blockNumber,
  });

  await Promise.all([
    delegator.save(),
    delegatorAccount.save(),
    operator.save(),
    operatorAccount.save(),
    delegation.save(),
    history.save(),
  ]);
}
