import { u128, u64, Vec } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import {
  Blueprint,
  Operator,
  ServiceRequest,
  ServiceRequestOperator,
} from '../../../types';
import ensureAccount from '../../../utils/ensureAccount';

export default async function handleServiceRequested(
  event: SubstrateEvent<
    [
      owner: AccountId32,
      requestId: u64,
      blueprintId: u64,
      pendingApprovals: Vec<AccountId32>,
      approved: Vec<AccountId32>,
      assets: Vec<u128>,
    ]
  >,
) {
  const [
    ownerAccountId,
    requestId,
    blueprintId,
    pendingApprovals,
    _approved,
    assets,
  ] = event.event.data;

  const blockNumber = event.block.block.header.number.toNumber();

  const ownerAccount = await ensureAccount(
    ownerAccountId.toString(),
    blockNumber,
  );
  ownerAccount.lastUpdateAt = blockNumber;

  const blueprint = await Blueprint.get(blueprintId.toString());
  assert(blueprint, 'Blueprint not found');

  const serviceRequest = ServiceRequest.create({
    id: requestId.toString(),
    ownerId: ownerAccount.id,
    blueprintId: blueprint.id,
    assetIds: assets.map((asset) => asset.toBigInt()),
    createdAt: blockNumber,
  });

  // Save initial entities
  await Promise.all([ownerAccount.save(), serviceRequest.save()]);

  // Update operator entities
  const operatorPromises = await Promise.all(
    pendingApprovals.map(async (accountId) => {
      const operator = await Operator.get(accountId.toString());
      if (!operator) {
        console.warn(`Operator not found for account: ${accountId.toString()}`);
        return null;
      }

      operator.totalServiceRequests += 1;
      operator.lastUpdateAt = blockNumber;

      const serviceRequestOperator = ServiceRequestOperator.create({
        id: `${serviceRequest.id}-${operator.id}`,
        serviceRequestId: serviceRequest.id,
        operatorId: operator.id,
        createdAt: blockNumber,
      });

      return [operator, serviceRequestOperator] as const;
    }),
  );

  // Save operator updates
  await Promise.all(
    operatorPromises
      .filter(
        (result): result is [Operator, ServiceRequestOperator] =>
          result !== null,
      )
      .flatMap(([operator, serviceRequestOperator]) => [
        operator.save(),
        serviceRequestOperator.save(),
      ]),
  );
}
