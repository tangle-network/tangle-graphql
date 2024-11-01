import { u64, u8, Vec } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { TanglePrimitivesServicesField } from '@polkadot/types/lookup';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { JobCall, JobResult, Service } from '../../../types';
import getAndAssertAccount from '../../../utils/getAndAssertAccount';

export default async function handleJobResultSubmitted(
  event: SubstrateEvent<
    [
      operator: AccountId32,
      serviceId: u64,
      callId: u64,
      job: u8,
      result: Vec<TanglePrimitivesServicesField>,
    ]
  >,
) {
  const [operator, serviceId, callId] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const operatorAccount = await getAndAssertAccount(
    operator.toString(),
    blockNumber,
  );

  const service = await Service.get(serviceId.toString());
  assert(service, `Service ${serviceId} not found`);

  const jobCall = await JobCall.get(callId.toString());
  assert(jobCall, `Job call ${callId} not found`);

  const jobResult = JobResult.create({
    id: `${service.id}-${jobCall.id}`,
    jobCallId: jobCall.id,
    serviceId: service.id,
    operatorId: operatorAccount.id,
    createdAt: blockNumber,
  });

  await Promise.all([jobResult.save(), operatorAccount.save()]);
}
