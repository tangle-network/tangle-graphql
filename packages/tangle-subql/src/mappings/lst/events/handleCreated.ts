import { u32 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import { LstPool, LstPoolState, LstPoolStateChange } from '../../../types';

export default async function handleCreated(
  event: SubstrateEvent<[depositor: AccountId32, poolId: u32]>,
) {
  const [, poolId] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const pool =
    (await LstPool.get(poolId.toString())) ??
    LstPool.create({
      id: poolId.toString(),
      currentState: LstPoolState.OPEN,
      totalStake: 0n,
    });

  pool.currentState = LstPoolState.OPEN;
  pool.totalStake = 0n;

  const stateChange = LstPoolStateChange.create({
    id: `${poolId.toString()}-${blockNumber}`,
    lstPoolId: poolId.toString(),
    state: LstPoolState.OPEN,
    blockNumber,
  });

  await Promise.all([pool.save(), stateChange.save()]);
}
