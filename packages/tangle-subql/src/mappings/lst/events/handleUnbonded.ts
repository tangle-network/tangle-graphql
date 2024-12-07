import { u128, u32 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { LstPool, LstPoolMember, MemberStakeChange } from '../../../types';
import getAndAssertAccount from '../../../utils/getAndAssertAccount';

export default async function handleUnbonded(
  event: SubstrateEvent<
    [member: AccountId32, poolId: u32, balance: u128, points: u128, era: u32]
  >,
) {
  const [member, poolId, balance] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const pool = await LstPool.get(poolId.toString());

  assert(pool, 'Pool not found');

  pool.totalStake -= balance.toBigInt();

  const poolMember = await LstPoolMember.get(
    `${poolId.toString()}-${member.toString()}`,
  );
  assert(poolMember, 'Pool member not found');

  const account = await getAndAssertAccount(poolMember.accountId, blockNumber);

  poolMember.currentStake -= balance.toBigInt();

  const stakeChange = MemberStakeChange.create({
    id: `${poolMember.id}-${blockNumber}`,
    memberId: poolMember.id,
    amount: -balance.toBigInt(),
    blockNumber,
  });

  await Promise.all([
    account.save(),
    pool.save(),
    poolMember.save(),
    stakeChange.save(),
  ]);
}
