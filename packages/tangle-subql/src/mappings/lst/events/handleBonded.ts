import { bool, u128, u32 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import {
  LSTPool,
  LSTPoolMember,
  LSTPoolState,
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
    (await LSTPool.get(poolId.toString())) ??
    LSTPool.create({
      id: poolId.toString(),
      currentState: LSTPoolState.OPEN,
      totalStake: 0n,
    });

  pool.totalStake += bonded.toBigInt();

  if (joined.isTrue) {
    const poolMember = LSTPoolMember.create({
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
    const poolMember = await LSTPoolMember.get(
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
