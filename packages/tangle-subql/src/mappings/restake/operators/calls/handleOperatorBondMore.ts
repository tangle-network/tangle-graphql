import { u128 } from '@polkadot/types';
import { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  BondChangeAction,
  Operator,
  OperatorBondChange,
} from '../../../../types';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';

export default async function handleOperatorBondMore(
  extrinsic: SubstrateExtrinsic<[additionalBond: u128]>,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [additionalBond] = extrinsic.extrinsic.args;

  const operator = await Operator.get(signer);

  assert(operator, `Operator with ID ${signer} not found`);

  operator.currentStake += additionalBond.toBigInt();
  operator.lastUpdateAt = blockNumber;

  const bondChange = OperatorBondChange.create({
    id: `${signer}-${blockNumber}`,
    action: BondChangeAction.INCREASE,
    blockNumber,
    operatorId: operator.id,
    amount: additionalBond.toBigInt(),
  });

  await Promise.all([operator.save(), bondChange.save()]);
}
