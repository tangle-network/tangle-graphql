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

export default async function handleDelegate(
  extrinsic: SubstrateExtrinsic<
    [operator: AccountId32, assetId: u128, amount: u128]
  >,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [operatorAccount, assetId, amount] = extrinsic.extrinsic.args;

  const delegator = await Delegator.get(signer);
  assert(delegator, `Delegator with ID ${signer} not found`);

  delegator.lastUpdateAt = blockNumber;

  const operator = await Operator.get(operatorAccount.toString());
  assert(operator, `Operator with ID ${operatorAccount.toString()} not found`);

  const delegationId = `${delegator.id}-${operator.id}-${assetId.toString()}`;
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

  await Promise.all([delegator.save(), delegation.save(), history.save()]);
}
