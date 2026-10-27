// import {
//   View,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   // SafeAreaView,
//   Pressable,
//   ScrollView,
//   StatusBar,
// } from 'react-native';
// import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
// import { useState, React, useEffect } from 'react';
// import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
// import { useNavigation } from '@react-navigation/native';
// import {
//   getCohort,
//   getProfileDetails,
//   getProgramDetails,
//   login,
//   notificationSubscribe,
//   setAcademicYear,
//   telemetryTrackingData,
// } from '../../utils/API/AuthService';
// import {
//   getActiveCohortData,
//   getActiveCohortIds,
//   getDataFromStorage,
//   getDeviceId,
//   getuserDetails,
//   saveAccessToken,
//   saveRefreshToken,
//   setDataInStorage,
//   storeUsername,
// } from '../../utils/JsHelper/Helper';
// import LoginTextField from '../../components/LoginTextField/LoginTextField';
// import UserNameField from '../../components/LoginTextField/UserNameField';
// import { useTranslation } from '../../context/LanguageContext';
// import ActiveLoading from '../LoadingScreen/ActiveLoading';
// import Logo from '../../assets/images/png/logo.png';
// import globalStyles from '../../utils/Helper/Style';
// import { useInternet } from '../../context/NetworkContext';
// import NetworkAlert from '../../components/NetworkError/NetworkAlert';
// import GlobalText from '@components/GlobalText/GlobalText';
// import moment from 'moment';
// import { TENANT_DATA } from '../../utils/Constants/app-constants';
// import SwitchAccountDialog from '../../utils/SwitchAccount/SwitchAccount';

// const LoginScreen = () => {
//   const navigation = useNavigation();
//   const { t } = useTranslation();
//   const { isConnected } = useInternet();
//   const [userName, setUserName] = useState('');
//   const [password, setPassword] = useState('');
//   const [acceptTerms] = useState(false);
//   const [isDisabled, setIsDisabled] = useState(true);
//   const [errmsg, setErrmsg] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [networkstatus, setNetworkstatus] = useState(true);
//   const [usernames, setUsernames] = useState([]);

//   const onChangeText = (e) => {
//     setUserName(e.trim());
//   };
//   const onChangePassword = (e) => {
//     setPassword(e.trim());
//   };

//   const handleLogin = async () => {
//     if (isConnected) {
//       setNetworkstatus(true);
//       setLoading(true);
//       const payload = {
//         username: userName,
//         password: password,
//       };
//       const data = await login(payload);

//       if (data?.access_token) {
//         await saveRefreshToken(data?.refresh_token || '');
//         await saveAccessToken(data?.access_token || '');

//         const userDetails = await getuserDetails();

//         console.log('#### loginmultirole userDetails', userDetails);

//         setUserDetails(userDetails);

//         setSwitchDialogOpen(true);

//         setLoading(false);
//       } else {
//         setLoading(false);
//         setErrmsg(data?.params?.errmsg.toLowerCase().replace(/ /g, '_'));
//       }
//     } else {
//       setNetworkstatus(false);
//     }
//   };

//   const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
//   const [userDetails, setUserDetails] = useState(null);
//   const [tenantId, setTenantId] = useState('');
//   const [tenantName, setTenantName] = useState('');
//   const [roleId, setRoleId] = useState('');
//   const [roleName, setRoleName] = useState('');

//   const callBackSwitchDialog = async (
//     tenantId,
//     tenantName,
//     roleId,
//     roleName
//   ) => {
//     setLoading(true);
//     setSwitchDialogOpen(false);

//     // Set the state values
//     setTenantId(tenantId);
//     setTenantName(tenantName);
//     setRoleId(roleId);
//     setRoleName(roleName);

//     const tenantid = tenantId;

//     console.log('#### loginmultirole tenantId', tenantId);
//     console.log('#### loginmultirole tenantName', tenantName);
//     console.log('#### loginmultirole roleId', roleId);
//     console.log('#### loginmultirole roleName', roleName);

//     console.log('#### loginmultirole userDetails', userDetails);
//     const user_id = userDetails?.userId;
//     const tenantData = [
//       userDetails?.tenantData?.find((tenant) => tenant.tenantId === tenantId),
//     ];
//     console.log('#### loginmultirole tenantData', tenantData);

//     const enrollmentId = userDetails?.enrollmentId;
//     await setDataInStorage('tenantData', JSON.stringify(tenantData || {}));
//     await setDataInStorage('userId', user_id || '');
//     await setDataInStorage('enrollmentId', enrollmentId || '');

//     //store dynamci templateId
//     const templateId = tenantData?.[0]?.templateId;
//     await setDataInStorage('templateId', templateId || '');

//     const academicyear = await setAcademicYear({ tenantid });
//     const academicYearId = academicyear?.[0]?.id;
//     await setDataInStorage('academicYearId', academicYearId || '');
//     await setDataInStorage('userTenantid', tenantId || '');
//     const cohort = await getCohort({ user_id, tenantid, academicYearId });
//     console.log('#### loginmultirole cohort', cohort);
//     let cohort_id;
//     if (cohort.params?.status !== 'failed') {
//       const getActiveCohort = await getActiveCohortData(cohort);
//       const getActiveCohortId = await getActiveCohortIds(cohort);
//       await setDataInStorage(
//         'cohortData',
//         JSON.stringify(getActiveCohort?.[0]) || ''
//       );
//       cohort_id = getActiveCohortId?.[0];
//     }

//     const profileData = await getProfileDetails({
//       userId: user_id,
//     });
//     console.log('#### loginmultirole profileData', profileData);

//     await setDataInStorage('profileData', JSON.stringify(profileData));
//     await setDataInStorage(
//       'Username',
//       profileData?.getUserDetails?.[0]?.username || ''
//     );
//     await storeUsername(profileData?.getUserDetails?.[0]?.username);

//     await setDataInStorage(
//       'cohortId',
//       cohort_id || '00000000-0000-0000-0000-000000000000'
//     );
//     const tenantDetails = (await getProgramDetails()) || [];

//     const MatchedTenant = tenantDetails.filter(
//       (item) => item?.tenantId === tenantId
//     );

//     // console.log('tenantDetails===>', JSON.stringify(tenantDetails));
//     // console.log(
//     //   'MatchedTenant===>',
//     //   JSON.stringify(MatchedTenant?.[0]?.contentFilter)
//     // );

//     await setDataInStorage(
//       'contentFilter',
//       JSON.stringify(MatchedTenant?.[0]?.contentFilter || {})
//     );

//     const youthnetTenantIds = tenantDetails
//       ?.filter((item) => item?.name === TENANT_DATA.YOUTHNET)
//       ?.map((item) => item?.tenantId);

//     const scp = tenantDetails
//       ?.filter((item) => item.name === 'Second Chance Program')
//       ?.map((item) => item.tenantId);

//     const role = roleName;

//     if (role == 'Learner' || role == 'Student') {
//       console.log('#### loginmultirole role', role);

//       if (tenantId === scp?.[0]) {
//         console.log('####loginintoscp', scp);
//         await setDataInStorage('userType', 'scp');
//         navigation.navigate('SCPUserTabScreen');

//         // if (cohort_id) {
//         //   navigation.navigate('SCPUserTabScreen');
//         // } else {
//         //   navigation.navigate('Dashboard');
//         // }
//       } else {
//         if (tenantId === youthnetTenantIds?.[0]) {
//           await setDataInStorage('userType', 'youthnet');
//           // navigation.navigate('YouthNetTabScreen');
//           navigation.navigate('Dashboard');
//         } else {
//           // await setDataInStorage('userType', 'pragyanpath');
//           await setDataInStorage('userType', tenantData?.[0]?.tenantName);
//           navigation.navigate('Dashboard');
//         }
//       }
//       const deviceId = await getDeviceId();
//       const action = 'add';

//       await notificationSubscribe({ deviceId, user_id, action });
//     } else {
//       setErrmsg('invalid_username_or_password');
//     }
//     const now = moment();

//     const telemetryPayloadData = {
//       event: 'login',
//       type: 'click',
//       ets: now.unix(),
//     };
//     await telemetryTrackingData({
//       telemetryPayloadData,
//     });

//     setLoading(false);
//   };

//   const callBackError = () => {
//     setErrmsg('invalid_username_or_password');
//   };

//   // const handleLogin = async () => {
//   //   navigation.navigate('Dashboard');
//   // };

//   useEffect(() => {
//     if (userName.length > 0 && password.length > 0 && acceptTerms) {
//       setIsDisabled(false);
//     } else {
//       setIsDisabled(true);
//     }
//   }, [userName, password, acceptTerms]);

//   useEffect(() => {
//     const fetchData = async () => {
//       const data = JSON.parse(await getDataFromStorage('usernames')) || [];
//       const filteredSuggestions = data.filter((item) => item != null);

//       setUsernames(filteredSuggestions);
//     };
//     fetchData();
//   }, []);

//   return (
//     <SafeAreaWrapper style={globalStyles.container}>
//       {loading ? (
//         <ActiveLoading />
//       ) : (
//         <ScrollView style={styles.scrollView} nestedScrollEnabled={true}>
//           <StatusBar
//             barStyle="dark-content"
//             // translucent={true}
//             backgroundColor="transparent"
//           />
//           <Image style={globalStyles.logo} source={Logo} resizeMode="contain" />

//           {/* <TouchableOpacity
//             style={[globalStyles.flexrow, globalStyles.heading]}
//             onPress={() => {
//               navigation.navigate('LoginSignUpScreen');
//             }}
//           >
//             <Image
//               source={backIcon}
//               resizeMode="contain"
//               style={{ width: 30, height: 30 }}
//             />
//             <GlobalText
              
//               style={[globalStyles.heading2, { color: '#4D4639' }]}
//             >
//               {t('back')}
//             </GlobalText>
//           </TouchableOpacity> */}
//           <View style={{ paddingVertical: 5 }}>
//             <GlobalText style={[globalStyles.h3, { marginTop: 15 }]}>
//               {t('login')}
//             </GlobalText>
//             {/* <GlobalText
              
//               style={[globalStyles.subHeading, { marginVertical: 5 }]}
//             >
//               {t('login_with_the_cred')}
//             </GlobalText> */}
//           </View>
//           <View style={styles.textfieldbox}>
//             <UserNameField
//               text="username"
//               onChangeText={onChangeText}
//               value={userName}
//               suggestions={usernames}
//             />
//             <View style={{ marginTop: 25 }}>
//               <LoginTextField
//                 text="password"
//                 onChangeText={onChangePassword}
//                 value={password}
//               />
//             </View>

//             {errmsg !== '' && (
//               <GlobalText
//                 style={[
//                   globalStyles.h6,
//                   {
//                     color: 'red',
//                     top: -10,
//                     left: 20,
//                     width: '90%',
//                     zIndex: -1,
//                   },
//                 ]}
//               >
//                 {t(errmsg || 'invalid_username_or_password')}
//               </GlobalText>
//             )}
//           </View>
//           <TouchableOpacity
//             onPress={() => {
//               navigation.navigate('ForgotPassword', { enableLogin: true });
//             }}
//             style={{ paddingLeft: 20, marginBottom: 30, zIndex: -1 }}
//           >
//             <GlobalText
//               style={[
//                 globalStyles.h6,
//                 {
//                   color: '#0D599E',
//                 },
//               ]}
//             >
//               {t('forgot_password')}?
//             </GlobalText>
//           </TouchableOpacity>
//           {/* <View style={globalStyles.flexrow}>
//             <CustomCheckbox value={savePassword} onChange={setSavePassword} />
//             <View>
//               <GlobalText  style={globalStyles.subHeading}>{t('remember_me')}</GlobalText>
//             </View>
//           </View> */}
//           {/* <View style={[globalStyles.flexrow, { paddingTop: 10 }]}>
//             <View>
//               <CustomCheckbox value={acceptTerms} onChange={setAcceptTerms} />
//             </View>
//             <View>
//               <GlobalText  style={globalStyles.subHeading}>
//                 {t('Read_T_&_C')}
//               </GlobalText>
//               <Pressable
//                 onPress={() => {
//                   navigation.navigate('TermsAndCondition');
//                 }}
//               >
//                 <GlobalText
                  
//                   style={[globalStyles.subHeading, { color: '#0D599E' }]}
//                 >
//                   {t('terms_and_conditions2')}
//                 </GlobalText>
//               </Pressable>
//             </View>
//           </View> */}
//           <View style={{ marginTop: 0 }}>
//             <PrimaryButton
//               text={t('login')}
//               onPress={handleLogin}
//               isDisabled={!isDisabled}
//             />
//           </View>
//           <Pressable
//             onPress={() => {
//               navigation.navigate('RegisterStart');
//             }}
//             style={{ alignItems: 'center', padding: 20 }}
//           >
//             <GlobalText style={[globalStyles.text, { color: '#0D599E' }]}>
//               {t('dont_have_account')}
//             </GlobalText>
//           </Pressable>
//         </ScrollView>
//       )}

//       <NetworkAlert
//         onTryAgain={handleLogin}
//         isConnected={networkstatus}
//         closeModal={() => {
//           setNetworkstatus(!networkstatus);
//         }}
//       />
//       <SwitchAccountDialog
//         visible={switchDialogOpen}
//         onClose={() => setSwitchDialogOpen(false)}
//         callbackFunction={callBackSwitchDialog}
//         authResponse={userDetails?.tenantData}
//         callBackError={callBackError}
//       />
//     </SafeAreaWrapper>
//   );
// };
// const styles = StyleSheet.create({
//   scrollView: {
//     flex: 1,
//   },
//   textfieldbox: {
//     marginTop: 20,
//   },
// });
// export default LoginScreen;
import React, { useState, useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, BackHandler, DeviceEventEmitter } from 'react-native';
import WebView from 'react-native-webview';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import BackHeader from '../../components/Layout/BackHeader';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  getCohort,
  getProfileDetails,
  getProgramDetails,
  getUserDetails,
  setAcademicYear,
  notificationSubscribe,
  telemetryTrackingData,
  getAcademicYearList,
} from '../../utils/API/AuthService';
import {
  getActiveCohortData,
  getActiveCohortIds,
  getBatchAssignmentCacheKey,
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

const LoginScreen = () => {
  console.log('#### LoginScreen url', url);
  const [loading, setLoading] = useState(true);
  const [errmsg, setErrmsg] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const webViewRef = useRef(null);
  const url =  `${Config.LEARNER_PLP_LINK}/login`

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
    const academicyearIdList = await getAcademicYearList({ tenantid: selectedtenantId });
    const activeAcademicYearId = academicyear?.[0]?.id;
    await setDataInStorage('userTenantid', selectedtenantId || '');
    // Drop the previous program's batch first: if this program has no active
    // cohort below, cohortData must stay empty rather than leak across programs.
    await setDataInStorage('cohortData', '');

    let cohort_id;
    let resolvedAcademicYearId = activeAcademicYearId;

    for (const ayItem of (academicyearIdList || [])) {
      const ayId = ayItem?.id;
      if (!ayId) continue;
      const cohortResult = await getCohort({
        user_id,
        tenantid: selectedtenantId,
        academicYearId: ayId,
      });
      console.log('#### selectedProgramLogin cohort for ayId', ayId, cohortResult);
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

export default LoginScreen;

