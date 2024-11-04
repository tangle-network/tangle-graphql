import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  BondChangeAction,
  Operator,
  OperatorBondChange,
  OperatorStatus,
} from '../../../../types';
import createOperatorStatusChange from '../../../../utils/createOperatorStatusChange';
import getAndAssertAccount from '../../../../utils/getAndAssertAccount';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';

export default async function handleExecuteLeaveOperators(
  extrinsic: SubstrateExtrinsic,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);

  const operator = await Operator.get(signer);

  assert(operator, `Operator with ID ${signer} not found`);

  operator.currentStatus = OperatorStatus.OFFLINE;
  operator.lastUpdateAt = blockNumber;

  const operatorAccount = await getAndAssertAccount(operator.id, blockNumber);

  const statusChange = createOperatorStatusChange(
    signer,
    blockNumber,
    operator.id,
    OperatorStatus.OFFLINE,
  );

  const bondChange = OperatorBondChange.create({
    id: `${signer}-${blockNumber}`,
    action: BondChangeAction.DECREASE_EXECUTED,
    amount: operator.currentStake,
    blockNumber,
    operatorId: signer,
  });

  await Promise.all([
    operator.save(),
    operatorAccount.save(),
    statusChange.save(),
    bondChange.save(),
  ]);
}
