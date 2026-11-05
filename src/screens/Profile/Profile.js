import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import { useTranslation } from '../../context/LanguageContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Label from '../../components/Label/Label';
import TextField from '../../components/TextField/TextField';
import ActiveLoading from '../../screens/LoadingScreen/ActiveLoading';
import {
  capitalizeFirstLetter,
  capitalizeName,
  createNewObject,
  getDataFromStorage,
  getTentantId,
  logEventFunction,
  setDataInStorage,
} from '../../utils/JsHelper/Helper';
import globalStyles from '../../utils/Helper/Style';
import SecondaryHeader from '../../components/Layout/SecondaryHeader';
import CompletedCourse from '../../components/CourseCard/CompletedCourse';
import LinearGradient from 'react-native-linear-gradient';
import NoCertificateBox from './NoCertificateBox';
import GlobalText from '@components/GlobalText/GlobalText';
import DeviceInfo from 'react-native-device-info';
import Config from 'react-native-config';
import {
  courseListApi_New,
  getProfileDetails,
  getStudentForm,
  profileCourseListApi,
} from '../../utils/API/AuthService';
import { useInternet } from '../../context/NetworkContext';
import NetworkAlert from '../../components/NetworkError/NetworkAlert';
import { courseTrackingStatus } from '@src/utils/API/ApiCalls';
import { TENANT_DATA } from '../../utils/Constants/app-constants';

const Profile = () => {
  const { t, language } = useTranslation();
  const [userData, setUserData] = useState();
  const [userDetailss, setUserDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const { isConnected } = useInternet();
  const [networkstatus, setNetworkstatus] = useState(true);
  const [userType, setUserType] = useState();
  const [programName, setProgramName] = useState('');
  const [cohortId, setCohortId] = useState();
  const [courseList, setCourseList] = useState([]);

  const version = DeviceInfo.getVersion(); // e.g., "1.0.1"
  const buildNumber = DeviceInfo.getBuildNumber(); // e.g., "2"
  const convertObjectToArray = (data) => {
    let location = {};

    const transformedArray = Object.entries(data).reduce(
      (acc, [name, value]) => {
        if (['states', 'districts', 'blocks'].includes(name)) {
          location = `${value.label},`; // Store in location object
        } else if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          acc.push({ name, value: value.value, label: value.label });
        } else {
          acc.push({ name, value });
        }
        return acc;
      },
      []
    );

    // Push the location object into the array
    if (Object.keys(location).length) {
      transformedArray.push({ name: 'location', value: location });
    }

    return transformedArray;
  };

  const mergeCourseDetails = (content, data) => {
    return data.map((item) => {
      const matchedContent = content?.find(
        (c) => c.identifier === item.courseId
      );
      return {
        ...item,
        name: matchedContent?.name || '',
        posterImage: matchedContent?.posterImage || '',
        description: matchedContent?.description || '',
        certificateTemplate: matchedContent?.certificateTemplate,
      };
    });
  };

  const fetchCourseStatus = async () => {
    const data = await profileCourseListApi();
    let userTypes = await getDataFromStorage('userType');
    // const instant =
    //   userTypes === 'youthnet'
    //     ? { frameworkId: 'pos-framework', channelId: 'pos-channel' }
    //     : userTypes === 'scp'
    //     ? { frameworkId: 'scp-framework', channelId: 'scp-channel' }
    //     : { frameworkId: 'pos-framework', channelId: 'pos-channel' };

    const inprogress_do_ids = data?.data?.map((item) => item?.courseId);

    const content = await courseListApi_New({
      inprogress_do_ids,
    });
    const newData = mergeCourseDetails(content?.content, data?.data);

    setCourseList(newData);
  };

  function formatDob(userDetails) {
    return userDetails.map((item) => {
      if (item.name === 'dob' && typeof item.value === 'string') {
        const [year, month, day] = item.value.split('-');
        return {
          ...item,
          value: `${day}/${month}/${year}`,
        };
      }
      return item;
    });
  }

  const fetchData = async () => {
    const data = await getStudentForm();
    let userType = await getDataFromStorage('userType');
    setUserType(userType);
    const storedTenantData = JSON.parse(
      (await getDataFromStorage('tenantData')) || '[]'
    );
    setProgramName(storedTenantData?.[0]?.tenantName || '');
    setDataInStorage('studentForm', JSON.stringify(data?.fields));
    const tenantId = await getDataFromStorage('userTenantid');

    const studentForm = data?.fields;
    const programFormData = await getStudentForm(tenantId);

    const studentProgramForm = programFormData?.fields;
    setDataInStorage('studentProgramForm', JSON.stringify(studentProgramForm));
    const mergedForm = [...studentForm, ...studentProgramForm];
    const user_id = await getDataFromStorage('userId');
    const profileData = await getProfileDetails({
      userId: user_id,
    });
    const result = profileData;
    await setDataInStorage('profileData', JSON.stringify(profileData));

    const finalResult = result?.getUserDetails?.[0];
    const keysToRemove = [
      'customFields',
      'total_count',
      'status',
      'updatedAt',
      'createdAt',
      'updatedBy',
      'createdBy',
      'role',
      'userId',
      'username',
      'firstName',
      'middleName',
      'lastName',
      'tenantId',
      'tenantJoinedAt',
      'center',
    ];

    const filteredResult = Object.keys(finalResult)
      .filter((key) => !keysToRemove.includes(key))
      .reduce((obj, key) => {
        obj[key] = finalResult[key];
        return obj;
      }, {});
    const requiredLabels = mergedForm?.map((item) => {
      return { label: item?.label, name: item?.name };
    });
    const customFields = finalResult?.customFields;
    const userDetails = createNewObject(
      customFields,
      requiredLabels,
      (profileView = true)
    );

    // Extract state, district, and block
    const locationData = {
      states: userDetails.state?.label || '',
      districts: userDetails.district?.label || '',
      blocks: userDetails.block?.label || '',
      village: userDetails.village?.label || '',
    };

    // Convert location data into a single formatted string
    const formattedLocation =
      `${locationData.states}, ${locationData.districts}, ${locationData.blocks}, ${locationData.village}`.trim();

    // Remove states, districts, and blocks from userDetails
    delete userDetails.state;
    delete userDetails.district;
    delete userDetails.block;
    delete userDetails.village;
    delete userDetails.center;

    // Add formatted location as a new field
    userDetails.location = formattedLocation;

    const UpdatedObj = { ...userDetails, ...filteredResult };
    const newUpdatedObj = convertObjectToArray(UpdatedObj);
    setUserData(result?.getUserDetails?.[0]);
    const filteredArray = newUpdatedObj.filter(
      (item) => item.name !== 'is_volunteer'
    );
    // console.log('userDetails==>', JSON.stringify(filteredArray));
    const newArray = formatDob(filteredArray);
    // console.log('newArray==>', JSON.stringify(newArray));
    setUserDetails(newArray);

    // const tenantData = await getTentantId();

    setLoading(false);
    setNetworkstatus(true);
  };

  useFocusEffect(
    useCallback(() => {
      if (isConnected) {
        fetchData();
        fetchCourseStatus();
        setNetworkstatus(true);
      } else if (!isConnected && userDetailss.length === 0) {
        setNetworkstatus(false);
      } else {
        setNetworkstatus(true);
      }
    }, []) // Correct dependencies
  );

  useEffect(() => {
    const logEvent = async () => {
      const obj = {
        eventName: 'profile_page_view',
        method: 'on-view',
        screenName: 'Profile',
      };
      await logEventFunction(obj);
    };
    logEvent();
  }, []);

  const getDate = () => {
    const date = new Date(userData?.createdAt);
    const day = date?.toLocaleDateString(language, {
      day: 'numeric',
    });
    const month = date?.toLocaleDateString(language, {
      month: 'long',
    });
    const year = date?.toLocaleDateString(language, {
      year: 'numeric',
    });

    return ` ${month} ${day}, ${year}`; // Format as "26 October 2024"
  };

  // Refresh the component.
  const handleRefresh = async () => {
    setLoading(true); // Start Refresh Indicator

    try {
      fetchData(); // Reset course data
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setLoading(false); // Stop Refresh Indicator
    }
  };

  const normalizeName = (name) => (name || '').trim().toLowerCase();
  const normalizedProgramName = normalizeName(programName);

  let displayProgramLabel;
  if (normalizedProgramName === normalizeName(TENANT_DATA.SECOND_CHANCE_PROGRAM)) {
    displayProgramLabel = t('second_chance_program');
  } else if (normalizedProgramName === normalizeName(TENANT_DATA.PATHWAYS)) {
    displayProgramLabel = t('pathways');
  } else if (normalizedProgramName === normalizeName(TENANT_DATA.YOUTHNET)) {
    displayProgramLabel = t('vocational_training');
  } else if (programName) {
    displayProgramLabel = programName;
  } else if (userType == 'youthnet') {
    displayProgramLabel = t('vocational_training');
  } else if (userType == 'scp') {
    // Tenant name unavailable — SCP and Pathways both map to userType
    // 'scp', so we can't tell which one this is. Show nothing rather
    // than guessing and risking the wrong program name.
    displayProgramLabel = '';
  } else {
    displayProgramLabel = userType;
  }

  return (
    <SafeAreaWrapper style={styles.safeArea}>
      <SecondaryHeader logo />
      {loading ? (
        <ActiveLoading />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
          style={[globalStyles.container, { padding: 0 }]}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.view}>
            <GlobalText style={globalStyles.h3}>{t('my_profile')}</GlobalText>

            <TouchableOpacity
              onPress={() => {
                navigation.navigate('OtherSettings', {
                  age: userDetailss?.AGE,
                });
              }}
            >
              <Ionicons name="settings-outline" size={30} color={'#000'} />
            </TouchableOpacity>
          </View>
          <LinearGradient
            colors={['#FFFDF6', '#F8EFDA']} // Gradient colors
            start={{ x: 1, y: 0 }} // Gradient starting point
            end={{ x: 1, y: 1.5 }} // Gradient ending point
            style={styles.gradient}
          >
            <GlobalText style={[globalStyles.h5, { fontWeight: 700 }]}>
              {capitalizeName(
                `${userData?.firstName} ${
                  userData?.lastName ? userData?.lastName : ''
                }`
              )}
            </GlobalText>
            <View
              style={[
                globalStyles.flexrow,
                // { justifyContent: 'space-between' },
              ]}
            >
              <GlobalText style={globalStyles.text}>
                {userData?.username}
                {'   '}
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 20,
                    backgroundColor: '#CDC5BD',
                    marginHorizontal: 15,
                  }}
                />
                {'  '}
                {t('joined_on')} {getDate()}
              </GlobalText>
            </View>
            {userData?.enrollmentId ? (
              <GlobalText style={[globalStyles.text]}>
                {t('enrollment_id')} : {userData?.enrollmentId ?? 'N/A'}
              </GlobalText>
            ) : null}
          </LinearGradient>
          <View style={{ padding: 10 }}>
            <GlobalText style={[globalStyles.h6, { color: '#78590C' }]}>
              {displayProgramLabel}
            </GlobalText>
          </View>

          {(userType == 'youthnet' || userType == 'Camp to Club' || userType == 'scp') && (
            <>
              <View style={{ marginLeft: 10 }}>
                <GlobalText
                  numberOfLines={4}
                  ellipsizeMode="tail"
                  style={[globalStyles.h5, { color: '#78590C' }]}
                >
                  {t('completed_courses_certificates')}
                </GlobalText>
                {courseList.length === 0 && (
                  <NoCertificateBox userType={userType} />
                )}
              </View>
              {courseList?.map((item, i) => {
                return <CompletedCourse key={i} data={item} />;
              })}
            </>
          )}

          <View style={{ backgroundColor: '#FFF8F2', paddingVertical: 20 }}>
            <View style={styles.viewBox}>
              {userDetailss?.map((item, key) => {
                // Get the actual value
                const actualValue = item?.value?.[0]?.value || item?.value;

                // Hide fields with empty values
                if (!actualValue || actualValue === '') {
                  return null;
                }

                // For family member details, show label and value for the selected family member
                if (item?.name === 'family_member_details') {
                  const familyType = actualValue;
                  const familyMemberField = userDetailss?.find((field) => {
                    return (
                      (familyType === 'mother' &&
                        field.name === 'mother_name') ||
                      (familyType === 'father' &&
                        field.name === 'father_name') ||
                      (familyType === 'spouse' && field.name === 'spouse_name')
                    );
                  });

                  const familyMemberValue =
                    familyMemberField?.value?.[0]?.value ||
                    familyMemberField?.value;

                  // Get the translated label for the family member field
                  let familyMemberLabel = '';
                  if (familyType === 'mother') {
                    familyMemberLabel = t('mother_name');
                  } else if (familyType === 'father') {
                    familyMemberLabel = t('father_name');
                  } else if (familyType === 'spouse') {
                    familyMemberLabel = t('spouse_name');
                  }

                  return (
                    <View key={key} style={{ paddingVertical: 10 }}>
                      <Label text={`${t(item?.name)}`} />
                      <TextField
                        text={`${familyMemberLabel}${
                          familyMemberValue ? ` - ${familyMemberValue}` : ''
                        }`}
                      />
                    </View>
                  );
                }

                // Skip individual family member name fields as they're handled above
                if (
                  ['mother_name', 'father_name', 'spouse_name', 'tenantStatus'].includes(
                    item?.name
                  )
                ) {
                  return null;
                }

                return (
                  <View key={key} style={{ paddingVertical: 10 }}>
                    <Label text={`${t(item?.name)}`} />
                    <TextField text={actualValue} />
                  </View>
                );
              })}

              {/* <View>
                <Label text={`${t('email')}`} />
                <TextField text={`${userData?.email || '-'}   `} />
              </View>

              <View>
                <Label text={`${t('class')} (${t('last_passed_grade')})`} />
                <TextField text={userDetails?.CLASS_OR_LAST_PASSED_GRADE} />
              </View> 
              <View>
                <Label text={`${t('dob')} `} />

                <TextField text={userData?.dob} />
              </View>
              <View>
                <Label text={`${t('gender')} `} />
                <TextField
                  text={`${capitalizeFirstLetter(userData?.gender)}`}
                />
              </View>
              <View>
                <Label text={`${t('location')}`} />
                {userDetails?.STATE ? (
                  <TextField
                    text={`${userDetails?.STATE || '-'},  ${userDetails?.DISTRICT || ''}, ${userDetails?.BLOCK || ''}`}
                  />
                ) : (
                  <TextField text={'-'} />
                )}
              </View> */}
            </View>
          </View>

          <GlobalText
            style={[
              globalStyles.text,
              { textAlign: 'center', paddingVertical: 10 },
            ]}
          >
            Version {version} (Build {buildNumber})
            {Config.ENV != 'PROD' ? Config.ENV : ''}
          </GlobalText>
        </ScrollView>
      )}
      <NetworkAlert
        onTryAgain={fetchData}
        isConnected={networkstatus}
        closeModal={() => {
          setNetworkstatus(!networkstatus);
        }}
      />
    </SafeAreaWrapper>
  );
};

Profile.propTypes = {};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  view: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  viewBox: {
    borderWidth: 1,
    borderRadius: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    padding: 20,
    borderColor: '#D0C5B4',
  },
  img: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  gradient: {
    padding: 20,
    // marginBottom: 20,
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  alertBox: {
    padding: 20,
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: '#D0C5B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: '50%',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Profile;
