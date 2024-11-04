import { u64 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { Account, Operator, Service, ServiceOperator } from '../../../types';
import getAndAssertAccount from '../../../utils/getAndAssertAccount';

export default async function handleServiceTerminated(
  event: SubstrateEvent<[owner: AccountId32, serviceId: u64, blueprintId: u64]>,
) {
  const [owner, serviceId] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const ownerAccount = await getAndAssertAccount(owner.toString(), blockNumber);

  const service = await Service.get(serviceId.toString());
  assert(service, 'Service not found');

  service.terminatedAt = blockNumber;

  await Promise.all([service.save(), ownerAccount.save()]);

  const serviceOperators =
    (await ServiceOperator.getByServiceId(service.id)) ?? [];

  for (const serviceOperator of serviceOperators) {
    const operator = await Operator.get(serviceOperator.operatorId);
    if (operator === undefined) {
      logger.error(`Operator ${serviceOperator.operatorId} not found`);
      continue;
    }

    operator.totalServices -= 1;
    const operatorAccount = await Account.get(operator.accountId);
    if (operatorAccount === undefined) {
      logger.error(`Account ${operator.accountId} not found`);
    } else {
      operatorAccount.lastUpdateAt = blockNumber;
    }

    await Promise.all([
      operator.save(),
      serviceOperator.save(),
      operatorAccount?.save(),
    ]);
  }
}
