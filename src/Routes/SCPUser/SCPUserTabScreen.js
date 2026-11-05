import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet, TouchableOpacity, View, AppState } from 'react-native';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { useTranslation } from '../../context/LanguageContext';
import SimpleIcon from 'react-native-vector-icons/SimpleLineIcons';
import SCPUserStack from './SCPUserStack';
import MyClassStack from './MyClassStack';
import ProfileStack from '../Public/ProfileStack';
import DashboardStack from '../Public/DashboardStack';
import profile from '../../assets/images/png/profile.png';
import profile_filled from '../../assets/images/png/profile_filled.png';
import home from '../../assets/images/png/home.png';
import home_filled from '../../assets/images/png/home_filled.png';
import book_filled from '../../assets/images/png/book_filled.png';
import book from '../../assets/images/png/book.png';
import Coursesfilled from '../../assets/images/png/Coursesfilled.png';
import Coursesunfilled from '../../assets/images/png/Coursesunfilled.png';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';
import { 
  getDataFromStorage, 
  getActiveCohortData, 
  getActiveCohortIds,
  setDataInStorage 
} from '../../utils/JsHelper/Helper';
import { getAcademicYearList, getCohort } from '../../utils/API/AuthService';
import {
  useTabBarStyle,
  useTabLabelStyle,
} from '../../utils/Helper/TabScreenHelper';

const Tab = createBottomTabNavigator();
// While the current program has no batch, how often (at most) the refresh
// re-checks the program's other academic years for a newly assigned one.
const FULL_SCAN_INTERVAL_MS = 30 * 1000;
// Requests have no timeout, so a refresh stuck on a dead connection must not
// block every later refresh forever.
const REFRESH_STALE_MS = 60 * 1000;

// True when a mycohorts response's first active cohort is an active batch —
// the same cohort the refresh below stores and checks.
const hasActiveBatch = (cohort) => {
  if (!Array.isArray(cohort)) return false;
  const first = cohort.find((item) => item?.cohortMemberStatus === 'active');
  return first?.type === 'BATCH' && first?.cohortStatus === 'active';
};
const WalkthroughableView = walkthroughable(View);

const SCPUserTabScreen = () => {
  const { t } = useTranslation();
  const { copilotEvents } = useCopilot();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const appState = useRef(AppState.currentState);
  const refreshStartedAtRef = useRef(0);
  const lastFullScanRef = useRef(0);
  const [CopilotStopped, setCopilotStopped] = useState(false);
  const [showCoursesTab, setShowCoursesTab] = useState(false);
  const [showMyClassTab, setShowMyClassTab] = useState(false);
  const [showHomeTab, setShowHomeTab] = useState(false);
  const tabBarStyle = useTabBarStyle();
  const tabLabelStyle = useTabLabelStyle();



  useEffect(() => {
    copilotEvents?.on('stop', () => setCopilotStopped(true));
  }, [copilotEvents]);

  // Function to update cohort data from API and refresh tabs
  const refreshCohortData = useCallback(async () => {
    // The 3s poll below can fire while a slower multi-year check is running.
    const startedAt = Date.now();
    if (startedAt - refreshStartedAtRef.current < REFRESH_STALE_MS) return;
    refreshStartedAtRef.current = startedAt;

    try {
      // Get required data from storage
      const tenantData = JSON.parse(await getDataFromStorage('tenantData') || '[]');
      const tenantid = tenantData?.[0]?.tenantId;
      const user_id = await getDataFromStorage('userId');
      const academicYearId = await getDataFromStorage('academicYearId');

      if (!tenantid || !user_id || !academicYearId) {
        // If required data is missing, try to read from existing storage
        const cohortparse = await getDataFromStorage('cohortData');
        if (!cohortparse) {
          setShowHomeTab(false);
          setShowMyClassTab(false);
          return;
        }
        const data = JSON.parse(cohortparse);
        const eligible =
          data?.type === 'BATCH' &&
          data?.cohortMemberStatus === 'active' &&
          data?.cohortStatus === 'active';
        setShowMyClassTab(!!eligible);
        setShowHomeTab(!!eligible);
        return;
      }

      // Fetch fresh cohort data from API
      let cohort = await getCohort({
        user_id,
        tenantid,
        academicYearId,
      });

      // Login checks every academic year of the program, but this refresh only
      // checks the stored one. A batch assigned while logged in can belong to a
      // different year, so while there is no batch, periodically check the others.
      const now = Date.now();
      if (
        !hasActiveBatch(cohort) &&
        now - lastFullScanRef.current > FULL_SCAN_INTERVAL_MS
      ) {
        lastFullScanRef.current = now;
        const academicYears = await getAcademicYearList({ tenantid });
        for (const academicYear of Array.isArray(academicYears) ? academicYears : []) {
          if (!academicYear?.id || academicYear.id === academicYearId) continue;
          const otherCohort = await getCohort({
            user_id,
            tenantid,
            academicYearId: academicYear.id,
          });
          if (hasActiveBatch(otherCohort)) {
            cohort = otherCohort;
            await setDataInStorage('academicYearId', academicYear.id);
            break;
          }
        }
      }

      if (cohort?.params?.status !== 'failed' && cohort) {
        const getActiveCohort = await getActiveCohortData(cohort);
        const getActiveCohortId = await getActiveCohortIds(cohort);
        
        // Update cohortData in storage
        await setDataInStorage(
          'cohortData',
          JSON.stringify(getActiveCohort?.[0]) || ''
        );
        
        // Update cohortId in storage
        const cohort_id = getActiveCohortId?.[0];
        await setDataInStorage(
          'cohortId',
          cohort_id || '00000000-0000-0000-0000-000000000000'
        );

        // Update tab visibility based on cohort data
        const cohortData = getActiveCohort?.[0];
        const eligible =
          cohortData?.type === 'BATCH' &&
          cohortData?.cohortMemberStatus === 'active' &&
          cohortData?.cohortStatus === 'active';
        setShowMyClassTab(!!eligible);
        setShowHomeTab(!!eligible);
      } else {
        // If API call failed, read from existing storage
        const cohortparse = await getDataFromStorage('cohortData');
        if (!cohortparse) {
          setShowHomeTab(false);
          setShowMyClassTab(false);
          return;
        }
        const data = JSON.parse(cohortparse);
        const eligible =
          data?.type === 'BATCH' &&
          data?.cohortMemberStatus === 'active' &&
          data?.cohortStatus === 'active';
        setShowMyClassTab(!!eligible);
        setShowHomeTab(!!eligible);
      }
    } catch (error) {
      console.error('Error refreshing cohort data:', error);
      // Fallback to reading from storage on error
      try {
        const cohortparse = await getDataFromStorage('cohortData');
        if (!cohortparse) {
          setShowHomeTab(false);
          setShowMyClassTab(false);
          return;
        }
        const data = JSON.parse(cohortparse);
        const eligible =
          data?.type === 'BATCH' &&
          data?.cohortMemberStatus === 'active' &&
          data?.cohortStatus === 'active';
        setShowMyClassTab(!!eligible);
        setShowHomeTab(!!eligible);
      } catch (storageError) {
        setShowHomeTab(false);
        setShowMyClassTab(false);
      }
    } finally {
      // Only clear our own run; a stale run finishing late must not reset a newer one.
      if (refreshStartedAtRef.current === startedAt) {
        refreshStartedAtRef.current = 0;
      }
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    refreshCohortData();
  }, [refreshCohortData]);

  // Refresh cohort data when screen comes into focus (on reload/navigation)
  useFocusEffect(
    useCallback(() => {
      refreshCohortData();
    }, [refreshCohortData])
  );

  // Add navigation state listener to refresh on navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      // Refresh when navigation state changes (handles reload scenarios)
      refreshCohortData();
    });

    return unsubscribe;
  }, [navigation, refreshCohortData]);

  // Add AppState listener to refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground, refresh cohort data. Skip the
        // multi-year throttle so a batch assigned meanwhile shows immediately.
        lastFullScanRef.current = 0;
        refreshCohortData();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [refreshCohortData]);

  // Refresh when screen becomes focused (handles reload scenarios)
  useEffect(() => {
    if (isFocused) {
      refreshCohortData();
    }
  }, [isFocused, refreshCohortData]);

  // Periodic check when screen is focused (catches edge cases where other listeners might miss)
  useEffect(() => {
    if (!isFocused) return;

    // Check every 3 seconds when screen is focused to catch any storage updates
    const intervalId = setInterval(() => {
      if (isFocused && AppState.currentState === 'active') {
        refreshCohortData();
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isFocused, refreshCohortData]);

  // Ensure Home tab is selected after login/mount if available
  useEffect(() => {
    if (showHomeTab) {
      navigation.navigate('SCPUserStack');
    }
  }, [showHomeTab, navigation]);

  return (
    <Tab.Navigator
      initialRouteName="SCPUserStack"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          if (route.name === 'MyClass') {
            if (focused) {
              return (
                <Image source={book_filled} style={{ width: 30, height: 30 }} />
              );
            } else {
              return <Image source={book} style={{ width: 30, height: 30 }} />;
            }
          } else if (route.name === 'SCPUserStack') {
            if (focused) {
              return (
                <Image source={home_filled} style={{ width: 30, height: 30 }} />
              );
            } else {
              return <Image source={home} style={{ width: 30, height: 30 }} />;
            }
          } else if (route.name === 'AssessmentStack') {
            return (
              <SimpleIcon
                name="note"
                color={focused ? '#987100' : 'black'}
                size={30}
              />
            );
          } else if (route.name === 'Profile') {
            if (focused) {
              return (
                <Image
                  source={profile_filled}
                  style={{ width: 30, height: 30 }}
                />
              );
            } else {
              return (
                <Image source={profile} style={{ width: 30, height: 30 }} />
              );
            }
          }
        },
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: '#987100',
        tabBarInactiveTintColor: 'gray',
        tabBarActiveBackgroundColor: '#F7ECDF',
        tabBarLabelStyle: tabLabelStyle,
      })}
    >
      
      {showHomeTab && (<Tab.Screen
        name="SCPUserStack"
        component={SCPUserStack}
        options={{ tabBarLabel: t('home') }}
      />)}
     
      {showMyClassTab && (<Tab.Screen
        name="MyClass"
        component={MyClassStack}
        options={{ tabBarLabel: t('my_class') }}
      />)}
      {/* <Tab.Screen
        name="AssessmentStack"
        component={AssessmentStack}
        options={{ tabBarLabel: t('assessment') }}
      /> */}
       {  (
        <Tab.Screen
          name="DashboardStack"
          options={{
            tabBarLabel: t('courses'),
            tabBarButton: (props) => (
              <CopilotStep
                text="This is the courses tab. Tap here to explore courses!"
                order={3}
                name="coursesTab"
              >
                <WalkthroughableView style={{ flex: 1 }}>
                  <TouchableOpacity {...props} />
                </WalkthroughableView>
              </CopilotStep>
            ),
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? Coursesfilled : Coursesunfilled}
                style={{ width: 30, height: 30 }}
              />
            ),
          }}
        >
          {(props) => (
            <DashboardStack {...props} CopilotStopped={CopilotStopped} />
          )}
        </Tab.Screen>
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabel: t('profile') }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  footer: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    paddingBottom: 10, // Add 10px padding below the label
  },
});

export default SCPUserTabScreen;
