import analytics from '@segment/analytics-react-native';
import { isValidAddress } from 'ethereumjs-util';
import { isEmpty as isObjectEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { BorderlessButton } from 'react-native-gesture-handler';
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import styled from 'styled-components/primitives';

import { Button } from '../components/buttons';
import { Icon } from '../components/icons';
import { Input } from '../components/inputs';
import { Centered, Column, Row, RowWithMargins } from '../components/layout';
import LoadingOverlay, {
  LoadingOverlayWrapper,
} from '../components/modal/LoadingOverlay';
import { SheetHandle } from '../components/sheet';
import { Text } from '../components/text';
import { saveUserBackupState } from '../handlers/localstorage/globalSettings';
import { web3Provider } from '../handlers/web3';
import BackupStateTypes from '../helpers/backupStateTypes';
import isNativeStackAvailable from '../helpers/isNativeStackAvailable';
import { isENSAddressFormat, isValidWallet } from '../helpers/validators';
import walletLoadingStates from '../helpers/walletLoadingStates';
import WalletTypes from '../helpers/walletTypes';
import {
  useAccountSettings,
  useClipboard,
  useInitializeWallet,
  usePrevious,
  useTimeout,
  useWallets,
} from '../hooks';
import { useNavigation } from '../navigation/Navigation';
import { sheetVerticalOffset } from '../navigation/effects';
import Routes from '@rainbow-me/routes';
import { borders, colors, padding, shadow } from '@rainbow-me/styles';
import logger from 'logger';
import { usePortal } from 'react-native-cool-modals/Portal';

const keyboardVerticalOffset =
  Platform.OS === 'android'
    ? sheetVerticalOffset - 240
    : sheetVerticalOffset + 10;

const statusBarHeight = getStatusBarHeight(true);

const Container = isNativeStackAvailable
  ? styled(Column).attrs({
      align: 'center',
      flex: 1,
    })`
      ${padding(0, 19)};
      background: ${colors.white};
    `
  : styled(Column).attrs({
      align: 'center',
      flex: 1,
    })`
      ${borders.buildRadius('top', 16)};
      ${padding(0, 16, 16)};
      background: ${colors.white};
      top: ${statusBarHeight};
    `;

const StyledImportButton = styled(
  Platform.OS === 'ios' ? BorderlessButton : Button
)`
  ${padding(5, 9, 7)};
  ${shadow.build(0, 6, 10, colors.dark, 0.16)};
  background-color: ${({ disabled }) =>
    disabled ? '#D2D3D7' : colors.appleBlue};
  border-radius: 15px;
  margin-bottom: 19px;
`;

const StyledInput = styled(Input)`
  min-height: 50;
`;

const ImportButton = ({ disabled, onPress, seedPhrase }) => (
  <StyledImportButton disabled={disabled} onPress={onPress} overflow="visible">
    <RowWithMargins align="center" margin={5}>
      {!!seedPhrase && (
        <Icon color={colors.white} direction="right" name="arrowCircled" />
      )}
      <Text color="white" weight="semibold">
        {seedPhrase ? 'Import' : 'Paste'}
      </Text>
    </RowWithMargins>
  </StyledImportButton>
);

const ImportSeedPhraseSheet = ({ isEmpty, setAppearListener }) => {
  const { accountAddress } = useAccountSettings();
  const { selectedWallet, wallets } = useWallets();
  const { clipboard } = useClipboard();
  const { goBack, navigate, setParams } = useNavigation();
  const initializeWallet = useInitializeWallet();
  const [isImporting, setImporting] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [color, setColor] = useState(null);
  const [name, setName] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [startFocusTimeout] = useTimeout();
  const [startAnalyticsTimeout] = useTimeout();
  const wasImporting = usePrevious(isImporting);

  const isClipboardValidSecret = useMemo(() => {
    return clipboard !== accountAddress && isValidWallet(clipboard);
  }, [accountAddress, clipboard]);

  const isSecretValid = useMemo(() => {
    return seedPhrase !== accountAddress && isValidWallet(seedPhrase);
  }, [accountAddress, seedPhrase]);

  const inputRef = useRef(null);
  const focusListener = useCallback(() => {
    inputRef.current && inputRef.current.focus();
  }, []);

  const inputRefListener = useCallback(
    value => {
      value && startFocusTimeout(value.focus, 100);
      inputRef.current = value;
    },
    [startFocusTimeout]
  );

  useEffect(() => {
    setAppearListener && setAppearListener(focusListener);
    return () => {
      setAppearListener && setAppearListener(null);
    };
  }, [focusListener, setAppearListener]);

  const handleSetSeedPhrase = useCallback(
    text => {
      if (isImporting) return null;
      return setSeedPhrase(text);
    },
    [isImporting]
  );

  const toggleImporting = useCallback(
    newImportingState => {
      setImporting(newImportingState);
      setParams({ gesturesEnabled: !newImportingState });
    },
    [setParams]
  );

  const onPressImportButton = useCallback(async () => {
    if (isSecretValid && seedPhrase) {
      const input = seedPhrase.trim();
      let name = null;
      // Validate ENS
      if (isENSAddressFormat(input)) {
        try {
          const address = await web3Provider.resolveName(input);

          if (!address) {
            Alert.alert('This is not a valid ENS name');
            return;
          }
          setResolvedAddress(address);
          name = input;
        } catch (e) {
          Alert.alert(
            'Sorry, we cannot add this ENS name at this time. Please try again later!'
          );
          return;
        }
        // Look up ENS for 0x address
      } else if (isValidAddress(input)) {
        const ens = await web3Provider.lookupAddress(input);
        if (ens && ens !== input) {
          name = ens;
        }
      }

      const ConfirmImportAlert = (name, onSuccess, navigate) =>
        navigate(Routes.MODAL_SCREEN, {
          actionType: 'Import',
          additionalPadding: true,
          asset: [],
          isNewProfile: true,
          onCloseModal: args => {
            if (args) {
              onSuccess(args);
            }
          },
          onRefocusInput:
            Platform.OS === 'ios' ? setAppearListener(focusListener) : null,
          profile: {
            name,
          },
          type: 'wallet_profile_creator',
          withoutStatusBar: true,
        });

      return ConfirmImportAlert(
        name,
        ({ color, name }) => {
          if (color !== null) setColor(color);
          if (name) setName(name);
          toggleImporting(true);
        },
        navigate
      );
    }

    if (isClipboardValidSecret && clipboard) {
      return handleSetSeedPhrase(clipboard);
    }
  }, [
    clipboard,
    focusListener,
    handleSetSeedPhrase,
    isClipboardValidSecret,
    isSecretValid,
    navigate,
    seedPhrase,
    setAppearListener,
    toggleImporting,
  ]);

  useEffect(() => {
    if (!wasImporting && isImporting) {
      startAnalyticsTimeout(async () => {
        const input = resolvedAddress ? resolvedAddress : seedPhrase.trim();
        const previousWalletCount = !isObjectEmpty(wallets)
          ? Object.keys(wallets).filter(
              wallet => wallet.type !== WalletTypes.readOnly
            ).length
          : 0;
        initializeWallet(input, color, name ? name : '')
          .then(success => {
            if (success) {
              analytics.track('Imported seed phrase', {
                hadPreviousAddressWithValue: isEmpty,
              });
              goBack();
              InteractionManager.runAfterInteractions(async () => {
                if (previousWalletCount === 0) {
                  await saveUserBackupState(BackupStateTypes.done);
                }
                navigate(Routes.SWIPE_LAYOUT);
                setTimeout(() => {
                  // If it's not read only, show the backup sheet
                  if (!(isENSAddressFormat(input) || isValidAddress(input))) {
                    navigate(Routes.BACKUP_SHEET, {
                      option: 'imported',
                    });
                  }
                }, 1000);
              });
            } else {
              toggleImporting(false);
            }
          })
          .catch(error => {
            toggleImporting(false);
            logger.error('error importing seed phrase: ', error);
          });
      }, 50);
    }
  }, [
    color,
    goBack,
    initializeWallet,
    isEmpty,
    isImporting,
    name,
    navigate,
    resolvedAddress,
    seedPhrase,
    selectedWallet.id,
    selectedWallet.type,
    startAnalyticsTimeout,
    toggleImporting,
    wallets,
    wasImporting,
  ]);

  const { setComponent, hide } = usePortal();

  useEffect(() => {
    if (isImporting) {
      setComponent(
        <LoadingOverlayWrapper>
          <LoadingOverlay
            paddingTop={keyboardVerticalOffset}
            title={walletLoadingStates.IMPORTING_WALLET}
          />
        </LoadingOverlayWrapper>,
        true
      );
      return hide;
    }
  }, [hide, isImporting, setComponent]);

  return (
    <Container>
      <StatusBar barStyle="light-content" />
      <SheetHandle marginBottom={7} marginTop={6} />
      <Text size="large" weight="bold">
        Add Wallet
      </Text>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <Centered css={padding(0, 42)} flex={1}>
          <StyledInput
            align="center"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            color={isSecretValid ? 'appleBlue' : 'dark'}
            enablesReturnKeyAutomatically
            keyboardType={
              Platform.OS === 'android' ? 'visible-password' : 'default'
            }
            lineHeight="looser"
            multiline
            numberOfLines={3}
            onChangeText={handleSetSeedPhrase}
            onSubmitEditing={onPressImportButton}
            placeholder="Seed phrase, private key, Ethereum address or ENS name"
            ref={
              isNativeStackAvailable || Platform.OS === 'android'
                ? inputRef
                : inputRefListener
            }
            returnKeyType="done"
            size="large"
            spellCheck={false}
            value={seedPhrase}
            weight="semibold"
            width="100%"
          />
        </Centered>
        <Row align="start" justify="end">
          <ImportButton
            disabled={seedPhrase ? !isSecretValid : !isClipboardValidSecret}
            onPress={onPressImportButton}
            seedPhrase={seedPhrase}
          />
        </Row>
      </KeyboardAvoidingView>
    </Container>
  );
};

ImportSeedPhraseSheet.propTypes = {
  isEmpty: PropTypes.bool,
  setAppearListener: PropTypes.func,
};

export default ImportSeedPhraseSheet;
