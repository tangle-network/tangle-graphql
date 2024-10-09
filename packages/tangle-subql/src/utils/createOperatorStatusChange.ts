import { type OperatorStatus, OperatorStatusChange } from '../types';

export default function createOperatorStatusChange(
  signer: string,
  blockNumber: number,
  operatorId: string,
  status: OperatorStatus,
) {
  return OperatorStatusChange.create({
    id: `${signer}-${blockNumber}`,
    blockNumber,
    operatorId,
    status,
  });
}
