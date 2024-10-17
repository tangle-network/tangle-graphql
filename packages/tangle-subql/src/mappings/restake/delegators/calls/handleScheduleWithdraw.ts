import { u128 } from '@polkadot/types';
import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  Delegator,
  Deposit,
  WithdrawRequest,
  WithdrawRequestHistory,
  WithdrawRequestStatus,
} from '../../../../types';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';

export default async function handleScheduleWithdraw(
  extrinsic: SubstrateExtrinsic<[assetId: u128, amount: u128]>,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [assetId, amount] = extrinsic.extrinsic.args;

  const delegator = await Delegator.get(signer);
  assert(delegator, `Delegator with ID ${signer} not found`);

  delegator.lastUpdateAt = blockNumber;

  const depositId = `${delegator.id}-${assetId.toString()}`;
  const deposit = await Deposit.get(depositId);
  assert(deposit, `Deposit with ID ${depositId} not found`);

  let request = await WithdrawRequest.get(depositId);

  if (request === undefined) {
    request = WithdrawRequest.create({
      id: depositId,
      delegatorId: delegator.id,
      depositId: deposit.id,
      assetId: assetId.toBigInt(),
      currentStatus: WithdrawRequestStatus.SCHEDULED,
      currentAmount: 0n, // Initialize with 0
      createdAt: blockNumber,
      updatedAt: blockNumber,
    });
  }

  // Update request properties
  request.currentStatus = WithdrawRequestStatus.SCHEDULED;
  request.currentAmount += amount.toBigInt();
  request.updatedAt = blockNumber;

  const requestHistory = WithdrawRequestHistory.create({
    id: `${request.id}-${blockNumber.toString()}`,
    withdrawRequestId: request.id,
    status: WithdrawRequestStatus.SCHEDULED,
    amount: amount.toBigInt(),
    blockNumber,
  });

  // Update deposit
  deposit.totalAmount -= amount.toBigInt();
  deposit.hasActiveWithdrawRequest = true;
  deposit.withdrawRequestId = request.id;

  // Save all entities
  await Promise.all([
    delegator.save(),
    request.save(),
    requestHistory.save(),
    deposit.save(),
  ]);
}
