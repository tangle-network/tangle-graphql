import { u128 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  Delegation,
  Delegator,
  UnstakeRequest,
  UnstakeRequestHistory,
  UnstakeRequestStatus,
} from 'tangle-subql/types';
import getExtrinsicInfo from 'tangle-subql/utils/getExtrinsicInfo';

export default async function handleCancelUnstake(
  extrinsic: SubstrateExtrinsic<
    [operator: AccountId32, assetId: u128, amount: u128]
  >,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [operatorAccount, assetId, amount] = extrinsic.extrinsic.args;

  const delegator = await Delegator.get(signer);
  assert(delegator, `Delegator with ID ${signer} not found`);

  delegator.lastUpdateAt = blockNumber;

  const delegationId = `${delegator.id}-${operatorAccount.toString()}-${assetId.toString()}`;
  const delegation = await Delegation.get(delegationId);
  assert(delegation, `Delegation with ID ${delegationId} not found`);

  const unstakeRequest = await UnstakeRequest.get(delegationId);
  assert(unstakeRequest, `Unstake request with ID ${delegationId} not found`);

  unstakeRequest.currentStatus = UnstakeRequestStatus.CANCELLED;
  unstakeRequest.currentAmount -= amount.toBigInt();
  unstakeRequest.updatedAt = blockNumber;

  const unstakeRequestHistory = UnstakeRequestHistory.create({
    id: `${unstakeRequest.id}-${blockNumber.toString()}`,
    unstakeRequestId: unstakeRequest.id,
    status: UnstakeRequestStatus.CANCELLED,
    amount: amount.toBigInt(),
    blockNumber,
  });

  delegation.totalAmount += amount.toBigInt();
  if (unstakeRequest.currentAmount === 0n) {
    delegation.hasActiveUnstakeRequest = false;
  }

  await Promise.all([
    delegator.save(),
    unstakeRequest.save(),
    unstakeRequestHistory.save(),
    delegation.save(),
  ]);
}
