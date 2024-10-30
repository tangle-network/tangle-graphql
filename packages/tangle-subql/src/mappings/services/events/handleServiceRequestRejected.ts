import { u64 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { Operator, ServiceRequestOperator } from '../../../types';
import getAndAssertAccount from '../../../utils/getAndAssertAccount';

export default async function handleServiceRequestRejected(
  event: SubstrateEvent<
    [operator: AccountId32, requestId: u64, blueprintId: u64]
  >,
) {
  const [operatorAccountId, requestId] = event.event.data;

  const blockNumber = event.block.block.header.number.toNumber();

  const operatorAccount = await getAndAssertAccount(
    operatorAccountId.toString(),
    blockNumber,
  );

  const operator = await Operator.get(operatorAccount.id);
  assert(operator, 'Operator not found');

  const serviceRequestOperator = await ServiceRequestOperator.get(
    `${requestId}-${operator.id}`,
  );
  assert(serviceRequestOperator, 'ServiceRequestOperator not found');
  serviceRequestOperator.rejectedAt = blockNumber;

  await Promise.all([operatorAccount.save(), serviceRequestOperator.save()]);
}
