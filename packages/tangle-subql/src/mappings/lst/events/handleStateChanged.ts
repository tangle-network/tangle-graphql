import { u32 } from '@polkadot/types';
import { PalletTangleLstPoolsPoolState } from '@polkadot/types/lookup';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { LstPool, LstPoolState, LstPoolStateChange } from '../../../types';

export default async function handleStateChanged(
  event: SubstrateEvent<[poolId: u32, newState: PalletTangleLstPoolsPoolState]>,
) {
  const [poolId, newState] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const pool = await LstPool.get(poolId.toString());

  assert(pool, 'Pool not found');

  const state = convertState(newState);

  const stateChange = LstPoolStateChange.create({
    id: `${poolId.toString()}-${blockNumber}`,
    lstPoolId: poolId.toString(),
    state,
    blockNumber,
  });

  pool.currentState = state;

  await Promise.all([pool.save(), stateChange.save()]);
}

function convertState(state: PalletTangleLstPoolsPoolState): LstPoolState {
  switch (state.type) {
    case 'Open':
      return LstPoolState.OPEN;

    case 'Blocked':
      return LstPoolState.CLOSED;

    case 'Destroying':
      return LstPoolState.DESTROYING;

    default:
      throw new Error(`Unknown state: ${state.type}`);
  }
}
