import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../context/LanguageContext';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton/SecondaryButton';
import GlobalText from '@components/GlobalText/GlobalText';
import globalStyles from '../../utils/Helper/Style';
import lightning from '../../assets/images/png/lightning.png';
import { NotificationUnsubscribe } from '../../utils/Helper/JSHelper';
import { deleteSavedItem } from '@src/utils/JsHelper/Helper';

const UnauthorizedScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleGoToLogin = async () => {
    await NotificationUnsubscribe();
    await deleteSavedItem('refreshToken');
    await deleteSavedItem('Accesstoken');
    await deleteSavedItem('userId');
    await deleteSavedItem('cohortId');
    await deleteSavedItem('cohortData');
    await deleteSavedItem('l2CoursesShownFor');
    await deleteSavedItem('weightedProgress');
    await deleteSavedItem('courseTrackData');
    await deleteSavedItem('profileData');
    await deleteSavedItem('tenantData');
    await deleteSavedItem('academicYearId');
    await deleteSavedItem('userType');
    navigation.navigate('LoginScreen');
  };

  const handleGoToHome = () => {
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={lightning} 
          resizeMode="contain" 
          style={styles.icon}
        />
        
        <GlobalText style={[globalStyles.h3, styles.title]}>
          {t('unauthorized') || 'Unauthorized Access'}
        </GlobalText>
        
        <GlobalText style={[globalStyles.text, styles.description]}>
          {t('unauthorized_message') || 
            'You do not have permission to access this content. Please login or return to the home page.'}
        </GlobalText>

        <View style={styles.buttonContainer}>
          <View style={styles.buttonWrapper}>
            <PrimaryButton
              text={t('go_to_login') || 'Go to Login'}
              onPress={handleGoToLogin}
              isDisabled={false}
            />
          </View>
          
          <View style={styles.buttonWrapper}>
            <SecondaryButton
              text="go_to_home_page"
              onPress={handleGoToHome}
            />
          </View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    width: '100%',
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 30,
  },
  title: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#1F1B13',
  },
  description: {
    textAlign: 'center',
    marginBottom: 40,
    color: '#3B383E',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: 15,
  },
});

export default UnauthorizedScreen;

