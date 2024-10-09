import type { SubstrateExtrinsic } from '@subql/types';

export default function getExtrinsicInfo(extrinsic: SubstrateExtrinsic) {
  return {
    signer: extrinsic.extrinsic.signer.toString(),
    blockNumber: extrinsic.block.block.header.number.toNumber(),
  };
}
