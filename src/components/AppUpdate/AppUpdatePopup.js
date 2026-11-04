import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Linking,
} from 'react-native';
import { checkVersion } from 'react-native-check-version';
import PrimaryButton from '../PrimaryButton/PrimaryButton';
import { useTranslation } from '../../context/LanguageContext';
import GlobalText from '@components/GlobalText/GlobalText';
import globalStyles from '../../utils/Helper/Style';

const AppUpdatePopup = () => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const version = await checkVersion();

        setLatestVersion(version?.version);
        setStoreUrl(version?.url);
        if (version.needsUpdate) {
          setIsUpdateAvailable(true);
        }
      } catch (error) {
        console.error('Error checking app version: ', error);
      }
    };

    checkForUpdate();
  }, []);

  const handleUpdate = async () => {
    try {
      const url = storeUrl || (await checkVersion())?.url;
      await Linking.openURL(url);
    } catch (err) {
      console.error('Failed to open store URL: ', err);
    }
  };

  // Forced update: popup cannot be dismissed (no "Not now", Android back is ignored)
  return (
    <Modal
      transparent={true}
      visible={isUpdateAvailable}
      animationType="slide"
      onRequestClose={() => {}}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <GlobalText style={styles.title}>{t('update_available')}</GlobalText>
          <GlobalText
            style={[
              globalStyles.text,
              { textAlign: 'center', marginVertical: 5 },
            ]}
          >
            {t('update_available_message').replace('{latestVersion}', latestVersion)}
          </GlobalText>

          <PrimaryButton onPress={handleUpdate} text={t('update_now')} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: 'black',
  },
});

export default AppUpdatePopup;
