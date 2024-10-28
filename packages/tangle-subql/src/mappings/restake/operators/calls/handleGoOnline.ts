import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import { Operator, OperatorStatus } from '../../../../types';
import createOperatorStatusChange from '../../../../utils/createOperatorStatusChange';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';
import getAndAssertAccount from '../../../../utils/getAndAssertAccount';

export default async function handleGoOnline(extrinsic: SubstrateExtrinsic) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);

  const operator = await Operator.get(signer);

  assert(operator, `Operator with ID ${signer} not found`);

  operator.currentStatus = OperatorStatus.ACTIVE;
  operator.lastUpdateAt = blockNumber;

  const operatorAccount = await getAndAssertAccount(operator.id, blockNumber);

  const statusChange = createOperatorStatusChange(
    signer,
    blockNumber,
    operator.id,
    OperatorStatus.ACTIVE,
  );

  await Promise.all([
    operator.save(),
    operatorAccount.save(),
    statusChange.save(),
  ]);
}
