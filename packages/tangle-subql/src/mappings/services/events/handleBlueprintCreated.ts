import { u64 } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';
import { SubstrateEvent } from '@subql/types';
import { Blueprint } from '../../../types';
import ensureAccount from '../../../utils/ensureAccount';

export default async function handleBlueprintCreated(
  event: SubstrateEvent<[owner: AccountId32, blueprintId: u64]>,
) {
  const [owner, blueprintId] = event.event.data;
  const blockNumber = event.block.block.header.number.toNumber();

  const account = await ensureAccount(owner.toString(), blockNumber);

  const blueprint = Blueprint.create({
    id: blueprintId.toString(),
    ownerId: account.id,
    createdAt: blockNumber,
  });

  account.lastUpdateAt = blockNumber;

  await Promise.all([blueprint.save(), account.save()]);
}
