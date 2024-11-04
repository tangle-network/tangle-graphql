import { SubstrateEvent, SubstrateExtrinsic } from '@subql/types';
import handleJoinOperators from './restake/operators/calls/handleJoinOperators';
import { bool, u128, u32 } from '@polkadot/types';
import handleScheduleLeaveOperators from './restake/operators/calls/handleScheduleLeaveOperators';
import handleCancelLeaveOperators from './restake/operators/calls/handleCancelLeaveOperators';
import handleExecuteLeaveOperators from './restake/operators/calls/handleExecuteLeaveOperators';
import handleOperatorBondMore from './restake/operators/calls/handleOperatorBondMore';
import handleScheduleOperatorUnstake from './restake/operators/calls/handleScheduleOperatorUnstake';
import handleExecuteOperatorUnstake from './restake/operators/calls/handleExecuteOperatorUnstake';
import handleCancelOperatorUnstake from './restake/operators/calls/handleCancelOperatorUnstake';
import handleGoOnline from './restake/operators/calls/handleGoOnline';
import handleGoOffline from './restake/operators/calls/handleGoOffline';
import handleDeposit from './restake/delegators/calls/handleDeposit';
import handleScheduleWithdraw from './restake/delegators/calls/handleScheduleWithdraw';
import handleExecuteWithdraw from './restake/delegators/calls/handleExecuteWithdraw';
import handleCancelWithdraw from './restake/delegators/calls/handleCancelWithdraw';
import handleDelegate from './restake/delegators/calls/handleDelegate';
import { AccountId32 } from '@polkadot/types/interfaces';
import handleScheduleUnstake from './restake/delegators/calls/handleScheduleUnstake';
import handleExecuteUnstake from './restake/delegators/calls/handleExecuteUnstake';
import handleCancelUnstake from './restake/delegators/calls/handleCancelUnstake';
import handleStateChanged from './lst/events/handleStateChanged';
import { PalletTangleLstPoolsPoolState } from '@polkadot/types/lookup';
import handleUnbonded from './lst/events/handleUnbonded';
import handleBonded from './lst/events/handleBonded';
import handleCreated from './lst/events/handleCreated';

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  const { section, method } = extrinsic.extrinsic.method;

  switch (method) {
    case 'joinOperators': {
      return handleJoinOperators(
        extrinsic as SubstrateExtrinsic<[bondAmount: u128]>,
      );
    }

    case 'scheduleLeaveOperators': {
      return handleScheduleLeaveOperators(extrinsic);
    }

    case 'cancelLeaveOperators': {
      return handleCancelLeaveOperators(extrinsic);
    }

    case 'executeLeaveOperators': {
      return handleExecuteLeaveOperators(extrinsic);
    }

    case 'operatorBondMore': {
      return handleOperatorBondMore(
        extrinsic as SubstrateExtrinsic<[additionalBond: u128]>,
      );
    }

    case 'scheduleOperatorUnstake': {
      return handleScheduleOperatorUnstake(
        extrinsic as SubstrateExtrinsic<[unstakeAmount: u128]>,
      );
    }

    case 'executeOperatorUnstake': {
      return handleExecuteOperatorUnstake(extrinsic);
    }

    case 'cancelOperatorUnstake': {
      return handleCancelOperatorUnstake(extrinsic);
    }

    case 'goOnline': {
      return handleGoOnline(extrinsic);
    }

    case 'goOffline': {
      return handleGoOffline(extrinsic);
    }

    case 'deposit': {
      return handleDeposit(
        extrinsic as SubstrateExtrinsic<[assetId: u128, amount: u128]>,
      );
    }

    case 'scheduleWithdraw': {
      return handleScheduleWithdraw(
        extrinsic as SubstrateExtrinsic<[assetId: u128, amount: u128]>,
      );
    }

    case 'executeWithdraw': {
      return handleExecuteWithdraw(extrinsic);
    }

    case 'cancelWithdraw': {
      return handleCancelWithdraw(
        extrinsic as SubstrateExtrinsic<[assetId: u128, amount: u128]>,
      );
    }

    case 'delegate': {
      return handleDelegate(
        extrinsic as SubstrateExtrinsic<
          [operator: AccountId32, assetId: u128, amount: u128]
        >,
      );
    }

    case 'scheduleDelegatorUnstake': {
      return handleScheduleUnstake(
        extrinsic as SubstrateExtrinsic<
          [operator: AccountId32, assetId: u128, amount: u128]
        >,
      );
    }

    case 'executeDelegatorUnstake': {
      return handleExecuteUnstake(extrinsic);
    }

    case 'cancelDelegatorUnstake': {
      return handleCancelUnstake(
        extrinsic as SubstrateExtrinsic<
          [operator: AccountId32, assetId: u128, amount: u128]
        >,
      );
    }

    default: {
      logger.warn(`Unhandled extrinsic: ${method}`, {
        method,
        section,
      });
    }
  }
}

export async function handleLstStateChanged(
  event: SubstrateEvent,
): Promise<void> {
  return handleStateChanged(
    event as SubstrateEvent<
      [poolId: u32, newState: PalletTangleLstPoolsPoolState]
    >,
  );
}

export async function handleLstUnbonded(event: SubstrateEvent): Promise<void> {
  return handleUnbonded(
    event as SubstrateEvent<
      [member: AccountId32, poolId: u32, balance: u128, points: u128, era: u32]
    >,
  );
}

export async function handleLstBonded(event: SubstrateEvent): Promise<void> {
  return handleBonded(
    event as SubstrateEvent<
      [member: AccountId32, poolId: u32, bonded: u128, joined: bool]
    >,
  );
}

export async function handleLstCreated(event: SubstrateEvent): Promise<void> {
  return handleCreated(
    event as SubstrateEvent<[depositor: AccountId32, poolId: u32]>,
  );
}

export { default as handleBlueprintCreated } from './services/events/handleBlueprintCreated';
export { default as handleJobCalled } from './services/events/handleJobCalled';
export { default as handleJobResultSubmitted } from './services/events/handleJobResultSubmitted';
export { default as handleRegistered } from './services/events/handleRegistered';
export { default as handleServiceInitiated } from './services/events/handleServiceInitiated';
export { default as handleServiceRequestApproved } from './services/events/handleServiceRequestApproved';
export { default as handleServiceRequested } from './services/events/handleServiceRequested';
export { default as handleServiceRequestRejected } from './services/events/handleServiceRequestRejected';
export { default as handleServiceTerminated } from './services/events/handleServiceTerminated';
export { default as handleUnregistered } from './services/events/handleUnregistered';
