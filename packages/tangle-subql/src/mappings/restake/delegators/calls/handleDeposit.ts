import { u128 } from '@polkadot/types';
import { SubstrateExtrinsic } from '@subql/types';
import { Delegator, Deposit, DepositHistory } from '../../../../types';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';
import ensureAccount from '../../../../utils/ensureAccount';

export default async function handleDeposit(
  extrinsic: SubstrateExtrinsic<[assetId: u128, amount: u128]>,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [assetId, amount] = extrinsic.extrinsic.args;

  const account = await ensureAccount(signer, blockNumber);

  let delegator = await Delegator.get(signer);
  if (delegator === undefined) {
    delegator = Delegator.create({
      id: signer,
      joinedAt: blockNumber,
      lastUpdateAt: blockNumber,
      accountId: account.id,
    });
  } else {
    delegator.lastUpdateAt = blockNumber;
  }

  const depositId = `${delegator.id}-${assetId.toString()}`;
  let deposit = await Deposit.get(depositId);

  if (deposit === undefined) {
    deposit = Deposit.create({
      id: depositId,
      delegatorId: delegator.id,
      hasActiveWithdrawRequest: false,
      assetId: assetId.toBigInt(),
      totalAmount: 0n,
    });
  }

  deposit.totalAmount += amount.toBigInt();

  const depositHistory = DepositHistory.create({
    id: `${deposit.id}-${blockNumber}`,
    depositId: deposit.id,
    amount: amount.toBigInt(),
    blockNumber,
  });

  account.lastUpdateAt = blockNumber;

  await Promise.all([
    delegator.save(),
    deposit.save(),
    depositHistory.save(),
    account.save(),
  ]);
}
