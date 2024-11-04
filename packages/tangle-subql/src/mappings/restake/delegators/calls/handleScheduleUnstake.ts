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
} from '../../../../types';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';
import getAndAssertAccount from '../../../../utils/getAndAssertAccount';

export default async function handleScheduleUnstake(
  extrinsic: SubstrateExtrinsic<
    [operator: AccountId32, assetId: u128, amount: u128]
  >,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [operatorAccountId, assetId, amount] = extrinsic.extrinsic.args;

  const delegator = await Delegator.get(signer);
  assert(delegator, `Delegator with ID ${signer} not found`);
  delegator.lastUpdateAt = blockNumber;

  const account = await getAndAssertAccount(delegator.accountId, blockNumber);

  const operator = await Operator.get(operatorAccountId.toString());
  assert(
    operator,
    `Operator with ID ${operatorAccountId.toString()} not found`,
  );
  operator.lastUpdateAt = blockNumber;

  const operatorAccount = await getAndAssertAccount(
    operatorAccountId.toString(),
    blockNumber,
  );

  const delegationId = `${account.id}-${operator.id}-${assetId.toString()}`;
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
    account.save(),
    operator.save(),
    operatorAccount.save(),
    delegation.save(),
    unstakeRequest.save(),
    unstakeRequestHistory.save(),
  ]);
}
