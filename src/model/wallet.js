import { captureException } from '@sentry/react-native';
import { signTypedData_v4, signTypedDataLegacy } from 'eth-sig-util';
import { isValidAddress, toBuffer } from 'ethereumjs-util';
import { ethers } from 'ethers';
import lang from 'i18n-js';
import { findKey, get, isEmpty } from 'lodash';
import { Alert } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
  ACCESS_CONTROL,
  ACCESSIBLE,
  AUTHENTICATION_TYPE,
  canImplyAuthentication,
} from 'react-native-keychain';
import {
  encryptAndSaveDataToCloud,
  getDataFromCloud,
} from '../handlers/cloudBackup';
import { saveUserBackupState } from '../handlers/localstorage/globalSettings';
import {
  addHexPrefix,
  isHexString,
  isHexStringIgnorePrefix,
  isValidMnemonic,
  toChecksumAddress,
  web3Provider,
} from '../handlers/web3';
import BackupStateTypes from '../helpers/backupStateTypes';
import WalletBackupTypes from '../helpers/walletBackupTypes';
import WalletTypes from '../helpers/walletTypes';
import { ethereumUtils } from '../utils';

import * as keychain from './keychain';
import { colors } from '@rainbow-me/styles';
import logger from 'logger';

const seedPhraseKey = 'rainbowSeedPhrase';
const privateKeyKey = 'rainbowPrivateKey';
const addressKey = 'rainbowAddressKey';
const selectedWalletKey = 'rainbowSelectedWalletKey';
const allWalletsKey = 'rainbowAllWalletsKey';
const seedPhraseMigratedKey = 'rainbowSeedPhraseMigratedKey';

const privateKeyVersion = 1.0;
const seedPhraseVersion = 1.0;
const selectedWalletVersion = 1.0;
const allWalletsVersion = 1.0;

const DEFAULT_HD_PATH = `m/44'/60'/0'/0`;
export const DEFAULT_WALLET_NAME = 'My Wallet';

const publicAccessControlOptions = {
  accessible: ACCESSIBLE.ALWAYS_THIS_DEVICE_ONLY,
};

export function generateSeedPhrase() {
  return ethers.utils.HDNode.entropyToMnemonic(ethers.utils.randomBytes(16));
}

export const walletInit = async (
  seedPhrase = null,
  color = null,
  name = null
) => {
  let walletAddress = null;
  let isNew = false;
  // Importing a seedphrase
  if (!isEmpty(seedPhrase)) {
    const wallet = await createWallet(seedPhrase, color, name);
    walletAddress = wallet.address;
    return { isNew, walletAddress };
  }

  walletAddress = await loadAddress();

  if (!walletAddress) {
    const wallet = await createWallet();
    walletAddress = wallet.address;
    isNew = true;
  }
  return { isNew, walletAddress };
};

export const loadWallet = async () => {
  const privateKey = await loadPrivateKey();
  if (privateKey) {
    return new ethers.Wallet(privateKey, web3Provider);
  }
  return null;
};

export const sendTransaction = async ({ transaction }) => {
  try {
    const wallet = await loadWallet();
    if (!wallet) return null;
    try {
      const result = await wallet.sendTransaction(transaction);
      return result.hash;
    } catch (error) {
      Alert.alert(lang.t('wallet.transaction.alert.failed_transaction'));
      captureException(error);
      return null;
    }
  } catch (error) {
    Alert.alert(lang.t('wallet.transaction.alert.authentication'));
    captureException(error);
    return null;
  }
};

export const signTransaction = async ({ transaction }) => {
  try {
    const wallet = await loadWallet();
    if (!wallet) return null;
    try {
      return wallet.sign(transaction);
    } catch (error) {
      Alert.alert(lang.t('wallet.transaction.alert.failed_transaction'));
      captureException(error);
      return null;
    }
  } catch (error) {
    Alert.alert(lang.t('wallet.transaction.alert.authentication'));
    captureException(error);
    return null;
  }
};

export const signMessage = async (
  message,
  authenticationPrompt = lang.t('wallet.authenticate.please')
) => {
  try {
    const wallet = await loadWallet(authenticationPrompt);
    try {
      const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
      const sigParams = await signingKey.signDigest(
        ethers.utils.arrayify(message)
      );
      return ethers.utils.joinSignature(sigParams);
    } catch (error) {
      captureException(error);
      return null;
    }
  } catch (error) {
    Alert.alert(lang.t('wallet.transaction.alert.authentication'));
    captureException(error);
    return null;
  }
};

export const signPersonalMessage = async (
  message,
  authenticationPrompt = lang.t('wallet.authenticate.please')
) => {
  try {
    const wallet = await loadWallet(authenticationPrompt);
    try {
      return wallet.signMessage(
        isHexString(message) ? ethers.utils.arrayify(message) : message
      );
    } catch (error) {
      captureException(error);
      return null;
    }
  } catch (error) {
    Alert.alert(lang.t('wallet.transaction.alert.authentication'));
    captureException(error);
    return null;
  }
};

export const signTypedDataMessage = async (
  message,
  method,
  authenticationPrompt = lang.t('wallet.authenticate.please')
) => {
  try {
    const wallet = await loadWallet(authenticationPrompt);

    try {
      const pkeyBuffer = toBuffer(addHexPrefix(wallet.privateKey));
      let parsedData = message;
      try {
        parsedData = JSON.parse(message);
        // eslint-disable-next-line no-empty
      } catch (e) {}

      // There are 3 types of messages
      // v1 => basic data types
      // v3 =>  has type / domain / primaryType
      // v4 => same as v3 but also supports which supports arrays and recursive structs.
      // Because v4 is backwards compatible with v3, we're supporting only v4

      let version = 'v1';
      if (parsedData.types || parsedData.primaryType || parsedData.domain) {
        version = 'v4';
      }

      switch (version) {
        case 'v4':
          return signTypedData_v4(pkeyBuffer, {
            data: parsedData,
          });
        default:
          return signTypedDataLegacy(pkeyBuffer, { data: parsedData });
      }
    } catch (error) {
      captureException(error);
      return null;
    }
  } catch (error) {
    Alert.alert(lang.t('wallet.transaction.alert.authentication'));
    captureException(error);
    return null;
  }
};

export const oldLoadSeedPhrase = async (
  authenticationPrompt = lang.t('wallet.authenticate.please_seed_phrase')
) => {
  const seedPhrase = await keychain.loadString(seedPhraseKey, {
    authenticationPrompt,
  });
  return seedPhrase;
};

export const loadAddress = async () => {
  try {
    return keychain.loadString(addressKey);
  } catch (error) {
    captureException(error);
    return null;
  }
};

const loadPrivateKey = async (
  authenticationPrompt = lang.t('wallet.authenticate.please')
) => {
  try {
    const isSeedPhraseMigrated = await keychain.loadString(
      seedPhraseMigratedKey
    );

    // We need to migrate the seedphrase & private key first
    // In that case we regenerate the existing private key to store it with the new format
    if (!isSeedPhraseMigrated) {
      const { privateKey } = await migrateSecrets();
      return privateKey;
    } else {
      const address = await loadAddress();
      const { privateKey } = await getPrivateKey(address, authenticationPrompt);
      return privateKey;
    }
  } catch (error) {
    captureException(error);
    return null;
  }
};

export const saveAddress = async (
  address,
  accessControlOptions = publicAccessControlOptions
) => {
  await keychain.saveString(addressKey, address, accessControlOptions);
};

export const identifyWalletType = walletSeed => {
  let type = null;
  if (
    isHexStringIgnorePrefix(walletSeed) &&
    addHexPrefix(walletSeed).length === 66
  ) {
    type = WalletTypes.privateKey;
    // 12 or 24 words seed phrase
  } else if (isValidMnemonic(walletSeed)) {
    type = WalletTypes.mnemonic;
    // Public address (0x)
  } else if (isValidAddress(walletSeed)) {
    type = WalletTypes.readOnly;
  } else {
    // seed
    type = WalletTypes.seed;
  }

  return type;
};

export const createWallet = async (seed = null, color = null, name = null) => {
  const isImported = !!seed;
  const walletSeed = seed || generateSeedPhrase();
  let wallet = null;
  let hdnode = null;
  let addresses = [];
  try {
    const type = identifyWalletType(walletSeed);
    if (!type) throw new Error('Unknown Wallet Type');
    switch (type) {
      case WalletTypes.privateKey:
        wallet = new ethers.Wallet(walletSeed);
        break;
      case WalletTypes.mnemonic:
        hdnode = ethers.utils.HDNode.fromMnemonic(walletSeed);
        break;
      case WalletTypes.seed:
        hdnode = ethers.utils.HDNode.fromSeed(walletSeed);
        break;
      case WalletTypes.readOnly:
        wallet = { address: toChecksumAddress(walletSeed), privateKey: null };
        break;
      default:
    }

    // Always generate the first account
    if (!wallet && [WalletTypes.mnemonic, WalletTypes.seed].includes(type)) {
      const node = hdnode.derivePath(`${DEFAULT_HD_PATH}/0`);
      wallet = new ethers.Wallet(node.privateKey);
    }

    // Get all wallets
    const allWalletsResult = await getAllWallets();
    const allWallets = get(allWalletsResult, 'wallets', {});

    if (isImported) {
      // Checking if the generated account already exists
      const alreadyExisting = Object.keys(allWallets).some(key => {
        const someWallet = allWallets[key];
        return someWallet.addresses.some(account => {
          return (
            toChecksumAddress(account.address) ===
              toChecksumAddress(wallet.address) && someWallet.type === type
          );
        });
      });

      if (alreadyExisting) {
        Alert.alert('Oops!', 'Looks like you already imported this wallet!');
        return null;
      }
    }

    const id = `wallet_${Date.now()}`;

    // Save address
    await saveAddress(wallet.address);
    // Save private key
    await savePrivateKey(wallet.address, wallet.privateKey);
    // Save seed
    await saveSeedPhrase(walletSeed, id);
    // Save migration flag
    await keychain.saveString(
      seedPhraseMigratedKey,
      'true',
      publicAccessControlOptions
    );

    addresses.push({
      address: wallet.address,
      avatar: null,
      color: color !== null ? color : colors.getRandomColor(),
      index: 0,
      label: name || '',
      visible: true,
    });

    if (hdnode && isImported) {
      let index = 1;
      let lookup = true;
      // Starting on index 1, we are gonna hit etherscan API and check the tx history
      // for each account. If there's history we add it to the wallet.
      //(We stop once we find the first one with no history)
      while (lookup) {
        const node = hdnode.derivePath(`${DEFAULT_HD_PATH}/${index}`);
        const nextWallet = new ethers.Wallet(node.privateKey);
        const hasTxHistory = await ethereumUtils.hasPreviousTransactions(
          nextWallet.address
        );
        if (hasTxHistory) {
          // Save private key
          await savePrivateKey(nextWallet.address, nextWallet.privateKey);
          addresses.push({
            address: nextWallet.address,
            avatar: null,
            color: colors.getRandomColor(),
            index: index,
            label: '',
            visible: true,
          });
          index++;
        } else {
          lookup = false;
        }
      }
    }

    // if imported and we have only one account, we name the wallet too.
    let walletName = DEFAULT_WALLET_NAME;
    if (isImported && name) {
      if (addresses.length > 1) {
        walletName = name;
      }
    }

    let primary = false;
    // If it's not imported or it's the first one with a seed phrase
    // it's the primary wallet
    if (
      !isImported ||
      (!findKey(allWallets, ['type', WalletTypes.mnemonic]) &&
        type === WalletTypes.mnemonic)
    ) {
      primary = true;
      // Or there's no other primary wallet and this one has a seed phrase
    } else {
      const primaryWallet = findKey(allWallets, ['primary', true]);
      if (!primaryWallet && type === WalletTypes.mnemonic) {
        primary = true;
      }
    }

    allWallets[id] = {
      addresses,
      color: color || 0,
      id,
      imported: isImported,
      name: walletName,
      primary,
      type,
    };

    if (!isImported) {
      await saveUserBackupState(BackupStateTypes.ready);
    }

    setSelectedWallet(allWallets[id]);
    await saveAllWallets(allWallets);

    if (wallet) {
      return wallet;
    }
    return null;
  } catch (error) {
    captureException(error);
    return null;
  }
};

export const savePrivateKey = async (address, privateKey) => {
  let privateAccessControlOptions = {};
  const canAuthenticate = await canImplyAuthentication({
    authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
  });

  let isSimulator = false;

  if (canAuthenticate) {
    isSimulator = __DEV__ && (await DeviceInfo.isEmulator());
  }
  if (canAuthenticate && !isSimulator) {
    privateAccessControlOptions = {
      accessControl: ACCESS_CONTROL.USER_PRESENCE,
      accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };
  }

  const key = `${address}_${privateKeyKey}`;
  const val = {
    address,
    privateKey,
    version: privateKeyVersion,
  };

  await keychain.saveObject(key, val, privateAccessControlOptions);
};

export const getPrivateKey = async (
  address,
  authenticationPrompt = lang.t('wallet.authenticate.please')
) => {
  try {
    const key = `${address}_${privateKeyKey}`;
    return keychain.loadObject(key, {
      authenticationPrompt,
    });
  } catch (error) {
    captureException(error);
    return null;
  }
};

export const saveSeedPhrase = async (seedphrase, keychain_id = null) => {
  let privateAccessControlOptions = {};
  const canAuthenticate = await canImplyAuthentication({
    authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
  });

  let isSimulator = false;

  if (canAuthenticate) {
    isSimulator = __DEV__ && (await DeviceInfo.isEmulator());
  }
  if (canAuthenticate && !isSimulator) {
    privateAccessControlOptions = {
      accessControl: ACCESS_CONTROL.USER_PRESENCE,
      accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };
  }

  const key = `${keychain_id}_${seedPhraseKey}`;
  const val = {
    id: keychain_id,
    seedphrase,
    version: seedPhraseVersion,
  };

  await keychain.saveObject(key, val, privateAccessControlOptions);
};

export const getSeedPhrase = async (
  id,
  authenticationPrompt = lang.t('wallet.authenticate.please')
) => {
  try {
    const key = `${id}_${seedPhraseKey}`;
    return keychain.loadObject(key, {
      authenticationPrompt,
    });
  } catch (error) {
    captureException(error);
    return null;
  }
};

export const setSelectedWallet = async wallet => {
  const val = {
    version: selectedWalletVersion,
    wallet,
  };

  await keychain.saveObject(selectedWalletKey, val, publicAccessControlOptions);
};

export const getSelectedWallet = async () => {
  try {
    return keychain.loadObject(selectedWalletKey);
  } catch (error) {
    captureException(error);
    return null;
  }
};

export const saveAllWallets = async wallets => {
  const val = {
    version: allWalletsVersion,
    wallets,
  };

  await keychain.saveObject(allWalletsKey, val, publicAccessControlOptions);
};

export const getAllWallets = async () => {
  try {
    return keychain.loadObject(allWalletsKey);
  } catch (error) {
    captureException(error);
    return null;
  }
};

export const generateAccount = async (id, index) => {
  try {
    const isSeedPhraseMigrated = await keychain.loadString(
      seedPhraseMigratedKey
    );
    let seedPhrase, hdnode;
    // We need to migrate the seedphrase & private key first
    // In that case we regenerate the existing private key to store it with the new format
    if (!isSeedPhraseMigrated) {
      const {
        hdnode: newHdnode,
        seedPhrase: newSeedPhrase,
      } = await migrateSecrets();

      if (newHdnode) {
        hdnode = newHdnode;
      }

      if (newSeedPhrase) {
        seedPhrase = newSeedPhrase;
      }
    } else {
      const seedData = await getSeedPhrase(id);
      seedPhrase = seedData.seedphrase;
      hdnode = ethers.utils.HDNode.fromMnemonic(seedPhrase);
    }

    if (!seedPhrase) {
      throw new Error(`Can't access seed phrase to create new accounts`);
    }

    const node = hdnode.derivePath(`${DEFAULT_HD_PATH}/${index}`);
    const newAccount = new ethers.Wallet(node.privateKey);
    await savePrivateKey(newAccount.address, newAccount.privateKey);
    return newAccount;
  } catch (error) {
    logger.log('Error generating account for keychain', id, error);
  }
};

export const migrateSecrets = async () => {
  try {
    const seedPhrase = await oldLoadSeedPhrase();
    const type = identifyWalletType(seedPhrase);
    if (!type) throw new Error('Unknown Wallet Type');
    let hdnode, node, existingAccount;
    switch (type) {
      case WalletTypes.privateKey:
        existingAccount = new ethers.Wallet(seedPhrase);
        break;
      case WalletTypes.mnemonic:
        hdnode = ethers.utils.HDNode.fromMnemonic(seedPhrase);
        break;
      case WalletTypes.seed:
        hdnode = ethers.utils.HDNode.fromSeed(seedPhrase);
        break;
      default:
    }

    if (!existingAccount) {
      node = hdnode.derivePath(`${DEFAULT_HD_PATH}/0`);
      existingAccount = new ethers.Wallet(node.privateKey);
    }

    // Save the private key in the new format
    await savePrivateKey(existingAccount.address, existingAccount.privateKey);
    const { wallet } = await getSelectedWallet();
    // Save the seedphrase in the new format
    await saveSeedPhrase(seedPhrase, wallet.id);
    // Save the migration flag to prevent this flow in the future
    await keychain.saveString(
      seedPhraseMigratedKey,
      'true',
      publicAccessControlOptions
    );
    return {
      hdnode,
      privateKey: existingAccount.privateKey,
      seedPhrase,
      type,
    };
  } catch (e) {
    logger.log(e);
    captureException(e);
  }
};

export const loadSeedPhraseAndMigrateIfNeeded = async id => {
  try {
    const isSeedPhraseMigrated = await keychain.loadString(
      seedPhraseMigratedKey
    );
    // We need to migrate the seedphrase & private key first
    // In that case we regenerate the existing private key to store it with the new format
    if (!isSeedPhraseMigrated) {
      const { seedPhrase } = await migrateSecrets();
      return seedPhrase;
    } else {
      const seedData = await getSeedPhrase(id);
      const seedPhrase = seedData.seedphrase;
      return seedPhrase;
    }
  } catch (error) {
    captureException(error);
    return null;
  }
};

async function extractSecretsForWallet(wallet) {
  const allKeys = await keychain.loadAllKeys();
  if (!allKeys) throw new Error("Couldn't read secrets from keychain");
  const secrets = {};

  const allowedPkeysKeys = wallet.addresses.map(
    account => `${account.address}_${privateKeyKey}`
  );

  allKeys.forEach(item => {
    // Ignore allWalletsKey
    if (item.username === allWalletsKey) {
      return;
    }

    // Ignore selected wallet
    if (item.username === selectedWalletKey) {
      return;
    }

    // Ignore icloud backup password
    if (item.username === 'rainbowBackup') {
      return;
    }

    // Ignore another wallets seeds
    if (
      item.username.indexOf(`_${seedPhraseKey}`) !== -1 &&
      item.username !== `${wallet.id}_${seedPhraseKey}`
    ) {
      return;
    }

    // Ignore other wallets PKeys
    if (
      item.username.indexOf(privateKeyKey) !== -1 &&
      allowedPkeysKeys.indexOf(item.username) === -1
    ) {
      return;
    }

    secrets[item.username] = item.password;
  });
  return secrets;
}

export async function backupWalletToCloud(password, wallet) {
  logger.log('backupWalletToCloud', password, wallet);
  const now = Date.now();

  const secrets = await extractSecretsForWallet(wallet);
  logger.log('backupWalletToCloud:: got secrets', secrets);
  const data = {
    createdAt: now,
    secrets,
  };
  logger.log('backupWalletToCloud:: about to encrypt and save data', data);
  return encryptAndSaveDataToCloud(data, password, `backup_${now}.json`);
}

export async function addWalletToCloudBackup(password, wallet, filename) {
  logger.log('addWalletToCloudBackup', password, wallet, filename);

  const backup = await getDataFromCloud(password, filename);
  logger.log('addWalletToCloudBackup:: got data from cloud', backup);

  const now = Date.now();

  const secrets = await extractSecretsForWallet(wallet);
  logger.log('addWalletToCloudBackup:: got secrets', secrets);

  backup.updatedAt = now;
  // Merge existing secrets with the ones from this wallet
  backup.secrets = {
    ...backup.secrets,
    ...secrets,
  };
  logger.log('addWalletToCloudBackup:: about to encrypt and save data', backup);
  return encryptAndSaveDataToCloud(backup, password, filename);
}

export async function restoreCloudBackup(password, userData) {
  try {
    // 0 - Should we wipe the keychain before restoring? => TBD
    // Kinda dangerous TBH

    // 1 - Find out which is the latest backup
    // In the future we might let the user choose which backup to import
    // For now we figure it out on our own by defaulting to the latest
    logger.log('restoreCloudBackup', password, userData);
    logger.log('restoreCloudBackup :: finding latest backup...');

    let latestBackup = null;
    let filename = null;
    Object.keys(userData.wallets).forEach(key => {
      const wallet = userData.wallets[key];
      // Check if there's a wallet backed up
      if (wallet.backedUp && wallet.backupType === WalletBackupTypes.cloud) {
        // If there is one, let's grab the latest backup
        if (!latestBackup || wallet.backupDate > latestBackup) {
          filename = wallet.backupFile;
          latestBackup = wallet.backupDate;
        }
      }
    });
    logger.log('restoreCloudBackup :: latest backup: ', filename);

    // 2- download that backup
    const data = await getDataFromCloud(password, filename);
    logger.log('restoreCloudBackup :: got data from the cloud', data);
    if (!data) {
      throw new Error('Invalid password');
    }
    const dataToRestore = {
      // All wallets
      rainbowAllWalletsKey: {
        version: allWalletsVersion,
        wallets: userData.wallets,
      },
      ...data.secrets,
    };

    logger.log('restoreCloudBackup ::about to restore', dataToRestore);

    return keychain.restoreBackupIntoKeychain(dataToRestore);
  } catch (e) {
    logger.log('Error while restoring back up', e);
  }
}

export async function checkKeychainIntegrity() {
  const hasMigratedFlag = await keychain.hasKey(seedPhraseMigratedKey);
  if (hasMigratedFlag) {
    return true;
  }

  const hasOldSeedphraseKey = await keychain.hasKey(seedPhraseKey);
  if (hasOldSeedphraseKey) {
    return true;
  }

  return false;
}
