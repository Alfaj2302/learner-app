import React, { useState, useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, BackHandler, DeviceEventEmitter } from 'react-native';
import WebView from 'react-native-webview';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import BackHeader from '../../components/Layout/BackHeader';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  getCohort,
  getAcademicYearList,
  getProfileDetails,
  getProgramDetails,
  getUserDetails,
  setAcademicYear,
  notificationSubscribe,
  telemetryTrackingData,
} from '../../utils/API/AuthService';
import {
  getActiveCohortData,
  getActiveCohortIds,
  getBatchAssignmentCacheKey,
  getDataFromStorage,
  getDeviceId,
  getuserDetails,
  saveAccessToken,
  saveRefreshToken,
  setDataInStorage,
  storeUsername,
} from '../../utils/JsHelper/Helper';
import moment from 'moment';
import {
  PROGRAM_SWITCHED_EVENT,
  TENANT_DATA,
} from '../../utils/Constants/app-constants';
import Config from 'react-native-config';
import { useTranslation } from '../../context/LanguageContext';

const PlpWebViewScreen = () => {
  const [loading, setLoading] = useState(true);
  const [errmsg, setErrmsg] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const webViewRef = useRef(null);
  const { t, setLanguage, language } = useTranslation();
  console.log("#### language", language);

  const url =  Config.LEARNER_PLP_LINK

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        // Navigate back in WebView
        webViewRef.current.goBack();
        return true; // Prevent default behavior (exit app)
      }
      // Let default behavior happen (go back in navigation)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  // Injected JavaScript to set isAndroidApp in localStorage
  // This runs before page content loads
  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      try {
        window.localStorage.setItem('isAndroidApp', 'yes');
        if('${language}' === 'ma')
        {
          window.localStorage.setItem('lang', 'mr');
        }
        else if('${language}' === 'te')
        {
                  window.localStorage.setItem('lang', 'tel');

        }
                  else if('${language}' === 'gu')
                  {
                    window.localStorage.setItem('lang', 'guj');
                  }
                  else if('${language}' === 'ta')
                  {
                    window.localStorage.setItem('lang', 'tam');
                  }
                  else if('${language}' === 'kn')
                  {
                    window.localStorage.setItem('lang', 'kan');
                  }
                      else if('${language}' === 'odia')
                  {
                    window.localStorage.setItem('lang', 'odi');
                  }
        else
        {
          window.localStorage.setItem('lang', '${language}');
        }
        console.log('[BeforeLoad] isAndroidApp set to yes in localStorage');
      } catch (error) {
        console.error('[BeforeLoad] Error setting isAndroidApp:', error);
      }
    })();
    true;
  `;

  // This runs after page content loads
  const injectedJavaScript = `
    (function() {
      try {
        window.localStorage.setItem('isAndroidApp', 'yes');
        console.log('[AfterLoad] isAndroidApp set to yes in localStorage');

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ANDROID_APP_FLAG_SET',
            value: window.localStorage.getItem('isAndroidApp')
          }));
          var cohortAssignedId = window.localStorage.getItem('cohortAssignedToAnyAcademicYearId');
          if (cohortAssignedId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'COHORT_ASSIGNED_ACADEMIC_YEAR_ID',
              value: cohortAssignedId
            }));
          }
          var preferredLang = window.localStorage.getItem('preferred_language');
          if (preferredLang) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PREFERRED_LANGUAGE',
              value: preferredLang
            }));
          }
          var uiConfig = window.localStorage.getItem('uiConfig');
          if (uiConfig) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'UI_CONFIG',
              value: uiConfig
            }));
          }
        }
      } catch (error) {
        console.error('[AfterLoad] Error setting isAndroidApp:', error);
      }
    })();
    true;
  `;
  
  const handleProgramLogin = async(tenantId, userId, token, refreshToken) => {
    await saveAccessToken(token || '');
    await saveRefreshToken(refreshToken || '')
    const userDetails = await getuserDetails();
    const roleName = "Learner";

    const user_id = userId;
  const tenantData = [
    userDetails?.tenantData?.find((tenant) => tenant.tenantId === tenantId),
  ];
  const uiConfig = tenantData?.[0]?.params?.uiConfig;
  await setDataInStorage('uiConfig', JSON.stringify(uiConfig));
  console.log('#### loginmultirole uiConfig', JSON.stringify(uiConfig));
  console.log('#### loginmultirole tenantData', tenantData);

  const enrollmentId = userDetails?.enrollmentId;
  await setDataInStorage('tenantData', JSON.stringify(tenantData || {}));
  await setDataInStorage('userId', user_id || '');
  await setDataInStorage('enrollmentId', enrollmentId || '');

  //store dynamic templateId
  const templateId = tenantData?.[0]?.templateId;
  await setDataInStorage('templateId', templateId || '');

    await setDataInStorage('userTenantid', tenantId || '');
    // Drop the previous program's batch first: if this program has no active
    // cohort below, cohortData must stay empty rather than leak across programs.
    await setDataInStorage('cohortData', '');

    let cohort_id;

    try {
      const academicyear = await setAcademicYear({ tenantid: tenantId });
      const activeAcademicYearId = academicyear?.[0]?.id;
      const academicyearIdList = await getAcademicYearList({ tenantid: tenantId });

      let resolvedAcademicYearId = activeAcademicYearId;

      for (const ayItem of (Array.isArray(academicyearIdList) && academicyearIdList.length > 0 ? academicyearIdList : [])) {
        const ayId = ayItem?.id;
        if (!ayId) continue;
        const cohortResult = await getCohort({
          user_id,
          tenantid: tenantId,
          academicYearId: ayId,
        });
        console.log('#### loginmultirole cohort for ayId', ayId, cohortResult);
        if (cohortResult.params?.status !== 'failed') {
          const getActiveCohortId = await getActiveCohortIds(cohortResult);
          if (getActiveCohortId?.[0]) {
            const getActiveCohort = await getActiveCohortData(cohortResult);
            await setDataInStorage('cohortData', JSON.stringify(getActiveCohort?.[0]) || '');
            cohort_id = getActiveCohortId?.[0];
            resolvedAcademicYearId = ayId;
            break;
          }
        }
      }

      await setDataInStorage('academicYearId', resolvedAcademicYearId || '');
    } catch (error) {
      console.error('Error in setting academic year or cohort:', error);
    }

  const profileData = await getProfileDetails({
    userId: user_id,
  });
  console.log('#### loginmultirole profileData', profileData);

  await setDataInStorage('profileData', JSON.stringify(profileData));
  await setDataInStorage(
    'Username',
    profileData?.getUserDetails?.[0]?.username || ''
  );
  await storeUsername(profileData?.getUserDetails?.[0]?.username);

  await setDataInStorage(
    'cohortId',
    cohort_id || '00000000-0000-0000-0000-000000000000'
  );
  const tenantDetails = (await getProgramDetails()) || [];

  const MatchedTenant = tenantDetails.filter(
    (item) => item?.tenantId === tenantId
  );

  // console.log('tenantDetails===>', JSON.stringify(tenantDetails));
  // console.log(
  //   'MatchedTenant===>',
  //   JSON.stringify(MatchedTenant?.[0]?.contentFilter)
  // );

  await setDataInStorage(
    'contentFilter',
    JSON.stringify(MatchedTenant?.[0]?.contentFilter || {})
  );

  const youthnetTenantIds = tenantDetails
    ?.filter((item) => item?.name === TENANT_DATA.YOUTHNET)
    ?.map((item) => item?.tenantId);

  const scp = tenantDetails
    ?.filter((item) =>
      [
        TENANT_DATA.SECOND_CHANCE_PROGRAM,
        TENANT_DATA.PATHWAYS,
      ].includes(item.name)
    )
    ?.map((item) => item.tenantId);

 // const role = roleName;

  {
    // console.log('#### loginmultirole role', role);

    if (scp?.includes(tenantId)) {
      console.log('####loginintoscp', scp);
      await setDataInStorage('userType', 'scp');
      navigation.navigate('SCPUserTabScreen');

      // if (cohort_id) {
      //   navigation.navigate('SCPUserTabScreen');
      // } else {
      //   navigation.navigate('Dashboard');
      // }
    } else {
      if (tenantId === youthnetTenantIds?.[0]) {
        await setDataInStorage('userType', 'youthnet');
        // navigation.navigate('YouthNetTabScreen');
        navigation.navigate('Dashboard');
      } else {
        // await setDataInStorage('userType', 'pragyanpath');
        await setDataInStorage('userType', tenantData?.[0]?.tenantName);
        navigation.navigate('Dashboard');
      }
    }
    const deviceId = await getDeviceId();
    const action = 'add';

    await notificationSubscribe({ deviceId, user_id, action });
  }
  
  const now = moment();

  const telemetryPayloadData = {
    event: 'login',
    type: 'click',
    ets: now.unix(),
  };
  await telemetryTrackingData({
    telemetryPayloadData,
  });

  // Storage now reflects the newly selected program — let screens that are
  // reused across programs (not recreated by the navigate above) re-fetch
  // program-scoped state such as Assessment Attempts.
  DeviceEventEmitter.emit(PROGRAM_SWITCHED_EVENT);

  };

  const handleSelectedProgramLogin = async (selectedtenantId, userId, token, refreshToken) => {
    console.log('#### selectedProgramLogin', selectedtenantId, userId);
    await saveAccessToken(token || '');
    await saveRefreshToken(refreshToken || '');

    const user_id = userId;

    // Store userId and minimal tenantData first so getHeaders() has a tenantId for subsequent API calls
    await setDataInStorage('userId', user_id || '');
    await setDataInStorage('tenantData', JSON.stringify([{ tenantId: selectedtenantId }]));

    // Use getUserDetails API (same reliable source as ProgramSwitch) to get the full tenant name
    // getuserDetails() can return stale/wrong data depending on token state,
    // but getUserDetails({ user_id }) always returns the live enrolled tenant list
    const userResponse = await getUserDetails({ user_id });
    const allTenantData = userResponse?.userData?.tenantData || [];

    // Fallback to getuserDetails if the API didn't return tenant data
    let fallbackUserDetails = null;
    if (!allTenantData.length) {
      fallbackUserDetails = await getuserDetails();
    }
    const resolvedAllTenants = allTenantData.length
      ? allTenantData
      : (fallbackUserDetails?.tenantData || []);

    const tenantData = [
      resolvedAllTenants.find((tenant) => tenant.tenantId === selectedtenantId),
    ];
    const selectedTenantName = tenantData?.[0]?.tenantName;
    console.log('#### selectedProgramLogin tenantName', selectedTenantName);

    const enrollmentId = fallbackUserDetails?.enrollmentId || userResponse?.userData?.enrollmentId;
    const uiConfig = tenantData?.[0]?.params?.uiConfig;
    await setDataInStorage('uiConfig', JSON.stringify(uiConfig || {}));
    await setDataInStorage('tenantData', JSON.stringify(tenantData));
    await setDataInStorage('enrollmentId', enrollmentId || '');

    const templateId = tenantData?.[0]?.templateId;
    await setDataInStorage('templateId', templateId || '');

    const academicyear = await setAcademicYear({ tenantid: selectedtenantId });
    const academicYearId = academicyear?.[0]?.id;
    await setDataInStorage('academicYearId', academicYearId || '');
    await setDataInStorage('userTenantid', selectedtenantId || '');

    const cohort = await getCohort({
      user_id,
      tenantid: selectedtenantId,
      academicYearId,
    });
    console.log('#### selectedProgramLogin cohort', cohort);
    // Drop the previous program's batch first: if this program has no active
    // cohort below, cohortData must stay empty rather than leak across programs.
    await setDataInStorage('cohortData', '');
    let cohort_id;
    if (cohort.params?.status !== 'failed') {
      const getActiveCohort = await getActiveCohortData(cohort);
      const getActiveCohortId = await getActiveCohortIds(cohort);
      await setDataInStorage('cohortData', JSON.stringify(getActiveCohort?.[0]) || '');
      cohort_id = getActiveCohortId?.[0];
    }

    const profileData = await getProfileDetails({ userId: user_id });
    console.log('#### selectedProgramLogin profileData', profileData);
    await setDataInStorage('profileData', JSON.stringify(profileData));
    await setDataInStorage('Username', profileData?.getUserDetails?.[0]?.username || '');
    await storeUsername(profileData?.getUserDetails?.[0]?.username);

    await setDataInStorage('cohortId', cohort_id || '00000000-0000-0000-0000-000000000000');

    const tenantDetails = (await getProgramDetails()) || [];
    const MatchedTenant = tenantDetails.filter((item) => item?.tenantId === selectedtenantId);
    await setDataInStorage('contentFilter', JSON.stringify(MatchedTenant?.[0]?.contentFilter || {}));

    // Determine program type using tenant name (reliable) as primary,
    // tenant ID match from getProgramDetails as secondary.
    // selectedTenantName comes directly from the user's enrolled tenant data via getUserDetails API.
    const scpTenantIds = tenantDetails?.filter((item) => [TENANT_DATA.SECOND_CHANCE_PROGRAM, TENANT_DATA.PATHWAYS].includes(item?.name))?.map((item) => item?.tenantId);
    const youthnetTenantIds = tenantDetails?.filter((item) => item?.name === TENANT_DATA.YOUTHNET)?.map((item) => item?.tenantId);
    const campToClubTenantIds = tenantDetails?.filter((item) => item?.name === TENANT_DATA.CAMP_TO_CLUB)?.map((item) => item?.tenantId);

    if ([TENANT_DATA.SECOND_CHANCE_PROGRAM, TENANT_DATA.PATHWAYS].includes(selectedTenantName) || scpTenantIds?.includes(selectedtenantId)) {
      console.log('#### selectedProgramLogin → SCPUserTabScreen');
      await setDataInStorage('userType', 'scp');
      navigation.reset({ index: 0, routes: [{ name: 'SCPUserTabScreen' }] });
    } else if (selectedTenantName === TENANT_DATA.YOUTHNET || youthnetTenantIds?.includes(selectedtenantId)) {
      console.log('#### selectedProgramLogin → Dashboard (youthnet)');
      await setDataInStorage('userType', 'youthnet');
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } else if (selectedTenantName === TENANT_DATA.CAMP_TO_CLUB || campToClubTenantIds?.includes(selectedtenantId)) {
      console.log('#### selectedProgramLogin → Dashboard (campToClub)');
      await setDataInStorage('userType', TENANT_DATA.CAMP_TO_CLUB);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } else {
      console.log('#### selectedProgramLogin → Dashboard, userType:', selectedTenantName);
      await setDataInStorage('userType', selectedTenantName || selectedtenantId);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }

    const deviceId = await getDeviceId();
    await notificationSubscribe({ deviceId, user_id, action: 'add' });

    const now = moment();
    await telemetryTrackingData({
      telemetryPayloadData: { event: 'login', type: 'click', ets: now.unix() },
    });
  };

  const handleWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Received from web:', message);
      
      if (message.type === 'ANDROID_APP_FLAG_SET') {
        console.log('✓ isAndroidApp confirmed in localStorage:', message.value);
        return;
      }

      if (message.type === 'COHORT_ASSIGNED_ACADEMIC_YEAR_ID') {
        await setDataInStorage(
          await getBatchAssignmentCacheKey(),
          message.value || ''
        );
        return;
      }

      if (message.type === 'PREFERRED_LANGUAGE') {
        await setDataInStorage('preferred_language', message.value || '');
        return;
      }

      if (message.type === 'UI_CONFIG') {
        await setDataInStorage('uiConfig', message.value || '{}');
        return;
      }

      if (message.type === 'LANGUAGE_CHANGE_EVENT') {
       console.log("Language changed to:", message.data);
       if(message.data.language === 'mr')
       {
        setLanguage('ma');
       }
       else if(message.data.language === 'tel')
       {
        setLanguage('te');
       }
       else if(message.data.language === 'guj')
       {
        setLanguage('gu');
       }
       else if(message.data.language === 'tam')
       {
        setLanguage('ta');
       }
       else if(message.data.language === 'kan')
       {
        setLanguage('kn');
       }
       else if(message.data.language === 'odi')
       {
        setLanguage('odia');
       }
       else
       setLanguage(message.data.language);
      }
      
      if (message.type === 'ENROLL_PROGRAM_EVENT') {
        const tenantId = message.data.tenantId;
        const userId = message.data.userId;
        const token = message.data.token;
        const refreshToken = message.data.refreshToken;
        await handleProgramLogin(tenantId, userId, token, refreshToken);

        // Handle the event
        console.log('User data:', message.data);
      }
      
      if (message.type === 'ACCESS_PROGRAM_EVENT') {
        console.log("Hellooooo")
        const tenantId = message.data.tenantId;
        const userId = message.data.userId;
        const token = message.data.token;
        const refreshToken = message.data.refreshToken;
        await handleProgramLogin(tenantId, userId, token, refreshToken);

        console.log('Access Program data:', message.data);
      }
      
      if (message.type === 'LOGIN_INTO_SELECTED_PROGRAM_EVENT') {
        const { selectedtenantId, userId, token, refreshToken } = message.data;
        console.log('Login into selected program data:', message.data);
        await handleProgramLogin(selectedtenantId, userId, token, refreshToken);
      }

      if (message.type === 'LOGIN_INTO_ONLY_ONE_PROGRAM_EVENT') {
        const tenantId = message.data.tenantId;
        const userId = message.data.userId;
        const token = message.data.token;
        const refreshToken = message.data.refreshToken;
        console.log('Login into Only One Program data:', message.data);


        
        await handleProgramLogin(tenantId, userId, token, refreshToken);
        //  const refreshToken = ""
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  return (
    <SafeAreaWrapper excludeTop={true}>
      <View style={styles.container}>
        <View style={styles.webviewContainer}>
          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            originWhitelist={['*']}
            injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
            injectedJavaScript={injectedJavaScript}
            onLoad={() => {
              setLoading(false);
              // Re-inject the localStorage value after page loads
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(injectedJavaScript);
              }
            }}
            onNavigationStateChange={(navState) => {
              // Update canGoBack state
              setCanGoBack(navState.canGoBack);
              
              // Re-inject on every navigation to ensure it persists
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(injectedJavaScript);
              }
              console.log('WebView Path Changed:', navState.url);
              console.log('Can Go Back:', navState.canGoBack);
              // if (navState.url === 'https://qa-plp.prathamdigital.org/login') {
              //   // Only navigate when screen is focused to prevent redirect loop
              //   if (isFocused) {
              //     navigation.navigate('LoginScreen');
              //     // Go back in WebView history so it's not on /login when user returns
              //     if (navState.canGoBack && webViewRef.current) {
              //       webViewRef.current.goBack();
              //     }
              //   }
              // }
            }}
            onShouldStartLoadWithRequest={(request) => {
              // if (request.url === 'https://qa-plp.prathamdigital.org/login') {
              //   if (isFocused) {
              //     navigation.navigate('LoginScreen');
              //   }
              //   return false;
              // }
              return true;
            }}
            onMessage={handleWebViewMessage}
            onOpenWindow={(syntheticEvent) => {
              // Links with target="_blank" (e.g. the Pragyanpath/ERP SSO link)
              // would otherwise be handed off to the external system browser,
              // which loses the WebView's localStorage/session (isAndroidApp
              // flag, tenant/channel state), breaking the SSO callback flow.
              // Navigating the same WebView keeps everything in one session.
              const { targetUrl } = syntheticEvent.nativeEvent;
              if (targetUrl && webViewRef.current) {
                webViewRef.current.injectJavaScript(
                  `window.location.href = ${JSON.stringify(targetUrl)}; true;`
                );
              }
            }}
            style={styles.webview}
            startInLoadingState={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            )}
          />
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 40,
  },
  webviewContainer: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default PlpWebViewScreen;
