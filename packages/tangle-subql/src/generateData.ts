import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { formatBalance, stringToU8a } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import chalk from 'chalk';

const parseUnits = (value: string, decimals: number) => {
  const [integerPart, fractionalPart = ''] = value.split('.');
  const scaledIntegerPart =
    BigInt(integerPart) * BigInt(10) ** BigInt(decimals);
  const scaledFractionalPart = BigInt(fractionalPart.padEnd(decimals, '0'));
  const scaledValue = scaledIntegerPart + scaledFractionalPart;
  return scaledValue.toString();
};

// Constants
const CONSTANTS = {
  PALLET_ID: 'PotStake',
  TANGLE_LOCAL_WS_RPC_ENDPOINT: 'ws://127.0.0.1:9944',
  TANGLE_TOKEN_DECIMALS: 18,
  MINIMUM_BALANCE_UINT: '1',
  MINT_AMOUNT: '1000',
  POOL_ID: 1,
  LST_POOL_ID: 1,
  APY: 12,
  CAP: parseUnits('2000', 18),
};

// Utility functions
const logInfo = (message: string): void =>
  console.log(chalk.cyan(`ℹ️ ${message}`));

const logSuccess = (message: string): void =>
  console.log(chalk.green(`✅ ${message}\n`));

// Asset setup
type Asset = {
  id: number;
  symbol: string;
  decimals: number;
};

const ASSETS = {
  tgTEST: {
    id: 100,
    symbol: 'tgTEST',
    decimals: 18,
  } as const satisfies Asset,
  tgtTNT: {
    id: 101,
    symbol: 'tgtTNT',
    decimals: 18,
  } as const satisfies Asset,
};

// API and account setup
async function setupApiAndAccounts() {
  logInfo('Connecting to the local Tangle network...');
  const provider = new WsProvider(CONSTANTS.TANGLE_LOCAL_WS_RPC_ENDPOINT);
  const api = await ApiPromise.create({ provider, noInitWarn: true });
  logSuccess('Connected to the local Tangle network!');

  const keyring = new Keyring({ type: 'sr25519' });
  const accounts = {
    ALICE_SUDO: keyring.addFromUri('//Alice'),
    BOB: keyring.addFromUri('//Bob'),
    CHARLIE: keyring.addFromUri('//Charlie'),
    DAVE: keyring.addFromUri('//Dave'),
  };

  return { api, accounts };
}

// Chain metadata
async function fetchChainMetadata(api: ApiPromise) {
  logInfo('Fetching chain metadata...');
  const chain = await api.rpc.system.chain();
  const decimals = api.registry.chainDecimals[0] || 18;
  const ss58Format =
    typeof api.registry.chainSS58 === 'number' ? api.registry.chainSS58 : 42;
  const tokenSymbol = (api.registry.chainTokens ||
    formatBalance.getDefaults().unit)[0];

  logSuccess(
    `Chain metadata: ${JSON.stringify({ chain, decimals, ss58Format, tokenSymbol }, null, 2)}`,
  );
  return { chain, decimals, ss58Format, tokenSymbol };
}

// New utility function
async function getAccountNonce(
  api: ApiPromise,
  account: KeyringPair,
): Promise<number> {
  return (await api.rpc.system.accountNextIndex(account.address)).toNumber();
}

// Batch transactions
async function batchTxes(
  api: ApiPromise,
  account: KeyringPair,
  txes: Parameters<typeof api.tx.utility.batch>[0],
) {
  const nonce = await getAccountNonce(api, account);
  return api.tx.utility.batchAll(txes).signAndSend(account, { nonce });
}

// Asset creation and minting
async function setupAssets(api: ApiPromise, account: KeyringPair) {
  logInfo('Creating two assets...');
  await batchTxes(api, account, [
    api.tx.assets.create(
      ASSETS.tgTEST.id,
      account.address,
      parseUnits(CONSTANTS.MINIMUM_BALANCE_UINT, ASSETS.tgTEST.decimals),
    ),
    api.tx.assets.create(
      ASSETS.tgtTNT.id,
      account.address,
      parseUnits(CONSTANTS.MINIMUM_BALANCE_UINT, ASSETS.tgtTNT.decimals),
    ),
  ]);

  logInfo('Adding asset metadata...');
  await batchTxes(api, account, [
    api.tx.assets.setMetadata(
      ASSETS.tgTEST.id,
      ASSETS.tgTEST.symbol,
      ASSETS.tgTEST.symbol,
      ASSETS.tgTEST.decimals,
    ),
    api.tx.assets.setMetadata(
      ASSETS.tgtTNT.id,
      ASSETS.tgtTNT.symbol,
      ASSETS.tgtTNT.symbol,
      ASSETS.tgtTNT.decimals,
    ),
  ]);

  logInfo('Minting assets to Alice and Bob...');
  await batchTxes(api, account, [
    api.tx.assets.mint(
      ASSETS.tgTEST.id,
      account.address,
      parseUnits(CONSTANTS.MINT_AMOUNT, ASSETS.tgTEST.decimals),
    ),
    api.tx.assets.mint(
      ASSETS.tgtTNT.id,
      account.address,
      parseUnits(CONSTANTS.MINT_AMOUNT, ASSETS.tgtTNT.decimals),
    ),
    api.tx.assets.mint(
      ASSETS.tgTEST.id,
      account.address,
      parseUnits(CONSTANTS.MINT_AMOUNT, ASSETS.tgTEST.decimals),
    ),
    api.tx.assets.mint(
      ASSETS.tgtTNT.id,
      account.address,
      parseUnits(CONSTANTS.MINT_AMOUNT, ASSETS.tgtTNT.decimals),
    ),
  ]);
  logSuccess('Assets created and minted successfully!');
}

// Multi-asset delegation setup
async function setupMultiAssetDelegation(
  api: ApiPromise,
  account: KeyringPair,
) {
  const PALLET_ACCOUNT = encodeAddress(
    stringToU8a(('modl' + CONSTANTS.PALLET_ID).padEnd(32, '\0')),
  );

  logInfo('Transfer native token to multi-asset-delegation pallet...');
  const nonce = await getAccountNonce(api, account);
  await api.tx.balances
    .transferKeepAlive(
      PALLET_ACCOUNT,
      parseUnits('1', CONSTANTS.TANGLE_TOKEN_DECIMALS),
    )
    .signAndSend(account, { nonce });
  logSuccess('Native token transferred to multi-asset-delegation pallet!');

  logInfo('Create and set reward for vault...');
  await batchTxes(api, account, [
    api.tx.multiAssetDelegation.manageAssetInVault(
      CONSTANTS.POOL_ID,
      ASSETS.tgTEST.id,
      'Add',
    ),
    api.tx.multiAssetDelegation.manageAssetInVault(
      CONSTANTS.POOL_ID,
      ASSETS.tgtTNT.id,
      'Add',
    ),
    api.tx.sudo.sudo(
      api.tx.multiAssetDelegation.setIncentiveApyAndCap(
        CONSTANTS.POOL_ID,
        CONSTANTS.APY,
        CONSTANTS.CAP,
      ),
    ),
  ]);
  logSuccess('Pool created!');
}

// Join operators
async function joinOperators(api: ApiPromise, account: KeyringPair) {
  logInfo(`Join operators for ${account.address}`);
  const nonce = await getAccountNonce(api, account);
  await api.tx.multiAssetDelegation
    .joinOperators(
      parseUnits(
        CONSTANTS.MINIMUM_BALANCE_UINT,
        CONSTANTS.TANGLE_TOKEN_DECIMALS,
      ),
    )
    .signAndSend(account, { nonce });
  logSuccess(`${account.address} joined the operators successfully!`);
}

// LST setup
async function createLstPool(api: ApiPromise, account: KeyringPair) {
  const tx = api.tx.lst.create(
    parseUnits('1', CONSTANTS.TANGLE_TOKEN_DECIMALS),
    account.address,
    account.address,
    account.address,
    'My LST Pool',
  );
  const nonce = await getAccountNonce(api, account);

  return new Promise((resolve) =>
    tx.signAndSend(account, { nonce }, (result) => {
      if (result.status.isFinalized) {
        logSuccess('LST pool created!');
        resolve(undefined);
      }
    }),
  );
}

async function joinLstPool(api: ApiPromise, account: KeyringPair) {
  const poolId = CONSTANTS.LST_POOL_ID;
  const tx = api.tx.lst.join(
    parseUnits('0.5', CONSTANTS.TANGLE_TOKEN_DECIMALS),
    poolId,
  );
  const nonce = await getAccountNonce(api, account);
  return new Promise((resolve) =>
    tx.signAndSend(account, { nonce }, (result) => {
      if (result.status.isFinalized) {
        logSuccess(`${account.address} joined the pool`);
        resolve(undefined);
      }
    }),
  );
}

async function setupLst(
  api: ApiPromise,
  accounts: Record<string, KeyringPair>,
) {
  logInfo('Creating a LST pool...');
  await createLstPool(api, accounts.ALICE_SUDO);

  logInfo('Joining the LST pool...');
  await Promise.all([
    joinLstPool(api, accounts.BOB),
    joinLstPool(api, accounts.CHARLIE),
    joinLstPool(api, accounts.DAVE),
  ]);

  logSuccess('LST pool setup completed successfully!');
}

// Main function
async function main() {
  try {
    const { api, accounts } = await setupApiAndAccounts();
    await fetchChainMetadata(api);
    await setupAssets(api, accounts.ALICE_SUDO);
    await setupMultiAssetDelegation(api, accounts.ALICE_SUDO);
    await joinOperators(api, accounts.DAVE);
    await setupLst(api, accounts);

    console.log(
      chalk.bold.green(
        '✨ Pallet `multi-asset-delegation` and `lst` setup completed successfully! ✨',
      ),
    );

    await api.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
