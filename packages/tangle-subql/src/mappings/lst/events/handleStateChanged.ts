import { u32 } from '@polkadot/types';
import { PalletTangleLstPoolsPoolState } from '@polkadot/types/lookup';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { LSTPool, LSTPoolState, LSTPoolStateChange } from '../../../types';

export default async function handleStateChanged(
  event: SubstrateEvent<[poolId: u32, newState: PalletTangleLstPoolsPoolState]>,
) {
  const [poolId, newState] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const pool = await LSTPool.get(poolId.toString());

  assert(pool, 'Pool not found');

  const state = convertState(newState);

  const stateChange = LSTPoolStateChange.create({
    id: `${poolId.toString()}-${blockNumber}`,
    lstPoolId: poolId.toString(),
    state,
    blockNumber,
  });

  pool.currentState = state;

  await Promise.all([pool.save(), stateChange.save()]);
}

function convertState(state: PalletTangleLstPoolsPoolState): LSTPoolState {
  switch (state.type) {
    case 'Open':
      return LSTPoolState.OPEN;

    case 'Blocked':
      return LSTPoolState.CLOSED;

    case 'Destroying':
      return LSTPoolState.DESTROYING;

    default:
      throw new Error(`Unknown state: ${state.type}`);
  }
}
