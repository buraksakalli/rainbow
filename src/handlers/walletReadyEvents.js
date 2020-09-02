import { filter, find } from 'lodash';
import store from '../redux/store';
import { checkKeychainIntegrity } from '../redux/wallets';
import { getKeychainIntegrityState } from './localstorage/globalSettings';
import WalletTypes from '@rainbow-me/helpers/walletTypes';
import { Navigation } from '@rainbow-me/navigation';
import Routes from '@rainbow-me/routes';
import logger from 'logger';

const BACKUP_SHEET_DELAY_MS = 3000;

export const runKeychainIntegrityChecks = () => {
  setTimeout(async () => {
    const keychainIntegrityState = await getKeychainIntegrityState();
    if (!keychainIntegrityState) {
      await store.dispatch(checkKeychainIntegrity());
    }
  }, 5000);
};

export const runWalletBackupStatusChecks = () => {
  const { selected, wallets } = store.getState().wallets;

  // count how many visible, non-imported and non-readonly wallets are not backed up
  const rainbowWalletsNotBackedUp = filter(wallets, wallet => {
    const hasVisibleAccount = find(
      wallet.addresses,
      account => account.visible
    );
    return (
      !wallet.imported &&
      hasVisibleAccount &&
      wallet.type !== WalletTypes.readOnly &&
      !wallet.backedUp
    );
  });

  if (!rainbowWalletsNotBackedUp.length) return;

  logger.log('there is a rainbow wallet not backed up');
  const hasSelectedWallet = find(
    rainbowWalletsNotBackedUp,
    notBackedUpWallet => notBackedUpWallet.id === selected.id
  );

  logger.log(
    'rainbow wallet not backed up that is selected?',
    hasSelectedWallet
  );

  // if one of them is selected, show the default BackupSheet
  if (selected && hasSelectedWallet) {
    logger.log('showing default BackupSheet');
    setTimeout(() => {
      Navigation.handleAction(Routes.BACKUP_SHEET);
    }, BACKUP_SHEET_DELAY_MS);
    return;
  }

  // otherwise, show the BackupSheet redirecting to the WalletSelectionList
  setTimeout(() => {
    logger.log('showing BackupSheet with existingUser option');
    Navigation.handleAction(Routes.BACKUP_SHEET, {
      option: 'existingUser',
    });
  }, BACKUP_SHEET_DELAY_MS);
  return;
};