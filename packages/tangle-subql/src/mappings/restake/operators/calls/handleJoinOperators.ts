import { u128 } from '@polkadot/types';
import type { SubstrateExtrinsic } from '@subql/types';
import assert from 'assert';
import {
  BondChangeAction,
  Operator,
  OperatorBondChange,
  OperatorStatus,
} from '../../../../types';
import createOperatorStatusChange from '../../../../utils/createOperatorStatusChange';
import getExtrinsicInfo from '../../../../utils/getExtrinsicInfo';
import ensureAccount from '../../../../utils/ensureAccount';

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

  return { signer, bondAmount, blockNumber };
}

async function createOrUpdateOperator(
  signer: string,
  blockNumber: number,
  bondAmount: bigint,
  existingOperator?: Operator,
) {
  const account = await ensureAccount(signer, blockNumber);

  const operator =
    existingOperator ??
    Operator.create({
      id: signer,
      accountId: account.id,
      currentStake: bondAmount,
      joinedAt: blockNumber,
      currentStatus: OperatorStatus.ACTIVE,
      lastUpdateAt: blockNumber,
      totalBlueprints: 0,
      totalServiceRequests: 0,
      totalServices: 0,
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

  account.lastUpdateAt = blockNumber;

  await Promise.all([
    operator.save(),
    statusChange.save(),
    bondChange.save(),
    account.save(),
  ]);

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
