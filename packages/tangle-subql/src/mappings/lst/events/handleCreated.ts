import { u32 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import { LSTPool, LSTPoolState, LSTPoolStateChange } from '../../../types';

export default async function handleCreated(
  event: SubstrateEvent<[depositor: AccountId32, poolId: u32]>,
) {
  const [, poolId] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const pool =
    (await LSTPool.get(poolId.toString())) ??
    LSTPool.create({
      id: poolId.toString(),
      currentState: LSTPoolState.OPEN,
      totalStake: 0n,
    });

  pool.currentState = LSTPoolState.OPEN;
  pool.totalStake = 0n;

  const stateChange = LSTPoolStateChange.create({
    id: `${poolId.toString()}-${blockNumber}`,
    lstPoolId: poolId.toString(),
    state: LSTPoolState.OPEN,
    blockNumber,
  });

  await Promise.all([pool.save(), stateChange.save()]);
}
