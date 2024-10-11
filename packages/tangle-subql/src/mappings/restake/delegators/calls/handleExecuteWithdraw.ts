import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import { Delegator, WithdrawRequest } from 'tangle-subql/types';
import getExtrinsicInfo from 'tangle-subql/utils/getExtrinsicInfo';

export default async function handleExecuteWithdraw(
  extrinsic: SubstrateExtrinsic,
) {
  const { signer } = getExtrinsicInfo(extrinsic);

  const delegator = await Delegator.get(signer);
  assert(delegator, `Delegator with ID ${signer} not found`);

  const requests = await WithdrawRequest.getByDelegatorId(delegator.id);
  assert(
    Array.isArray(requests),
    `Expected an array of requests, but got ${typeof requests}`,
  );

  /**
   * TODO (@AtelyPham):
   * Currently, there's no way to filter out executable requests
   * as we can't access round data from the pallet to determine
   * which requests are ready for execution.
   *
   * Potential solution:
   * We might need to emit the round data when a withdraw request is scheduled.
   * This would allow us to track and determine executable requests accurately.
   */
}
