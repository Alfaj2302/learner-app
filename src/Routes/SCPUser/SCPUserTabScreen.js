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
import { getDataFromStorage, setDataInStorage } from '../../utils/JsHelper/Helper';
import {
  findProgramCohort,
  getProgramAcademicYearIds,
  isActiveBatch,
} from '../../utils/API/AuthService';
import {
  useTabBarStyle,
  useTabLabelStyle,
} from '../../utils/Helper/TabScreenHelper';

const Tab = createBottomTabNavigator();
// While the current program has no batch, how often (at most) the tab screen
// re-checks all of its academic years for a newly assigned one.
const FULL_SCAN_INTERVAL_MS = 30 * 1000;
const WalkthroughableView = walkthroughable(View);

const SCPUserTabScreen = () => {
  const { t } = useTranslation();
  const { copilotEvents } = useCopilot();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const appState = useRef(AppState.currentState);
  const refreshInFlightRef = useRef(false);
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
    // The 3s poll below can fire while a slower multi-year lookup is running.
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    const applyTabsFrom = (data) => {
      const eligible = isActiveBatch(data);
      setShowMyClassTab(eligible);
      setShowHomeTab(eligible);
    };
    const applyTabsFromStorage = async () => {
      try {
        const cohortparse = await getDataFromStorage('cohortData');
        applyTabsFrom(cohortparse ? JSON.parse(cohortparse) : null);
      } catch (storageError) {
        applyTabsFrom(null);
      }
    };

    try {
      // Get required data from storage
      const tenantData = JSON.parse(await getDataFromStorage('tenantData') || '[]');
      const tenantid = tenantData?.[0]?.tenantId;
      const user_id = await getDataFromStorage('userId');
      const academicYearId = await getDataFromStorage('academicYearId');

      if (!tenantid || !user_id || !academicYearId) {
        // If required data is missing, try to read from existing storage
        await applyTabsFromStorage();
        return;
      }

      // Every tick: only the academic year already resolved for this program.
      let result = await findProgramCohort({
        user_id,
        tenantid,
        academicYearIds: [academicYearId],
      });

      // A batch assigned while logged in can sit in another academic year of
      // this program (login checks them all, this poll only checks one), so
      // while there is no batch, periodically check every year.
      const now = Date.now();
      if (
        !isActiveBatch(result.cohort) &&
        now - lastFullScanRef.current > FULL_SCAN_INTERVAL_MS
      ) {
        lastFullScanRef.current = now;
        const fullResult = await findProgramCohort({
          user_id,
          tenantid,
          academicYearIds: await getProgramAcademicYearIds({
            tenantid,
            preferredAcademicYearId: academicYearId,
          }),
        });
        if (isActiveBatch(fullResult.cohort) || result.failed) {
          result = fullResult;
        }
      }

      if (result.failed) {
        // If API call failed, read from existing storage
        await applyTabsFromStorage();
        return;
      }

      // tenantid is the current program, so this only ever replaces the
      // current program's cohort, never another program's.
      await setDataInStorage(
        'cohortData',
        result.cohort ? JSON.stringify(result.cohort) : ''
      );
      await setDataInStorage(
        'cohortId',
        result.cohort?.cohortId || '00000000-0000-0000-0000-000000000000'
      );
      if (result.academicYearId && result.academicYearId !== academicYearId) {
        await setDataInStorage('academicYearId', result.academicYearId);
      }

      // Update tab visibility based on cohort data
      applyTabsFrom(result.cohort);
    } catch (error) {
      console.error('Error refreshing cohort data:', error);
      // Fallback to reading from storage on error
      await applyTabsFromStorage();
    } finally {
      refreshInFlightRef.current = false;
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
        // full-scan throttle so a batch assigned meanwhile shows immediately.
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
