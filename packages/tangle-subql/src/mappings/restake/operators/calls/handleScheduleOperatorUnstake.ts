import { u128 } from '@polkadot/types';
import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  BondChangeAction,
  Operator,
  OperatorBondChange,
} from '../../../../types';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';

export default async function handleScheduleOperatorUnstake(
  extrinsic: SubstrateExtrinsic<[unstakeAmount: u128]>,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [unstakeAmount] = extrinsic.extrinsic.args;

  const operator = await Operator.get(signer);

  assert(operator, `Operator with ID ${signer} not found`);

  operator.lastUpdateAt = blockNumber;
  operator.scheduledUnstakeAmount = unstakeAmount.toBigInt();

  const bondChange = OperatorBondChange.create({
    id: `${signer}-${blockNumber}`,
    action: BondChangeAction.DECREASE_SCHEDULED,
    blockNumber,
    operatorId: operator.id,
    amount: unstakeAmount.toBigInt(),
  });

  await Promise.all([operator.save(), bondChange.save()]);
}
