import { bool, u128, u32 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import {
  LstPool,
  LstPoolMember,
  LstPoolState,
  MemberStakeChange,
} from '../../../types';

export default async function handleBonded(
  event: SubstrateEvent<
    [member: AccountId32, poolId: u32, bonded: u128, joined: bool]
  >,
) {
  const [member, poolId, bonded, joined] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const pool =
    (await LstPool.get(poolId.toString())) ??
    LstPool.create({
      id: poolId.toString(),
      currentState: LstPoolState.OPEN,
      totalStake: 0n,
    });

  pool.totalStake += bonded.toBigInt();

  if (joined.isTrue) {
    const poolMember = LstPoolMember.create({
      id: `${poolId.toString()}-${member.toString()}`,
      lstPoolId: poolId.toString(),
      memberId: member.toString(),
      currentStake: bonded.toBigInt(),
    });

    const stakeChange = MemberStakeChange.create({
      id: `${poolId.toString()}-${member.toString()}-${blockNumber}`,
      memberId: member.toString(),
      amount: bonded.toBigInt(),
      blockNumber,
    });

    await Promise.all([poolMember.save(), stakeChange.save()]);
  } else {
    const poolMember = await LstPoolMember.get(
      `${poolId.toString()}-${member.toString()}`,
    );

    assert(poolMember, 'Pool member not found');

    poolMember.currentStake = bonded.toBigInt();

    const stakeChange = MemberStakeChange.create({
      id: `${poolId.toString()}-${member.toString()}-${blockNumber}`,
      memberId: member.toString(),
      amount: bonded.toBigInt(),
      blockNumber,
    });

    await Promise.all([poolMember.save(), stakeChange.save()]);
  }
}
