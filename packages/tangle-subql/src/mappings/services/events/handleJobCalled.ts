import { u64, u8, Vec } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { TanglePrimitivesServicesField } from '@polkadot/types/lookup';
import { SubstrateEvent } from '@subql/types';
import assert from 'assert';
import { JobCall, Service } from '../../../types';
import ensureAccount from '../../../utils/ensureAccount';

export default async function handleJobCalled(
  event: SubstrateEvent<
    [
      caller: AccountId32,
      serviceId: u64,
      callId: u64,
      job: u8,
      args: Vec<TanglePrimitivesServicesField>,
    ]
  >,
) {
  const [caller, serviceId, callId, job] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const account = await ensureAccount(caller.toString(), blockNumber);
  account.lastUpdateAt = blockNumber;

  const service = await Service.get(serviceId.toString());
  assert(service, `Service ${serviceId} not found`);

  const jobCall = JobCall.create({
    id: callId.toString(),
    callerId: account.id,
    createdAt: blockNumber,
    serviceId: service.id,
    jobId: job.toNumber(),
  });

  await Promise.all([jobCall.save(), account.save()]);
}
