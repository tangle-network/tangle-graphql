import { u128, u32 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { LstPool, LstPoolMember, MemberStakeChange } from '../../../types';

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

  poolMember.currentStake -= balance.toBigInt();

  const stakeChange = MemberStakeChange.create({
    id: `${poolId.toString()}-${member.toString()}-${blockNumber}`,
    memberId: member.toString(),
    amount: -balance.toBigInt(),
    blockNumber,
  });

  await Promise.all([pool.save(), poolMember.save(), stakeChange.save()]);
}
