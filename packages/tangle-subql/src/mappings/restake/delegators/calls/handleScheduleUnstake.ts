import assert from 'assert';
import { u128 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateExtrinsic } from '@subql/types';
import {
  Delegation,
  Delegator,
  Operator,
  UnstakeRequest,
  UnstakeRequestHistory,
  UnstakeRequestStatus,
} from 'tangle-subql/types';
import getExtrinsicInfo from 'tangle-subql/utils/getExtrinsicInfo';

export default async function handleScheduleUnstake(
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
  const delegation = await Delegation.get(delegationId);
  assert(delegation, `Delegation with ID ${delegationId} not found`);

  let unstakeRequest = await UnstakeRequest.get(delegationId);

  if (unstakeRequest === undefined) {
    unstakeRequest = UnstakeRequest.create({
      id: delegationId,
      delegatorId: delegator.id,
      operatorId: operator.id,
      delegationId: delegation.id,
      assetId: assetId.toBigInt(),
      currentStatus: UnstakeRequestStatus.SCHEDULED,
      currentAmount: 0n,
      createdAt: blockNumber,
      updatedAt: blockNumber,
    });
  }

  unstakeRequest.currentStatus = UnstakeRequestStatus.SCHEDULED;
  unstakeRequest.currentAmount += amount.toBigInt();
  unstakeRequest.updatedAt = blockNumber;

  const unstakeRequestHistory = UnstakeRequestHistory.create({
    id: `${unstakeRequest.id}-${blockNumber.toString()}`,
    unstakeRequestId: unstakeRequest.id,
    status: UnstakeRequestStatus.SCHEDULED,
    amount: amount.toBigInt(),
    blockNumber,
  });

  delegation.hasActiveUnstakeRequest = true;
  delegation.totalAmount -= amount.toBigInt();
  delegation.unstakeRequestId = unstakeRequest.id;

  await Promise.all([
    delegator.save(),
    delegation.save(),
    unstakeRequest.save(),
    unstakeRequestHistory.save(),
  ]);
}
