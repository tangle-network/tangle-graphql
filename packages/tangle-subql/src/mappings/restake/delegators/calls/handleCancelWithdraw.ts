import { u128 } from '@polkadot/types';
import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  Delegator,
  Deposit,
  WithdrawRequest,
  WithdrawRequestHistory,
  WithdrawRequestStatus,
} from 'tangle-subql/types';
import getExtrinsicInfo from 'tangle-subql/utils/getExtrinsicInfo';

export default async function handleCancelWithdraw(
  extrinsic: SubstrateExtrinsic<[assetId: u128, amount: u128]>,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [assetId, amount] = extrinsic.extrinsic.args;

  const delegator = await Delegator.get(signer);
  assert(delegator, `Delegator with ID ${signer} not found`);

  const depositId = `${delegator.id}-${assetId.toString()}`;
  const deposit = await Deposit.get(depositId);
  assert(deposit, `Deposit with ID ${depositId} not found`);

  const scheduledRequest = await WithdrawRequest.get(depositId);
  assert(
    scheduledRequest,
    `Scheduled withdraw request with ID ${depositId} not found`,
  );

  scheduledRequest.currentStatus = WithdrawRequestStatus.CANCELLED;
  scheduledRequest.currentAmount -= amount.toBigInt();
  scheduledRequest.updatedAt = blockNumber;

  const requestHistory = WithdrawRequestHistory.create({
    id: `${scheduledRequest.id}-${blockNumber.toString()}`,
    withdrawRequestId: scheduledRequest.id,
    status: WithdrawRequestStatus.CANCELLED,
    amount: amount.toBigInt(),
    blockNumber,
  });

  deposit.totalAmount += amount.toBigInt();
  if (scheduledRequest.currentAmount === 0n) {
    deposit.hasActiveWithdrawRequest = false;
  }

  await Promise.all([
    scheduledRequest.save(),
    requestHistory.save(),
    deposit.save(),
  ]);
}
