import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleIcon from 'react-native-vector-icons/SimpleLineIcons';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from '../../context/LanguageContext';
import {
  useTabBarStyle,
  useTabLabelStyle,
} from '../../utils/Helper/TabScreenHelper';
import DashboardStack from './DashboardStack';
import SurveyStack from '../Youthnet/SurveyStack';
import ExploreStack from '../Youthnet/ExploreStack';
import AssessmentStack from '../Youthnet/AssessmentStack';
import L2CoursesStack from '../Youthnet/L2CoursesStack';
import useActiveBatchEligibility from '../../utils/Helper/useActiveBatchEligibility';
import Contents from '../../screens/Dashboard/Contents';
import Coursesfilled from '../../assets/images/png/Coursesfilled.png';
import profile from '../../assets/images/png/profile.png';
import profile_filled from '../../assets/images/png/profile_filled.png';

import Coursesunfilled from '../../assets/images/png/Coursesunfilled.png';
import contentunfilled from '../../assets/images/png/content.png';
import contentfilled from '../../assets/images/png/content2.png';
import ProfileStack from './ProfileStack';
import {
  getDataFromStorage,
  setDataInStorage,
} from '../../utils/JsHelper/Helper';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';
import survey_filled from '@src/assets/images/png/survey_filled.png';
import survey_unfilled from '@src/assets/images/png/survey_unfilled.png';
import explore_FILL from '@src/assets/images/png/explore_FILL.png';
import explore_UNFILLED from '@src/assets/images/png/explore_UNFILLED.png';
import CampToClubSurveyWebViewScreen from '../../screens/CampToClubSurveyWebViewScreen/CampToClubSurveyWebViewScreen';
import { TENANT_DATA } from '../../utils/Constants/app-constants';

const Tab = createBottomTabNavigator();
const WalkthroughableView = walkthroughable(View); // Wrap Image component

// `${userId}:${cohortId}` of the batch the learner was last sent to L2 Courses
// for, so the redirect happens once per batch per login. Logout deletes it.
const L2_COURSES_SHOWN_KEY = 'l2CoursesShownFor';

  const TabScreen = () => {
  console.log('###### TabScreen----yyyyy');
  const { t } = useTranslation();
  const [contentShow, setContentShow] = useState(true);
  const [selfChildrenTabShow, setSelfChildrenTabShow] = useState(false);

  const [CopilotStarted, setCopilotStarted] = useState(false);
  const [CopilotStopped, setCopilotStopped] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [userType, setUserType] = useState('');
  const { start, goToNth, unregisterStep, copilotEvents } = useCopilot();
  const insets = useSafeAreaInsets();
  const tabBarStyle = useTabBarStyle();
  const tabLabelStyle = useTabLabelStyle();
  // Vocational Training learners with an active batch get the L2 Courses and
  // Assessment tabs.
  const hasActiveBatch = useActiveBatchEligibility(userType === 'youthnet');
  const navigation = useNavigation();
  const route = useRoute();

  // When a batch is assigned, and after each login with one, open L2 Courses
  // directly — once, so the learner can still move to other tabs afterwards.
  useEffect(() => {
    if (userType !== 'youthnet' || !hasActiveBatch) {
      return undefined;
    }
    let cancelled = false;
    const redirectToL2Courses = async () => {
      const userId = await getDataFromStorage('userId');
      const cohortId = await getDataFromStorage('cohortId');
      const shownFor = `${userId}:${cohortId}`;
      if (
        cancelled ||
        !userId ||
        !cohortId ||
        (await getDataFromStorage(L2_COURSES_SHOWN_KEY)) === shownFor
      ) {
        return;
      }
      await setDataInStorage(L2_COURSES_SHOWN_KEY, shownFor);
      if (!cancelled) {
        navigation.navigate(route.name, { screen: 'L2CoursesStack' });
      }
    };
    redirectToL2Courses();
    return () => {
      cancelled = true;
    };
  }, [userType, hasActiveBatch, navigation, route.name]);

  // useEffect(() => {
  //   const COPILOT_ENABLE = Config.COPILOT_ENABLE;

  //   if (!CopilotStarted && COPILOT_ENABLE) {
  //     unregisterStep('login'); // Unregister step 1
  //     unregisterStep('create_account'); // Unregister step 2
  //     start();
  //     copilotEvents.on('start', () => setCopilotStarted(true));
  //   }
  //   copilotEvents.on('stop', () => setCopilotStopped(true));
  // }, [start, copilotEvents]);

  // Use useFocusEffect to re-run when screen comes into focus
  // This will trigger when userType changes in storage
  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          let currentUserType = await getDataFromStorage('userType');
          console.log('###### Fetched userType:', currentUserType);
          
          const result = JSON.parse(await getDataFromStorage('profileData'));
          console.log(
            '########## getUserDetails',
            result?.getUserDetails?.[0]?.customFields
          );
          
          const volunteer = result?.getUserDetails?.[0]?.customFields.filter(
            (item) => item?.label === 'IS_VOLUNTEER'
          );
          console.log('###### volunteer', volunteer);
          
          const isVolunteerValue = volunteer?.[0]?.selectedValues?.[0];
          console.log('###### isVolunteer', isVolunteerValue);
          
          setIsVolunteer(isVolunteerValue);
          setUserType(currentUserType);
          
          // Update contentShow based on userType
          if (currentUserType === 'youthnet' ) {
            console.log('###### youthnetTab - hiding content, showing explore');
            setContentShow(false);
          } else {
            console.log('###### regularTab - showing content, hiding explore');
            setContentShow(true);
          }
          if (currentUserType === 'Camp to Club') {
            setSelfChildrenTabShow(true);
          } else {
            setSelfChildrenTabShow(false);
          }
        } catch (error) {
          console.error('###### Error fetching data:', error);
        }
      };

      fetchData();
    }, [])
  );

  return (
    <Tab.Navigator
      initialRouteName="DashboardStack"
      screenOptions={() => ({
        headerShown: false,
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: '#987100',
        tabBarInactiveTintColor: 'gray',
        tabBarActiveBackgroundColor: '#F7ECDF',
        tabBarLabelStyle: tabLabelStyle,
      })}
    >
      {!selfChildrenTabShow && (<Tab.Screen
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
      </Tab.Screen>)}

      {selfChildrenTabShow && (<>
        <Tab.Screen
        name="CoursesForChildren"
        options={{
          tabBarLabel: t('for_children') || 'For Children',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? Coursesfilled : Coursesunfilled}
              style={{ width: 30, height: 30 }}
            />
          ),
        }}
      >
        {(props) => (
          <DashboardStack {...props} CopilotStopped={CopilotStopped} customProp="forchildren" />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="CoursesForSelf"
        options={{
          tabBarLabel: t('for_self') || 'For Self',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? Coursesfilled : Coursesunfilled}
              style={{ width: 30, height: 30 }}
            />
          ),
        }}
      >
        {(props) => (
          <DashboardStack {...props} CopilotStopped={CopilotStopped} customProp="self" />
        )}
      </Tab.Screen>
      </>
       )}

      {userType === TENANT_DATA.CAMP_TO_CLUB && (
        <Tab.Screen
          name="campToClubSurvey"
          component={CampToClubSurveyWebViewScreen}
          options={{
            tabBarLabel: t('surveys'),
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? survey_filled : survey_unfilled}
                style={{ width: 30, height: 30 }}
              />
            ),
          }}
        />
      )}

      {contentShow && !selfChildrenTabShow && (
        <Tab.Screen
          name="content"
          component={Contents}
          options={{
            tabBarLabel: t('content'),
            tabBarButton: (props) => (
              <CopilotStep
                text="This is the Content tab. Tap here to explore Content!"
                order={4}
                name="cotentTab"
              >
                <WalkthroughableView style={{ flex: 1 }}>
                  <TouchableOpacity {...props} />
                </WalkthroughableView>
              </CopilotStep>
            ),
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? contentfilled : contentunfilled}
                style={{ width: 30, height: 30 }}
              />
            ),
          }}
        />
      )}
      {!contentShow && (
        <Tab.Screen
          name="explore"
          component={ExploreStack}
          options={{
            tabBarLabel: t('explore'),
            tabBarButton: (props) => (
              <CopilotStep
                text="This is the Content tab. Tap here to explore Content!"
                order={4}
                name="explore"
              >
                <WalkthroughableView style={{ flex: 1 }}>
                  <TouchableOpacity {...props} />
                </WalkthroughableView>
              </CopilotStep>
            ),
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? explore_FILL : explore_UNFILLED}
                style={{ width: 30, height: 30 }}
              />
            ),
          }}
        />
      )}
      {userType === 'youthnet' && hasActiveBatch && (
        <Tab.Screen
          name="L2CoursesStack"
          component={L2CoursesStack}
          options={{
            tabBarLabel: t('l2_courses'),
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? Coursesfilled : Coursesunfilled}
                style={{ width: 30, height: 30 }}
              />
            ),
          }}
        />
      )}
      {userType === 'youthnet' && hasActiveBatch && (
        <Tab.Screen
          name="AssessmentStack"
          component={AssessmentStack}
          options={{
            tabBarLabel: t('assessment'),
            tabBarIcon: ({ focused }) => (
              <SimpleIcon
                name="note"
                color={focused ? '#987100' : 'black'}
                size={30}
              />
            ),
          }}
        />
      )}
      {!contentShow && isVolunteer === 'yes' && (
        <Tab.Screen
          name="surveys"
          component={SurveyStack}
          options={{
            tabBarLabel: t('surveys'),
            tabBarButton: (props) => (
              <CopilotStep
                text="This is the Content tab. Tap here to explore Content!"
                order={4}
                name="explore"
              >
                <WalkthroughableView style={{ flex: 1 }}>
                  <TouchableOpacity {...props} />
                </WalkthroughableView>
              </CopilotStep>
            ),
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? survey_filled : survey_unfilled}
                style={{ width: 30, height: 30 }}
              />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: t('profile'),
          tabBarButton: (props) => (
            <CopilotStep
              text="This is the Profile tab. Tap here to explore Profile!"
              order={5}
              name="Profile"
            >
              <WalkthroughableView style={{ flex: 1 }}>
                <TouchableOpacity {...props} />
              </WalkthroughableView>
            </CopilotStep>
          ),
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? profile_filled : profile}
              style={{ width: 30, height: 30 }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Styles are now handled by TabScreenHelper utility

export default TabScreen;
