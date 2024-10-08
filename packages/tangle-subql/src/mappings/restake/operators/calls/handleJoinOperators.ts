import { u128 } from '@polkadot/types';
import type { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  BondChangeAction,
  Operator,
  OperatorBondChange,
  OperatorStatus,
} from 'tangle-subql/types';
import createOperatorStatusChange from 'tangle-subql/utils/createOperatorStatusChange';
import getExtrinsicInfo from 'tangle-subql/utils/getExtrinsicInfo';

export default async function handleJoinOperators(
  extrinsic: SubstrateExtrinsic<[bondAmount: u128]>,
) {
  const { signer, bondAmount, blockNumber } = extractExtrinsicData(extrinsic);

  const operator = await Operator.get(signer);

  await createOrUpdateOperator(
    signer,
    blockNumber,
    bondAmount.toBigInt(),
    operator,
  );
}

function extractExtrinsicData(
  extrinsic: SubstrateExtrinsic<[bondAmount: u128]>,
) {
  const { signer, blockNumber } = getExtrinsicInfo(extrinsic);
  const [bondAmount] = extrinsic.extrinsic.args;

  assert(signer, 'Signer is missing for JoinOperators extrinsic');
  assert(
    bondAmount instanceof u128,
    '`bondAmount` must be an instance of u128',
  );

  return { signer, bondAmount, blockNumber };
}

async function createOrUpdateOperator(
  signer: string,
  blockNumber: number,
  bondAmount: bigint,
  existingOperator?: Operator,
) {
  const operator =
    existingOperator ??
    Operator.create({
      id: signer,
      currentStake: bondAmount,
      joinedAt: blockNumber,
      currentStatus: OperatorStatus.ACTIVE,
      lastUpdateAt: blockNumber,
    });

  // If the operator already exists, update their status to ACTIVE,
  // set the last update to the current block number,
  // and clear any previously scheduled leave
  if (existingOperator !== undefined) {
    operator.currentStatus = OperatorStatus.ACTIVE;
    operator.lastUpdateAt = blockNumber;
  }

  const statusChange = createOperatorStatusChange(
    signer,
    blockNumber,
    operator.id,
    OperatorStatus.ACTIVE,
  );

  const bondChange = createBondChange(
    signer,
    blockNumber,
    bondAmount,
    operator.id,
  );

  await Promise.all([operator.save(), statusChange.save(), bondChange.save()]);

  return operator;
}

function createBondChange(
  signer: string,
  blockNumber: number,
  amount: bigint,
  operatorId: string,
) {
  return OperatorBondChange.create({
    id: `${signer}-${blockNumber}`,
    operatorId,
    blockNumber,
    amount,
    action: BondChangeAction.INCREASE,
  });
}
