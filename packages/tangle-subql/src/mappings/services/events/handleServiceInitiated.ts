import { Option, u128, u64, Vec } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import {
  Blueprint,
  Operator,
  Service,
  ServiceOperator,
  ServiceRequest,
  ServiceRequestOperator,
} from '../../../types';
import getAndAssertAccount from '../../../utils/getAndAssertAccount';

export default async function handleServiceInitiated(
  event: SubstrateEvent<
    [
      owner: AccountId32,
      requestId: Option<u64>,
      serviceId: u64,
      blueprintId: u64,
      assets: Vec<u128>,
    ]
  >,
) {
  const [owner, requestId, serviceId, blueprintId, assets] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const ownerAccount = await getAndAssertAccount(owner.toString(), blockNumber);

  const blueprint = await Blueprint.get(blueprintId.toString());
  assert(blueprint, 'Blueprint not found');

  const serviceRequest = await ServiceRequest.get(requestId.toString());
  assert(serviceRequest, 'ServiceRequest not found');

  const service = Service.create({
    id: serviceId.toString(),
    serviceRequestId: serviceRequest.id,
    ownerId: ownerAccount.id,
    assetIds: assets.map((asset) => asset.toBigInt()),
    blueprintId: blueprint.id,
    createdAt: blockNumber,
  });

  await service.save();

  const serviceRequestOperators =
    (await ServiceRequestOperator.getByServiceRequestId(serviceRequest.id)) ??
    [];

  for (const serviceRequestOperator of serviceRequestOperators) {
    const operator = await Operator.get(serviceRequestOperator.operatorId);
    if (operator === undefined) {
      logger.error(`Operator ${serviceRequestOperator.operatorId} not found`);
      continue;
    }

    operator.totalServices += 1;

    const serviceOperator = ServiceOperator.create({
      id: `${service.id}-${operator.id}`,
      serviceId: service.id,
      operatorId: operator.id,
      createdAt: blockNumber,
    });

    await Promise.all([serviceOperator.save(), operator.save()]);
  }
}
