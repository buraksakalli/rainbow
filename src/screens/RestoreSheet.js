import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import HorizontalGestureBlocker from '../components/HorizontalGestureBlocker';
import { KeyboardFixedOpenLayout } from '../components/layout';
import RestoreIcloudStep from '../components/restore/RestoreIcloudStep';
import RestoreSheetFirstStep from '../components/restore/RestoreSheetFirstStep';
import { Sheet } from '../components/sheet';
import { fetchUserDataFromCloud } from '../handlers/cloudBackup';
import WalletBackupTypes from '../helpers/walletBackupTypes';
import Routes from '../navigation/routesNames';

const RestoreSheet = () => {
  const { goBack, navigate } = useNavigation();
  const { params } = useRoute();
  const [step, setStep] = useState(params?.option || 'first');
  const [userData, setUserData] = useState();

  useEffect(() => {
    const initialize = async () => {
      console.log('fetching fetchUserDataFromCloud');
      const data = await fetchUserDataFromCloud();
      setUserData(data);
    };

    initialize();
  }, []);

  const onIcloudRestore = useCallback(() => {
    setStep(WalletBackupTypes.cloud);
  }, []);

  const onManualRestore = useCallback(() => {
    goBack();
    navigate(Routes.IMPORT_SEED_PHRASE_SHEET);
  }, [goBack, navigate]);

  const onWatchAddress = useCallback(() => {
    goBack();
    navigate(Routes.IMPORT_SEED_PHRASE_SHEET);
  }, [goBack, navigate]);

  const renderStep = useCallback(() => {
    switch (step) {
      case WalletBackupTypes.cloud:
        return <RestoreIcloudStep userData={userData} />;
      default:
        return (
          <RestoreSheetFirstStep
            onIcloudRestore={onIcloudRestore}
            onManualRestore={onManualRestore}
            onWatchAddress={onWatchAddress}
            userData={userData}
          />
        );
    }
  }, [onIcloudRestore, onManualRestore, onWatchAddress, step, userData]);

  const sheet = <Sheet>{renderStep()}</Sheet>;
  if (step === WalletBackupTypes.cloud) {
    return (
      <HorizontalGestureBlocker>
        <KeyboardFixedOpenLayout>{sheet}</KeyboardFixedOpenLayout>
      </HorizontalGestureBlocker>
    );
  }

  return sheet;
};

export default React.memo(RestoreSheet);
