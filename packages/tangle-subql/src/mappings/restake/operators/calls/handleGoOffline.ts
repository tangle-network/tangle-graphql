import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import { Operator, OperatorStatus } from '../../../../types';
import createOperatorStatusChange from '../../../../utils/createOperatorStatusChange';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';

export default async function handleGoOffline(extrinsic: SubstrateExtrinsic) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);

  const operator = await Operator.get(signer);

  assert(operator, `Operator with ID ${signer} not found`);

  operator.currentStatus = OperatorStatus.OFFLINE;
  operator.lastUpdateAt = blockNumber;

  const statusChange = createOperatorStatusChange(
    signer,
    blockNumber,
    operator.id,
    OperatorStatus.OFFLINE,
  );

  await Promise.all([operator.save(), statusChange.save()]);
}
