import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import { Operator, OperatorStatus } from 'tangle-subql/types';
import createOperatorStatusChange from 'tangle-subql/utils/createOperatorStatusChange';
import getExtrinsicInfo from 'tangle-subql/utils/getExtrinsicInfo';

export default async function handleScheduleLeaveOperators(
  extrinsic: SubstrateExtrinsic,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);

  const operator = await Operator.get(signer);

  assert(operator, `Operator with ID ${signer} not found`);

  operator.currentStatus = OperatorStatus.LEAVING;
  operator.lastUpdateAt = blockNumber;

  const statusChange = createOperatorStatusChange(
    signer,
    blockNumber,
    operator.id,
    OperatorStatus.LEAVING,
  );

  await Promise.all([operator.save(), statusChange.save()]);
}
