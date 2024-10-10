import { SubstrateExtrinsic } from '@subql/types';
import '@webb-tools/tangle-substrate-types';
import assert from 'assert';
import {
  BondChangeAction,
  Operator,
  OperatorBondChange,
} from 'tangle-subql/types';
import getExtrinsicInfo from 'tangle-subql/utils/getExtrinsicInfo';

export default async function handleExecuteOperatorUnstake(
  extrinsic: SubstrateExtrinsic,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);

  const operator = await Operator.get(signer);

  assert(operator, `Operator with ID ${signer} not found`);

  const unstakeAmount = operator.scheduledUnstakeAmount ?? 0n;

  operator.lastUpdateAt = blockNumber;
  operator.currentStake -= unstakeAmount;
  operator.scheduledUnstakeAmount = undefined;

  const bondChange = OperatorBondChange.create({
    id: `${signer}-${blockNumber}`,
    action: BondChangeAction.DECREASE_EXECUTED,
    blockNumber,
    operatorId: operator.id,
    amount: unstakeAmount,
  });

  await Promise.all([operator.save(), bondChange.save()]);
}
