import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  BackHandler,
  // SafeAreaView,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import CustomTextField from '../../components/CustomTextField/CustomTextField';
import CustomRadioCard from '@components/CustomRadioCard/CustomRadioCard';
import RadioButton from '@components/CustomRadioCard/RadioButton';
import CustomCards from '@components/CustomCard/CustomCard';
import {
  getAccessToken,
  getCohort,
  getGeoLocation,
  getProfileDetails,
  getProgramDetails,
  getStudentForm,
  login,
  notificationSubscribe,
  registerUser,
  setAcademicYear,
  suggestUsername,
  telemetryTrackingData,
  verifyOtp,
} from '@src/utils/API/AuthService';
import HeaderComponent from '@components/CustomHeaderComponent/customheadercomponent';
import DropdownSelect from '@components/DropdownSelect/DropdownSelect';
import {
  calculateAge,
  getActiveCohortData,
  getActiveCohortIds,
  getDataFromStorage,
  getDeviceId,
  getuserDetails,
  getUserId,
  isProfileFieldRequired,
  logEventFunction,
  saveAccessToken,
  saveRefreshToken,
  setDataInStorage,
  storeUsername,
} from '@src/utils/JsHelper/Helper';
import PrimaryButton from '@components/PrimaryButton/PrimaryButton';
import { useTranslation } from '@context/LanguageContext';
import CustomPasswordTextField from '@components/CustomPasswordComponent/CustomPasswordComponent';
import backIcon from '../../assets/images/png/arrow-back-outline.png';
import Exclamation from '../../assets/images/png/Exclamation.png';
import GlobalText from '@components/GlobalText/GlobalText';
import globalStyles from '@src/utils/Helper/Style';
import FullPagePdfModal from './FullPagePdfModal';
import CustomCheckbox from '@components/CustomCheckbox/CustomCheckbox';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { OtpInput } from 'react-native-otp-entry';
import EnableLocationModal from '../Location/EnableLocationModal';
import NetworkAlert from '@components/NetworkError/NetworkAlert';
import FastImage from '@changwoolab/react-native-fast-image';
import bulb from '../../assets/images/png/bulb.png';
import { useInternet } from '@context/NetworkContext';
import PropTypes from 'prop-types';
import ActiveLoading from '../LoadingScreen/ActiveLoading';
import { transformPayload } from './TransformPayload';
import DateTimePicker from '../../components/DateTimePicker/DateTimePicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { sendOtp, userExist } from '../../utils/API/AuthService';
import SuggestUsername from './SuggestUsername';
import { TENANT_DATA } from '../../utils/Constants/app-constants';
import moment from 'moment';
import SwitchAccountDialog from '../../utils/SwitchAccount/SwitchAccount';

const RegistrationForm = ({ fields }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const [formData, setFormData] = useState({});
  const [schema, setSchema] = useState(fields);
  const [orginalSchema] = useState(fields);
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isUserModalVisible, setUserModalVisible] = useState(false);
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [programData, setProgramData] = useState([]);
  // const [programData, setProgramData] = useState([]);

  const [stateData, setStateData] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [blockData, setBlockData] = useState([]);
  const [villageData, setVillageData] = useState([]);
  const [checked, setChecked] = useState(false);
  const [secondChecked, setSecondChecked] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentGeoData, setCurrentGeoData] = useState(false);
  const [enable, setEnable] = useState(false);
  const [updateEnable, setUpdateEnable] = useState(false);
  const [count, setCount] = useState();
  const [intervalId, setIntervalId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState();
  const [networkError, setNetworkError] = useState(false);
  const [modal, setModal] = useState(false);
  const [pages, setPages] = useState([]);
  const [existingUsers, setExistingUsers] = useState([]);
  const [suggestedUsernames, setSuggestedUsernames] = useState([]);
  const [OTP, setOTP] = useState();
  const [OTPError, setOTPError] = useState();
  const [hashCode, setHashCode] = useState('');
  const { isConnected } = useInternet();

  const RegisterLogin = async (loginData) => {
    setLoading(true);
    const payload = {
      username: loginData?.username,
      password: loginData?.password,
    };

    const data = await login(payload);
    await saveRefreshToken(data?.refresh_token || '');
    await saveAccessToken(data?.access_token || '');

    const userDetails = await getuserDetails();

    console.log('#### loginmultirole userDetails', userDetails);

    setUserDetails(userDetails);

    setSwitchDialogOpen(true);
    setLoading(false);
  };

  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');

  const callBackSwitchDialog = async (
    tenantId,
    tenantName,
    roleId,
    roleName
  ) => {
    setLoading(true);
    setSwitchDialogOpen(false);

    // Set the state values
    setTenantId(tenantId);
    setTenantName(tenantName);
    setRoleId(roleId);
    setRoleName(roleName);

    const tenantid = tenantId;

    console.log('#### loginmultirole tenantId', tenantId);
    console.log('#### loginmultirole tenantName', tenantName);
    console.log('#### loginmultirole roleId', roleId);
    console.log('#### loginmultirole roleName', roleName);

    console.log('#### loginmultirole userDetails', userDetails);

    const user_id = await getUserId();
    const tenantData = [
      userDetails?.tenantData?.find((tenant) => tenant.tenantId === tenantId),
    ];
    const enrollmentId = userDetails?.enrollmentId;
    await setDataInStorage('tenantData', JSON.stringify(tenantData || {}));
    await setDataInStorage('userId', user_id || '');
    await setDataInStorage('enrollmentId', enrollmentId || '');

    //store dynamic templateId
    const templateId = tenantData?.[0]?.templateId;
    await setDataInStorage('templateId', templateId || '');

    const academicyear = await setAcademicYear({ tenantid });
    const academicYearId = academicyear?.[0]?.id;
    await setDataInStorage('academicYearId', academicYearId || '');
    await setDataInStorage('userTenantid', tenantid || '');
    const cohort = await getCohort({ user_id, tenantid, academicYearId });
    // Drop the previous program's batch first: if this program has no active
    // cohort below, cohortData must stay empty rather than leak across programs.
    await setDataInStorage('cohortData', '');
    let cohort_id;
    if (cohort.params?.status !== 'failed') {
      const getActiveCohort = await getActiveCohortData(cohort);
      const getActiveCohortId = await getActiveCohortIds(cohort);
      await setDataInStorage(
        'cohortData',
        JSON.stringify(getActiveCohort?.[0]) || ''
      );
      cohort_id = getActiveCohortId?.[0];
    }

    const profileData = await getProfileDetails({
      userId: user_id,
    });

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

    // Get tenant details and store contentFilter
    const tenantDetails = programData || [];
    const MatchedTenant = tenantDetails.filter(
      (item) => item?.tenantId === tenantid
    );

    await setDataInStorage(
      'contentFilter',
      JSON.stringify(MatchedTenant?.[0]?.contentFilter || {})
    );

    const youthnetTenantIds = programData
      ?.filter((item) => item?.name === TENANT_DATA.YOUTHNET)
      ?.map((item) => item?.tenantId);

    const scp = programData
      ?.filter((item) =>
        [
          TENANT_DATA.SECOND_CHANCE_PROGRAM,
          TENANT_DATA.PATHWAYS,
        ].includes(item.name)
      )
      ?.map((item) => item.tenantId);

    const role = roleName;
    console.log('#### loginmultirole role', role);
    console.log('#### loginmultirole tenantid', tenantid);

    if (role == 'Learner' || role == 'Student') {
      if (scp?.includes(tenantid)) {
        await setDataInStorage('userType', 'scp');
        if (cohort_id) {
          navigation.navigate('SCPUserTabScreen');
        } else {
          navigation.navigate('Dashboard');
        }
      } else {
        if (tenantid === youthnetTenantIds?.[0]) {
          await setDataInStorage('userType', 'youthnet');
          // navigation.navigate('YouthNetTabScreen');
          navigation.navigate('Dashboard');
        } else {
          await setDataInStorage('userType', tenantData?.[0]?.tenantName);
          navigation.navigate('Dashboard');
        }
      }
      const deviceId = await getDeviceId();
      const action = 'add';

      await notificationSubscribe({ deviceId, user_id, action });
    } else {
      // Handle invalid role case similar to LoginScreen
      // For now, we'll just navigate but you might want to handle this differently
    }

    const now = moment();
    const telemetryPayloadData = {
      event: 'registration',
      type: 'click',
      ets: now.unix(),
    };
    await telemetryTrackingData({
      telemetryPayloadData,
    });

    const obj = {
      eventName: 'logged_in',
      method: 'button-click',
      screenName: 'Registration',
    };
    await logEventFunction(obj);

    setModal(false);
    setLoading(false);
  };

  const callBackError = () => {
    setErr('invalid_username_or_password');
  };

  const logRegistrationComplete = async () => {
    // Log the registration completed event
    const obj = {
      eventName: 'registration_completed',
      method: 'button-click',
      screenName: 'Registration',
    };
    await logEventFunction(obj);

    // Handle your registration logic here
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const isVoluteerPayload = { ...data, is_volunteer: 'no' };
    const payload = await transformPayload(isVoluteerPayload);
    await getAccessToken();
    const register = await registerUser(payload);

    if (!isConnected) {
      setNetworkError(true);
      setLoading(false);
    } else if (register?.params?.status === 'failed') {
      setLoading(false);
      setModal(true);
      setErr(register?.params?.err);
    } else {
      logRegistrationComplete();
      await RegisterLogin(data);
      setLoading(false);
    }
  };

  const openInAppBrowser = async () => {
    try {
      const url = 'https://pratham.org/privacy-guidelines/';
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(url, {
          // Optional customization
          toolbarColor: '#6200EE',
          showTitle: true,
          enableUrlBarHiding: true,
          enableDefaultShare: true,
        });
      } else {
        console.log('In-App Browser not available');
      }
    } catch (error) {
      console.error('Error opening browser:', error);
    }
  };

  const fetchDistricts = async (state) => {
    setLoading(true);

    //reset data
    setBlockData([]);
    setVillageData([]);

    const payload = {
      // limit: 10,
      offset: 0,
      fieldName: 'district',
      controllingfieldfk: [state || formData['state']?.value],
    };

    const data = await getGeoLocation({ payload });
    setDistrictData(data?.values);
    setLoading(false);
    return data?.values;
  };
  const fetchvillages = async (block) => {
    setLoading(true);

    const payload = {
      // limit: 10,
      offset: 0,
      fieldName: 'village',
      controllingfieldfk: [block || formData['block']?.value],
    };

    const data = await getGeoLocation({ payload });

    setVillageData(data?.values);
    setLoading(false);
    return data?.values;
  };
  const fetchBlocks = async (district) => {
    setLoading(true);

    //reset data
    setVillageData([]);

    const payload = {
      // limit: 10,
      offset: 0,
      fieldName: 'block',
      controllingfieldfk: [district || formData['district']?.value],
    };

    const data = await getGeoLocation({ payload });
    setBlockData(data?.values);
    setLoading(false);
    return data?.values;
  };

  const fetchStates = async () => {
    setLoading(true);

    //reset data
    setDistrictData([]);
    setBlockData([]);
    setVillageData([]);

    const stateAPIdata = JSON.parse(await getDataFromStorage('states'));

    const geoData = JSON.parse(await getDataFromStorage('geoData'));
    setCurrentGeoData(geoData);
    setStateData(stateAPIdata);
    const foundState = stateAPIdata?.find(
      (item) => item?.label.toLowerCase() === geoData?.state.toLowerCase()
    );
    const districtAll = await fetchDistricts(foundState?.value);

    const foundDistrict = districtAll?.find(
      (item) => item?.label.toLowerCase() === geoData?.district.toLowerCase()
    );

    const updatedFormData = {
      ...formData,
      ['state']: { value: foundState?.value, label: foundState?.label },
      ['district']: {
        value: foundDistrict?.value,
        label: foundDistrict?.label,
      },
    };
    console.log('geoData', geoData);
    console.log('stateAPIdata', stateAPIdata);
    console.log('updatedFormData', updatedFormData);
    console.log('foundState', foundState);
    console.log('foundDistrict', foundDistrict);

    setFormData(updatedFormData);
    if (formData['state']?.label !== undefined) {
      setEnable(false);
      setUpdateEnable(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    if (formData?.state) {
      fetchDistricts();
    }
    if (formData?.district) {
      fetchBlocks();
    }
    if (formData?.block) {
      fetchvillages();
    }
    setLoading(false);
  }, [formData['state'], formData['district'], formData['block']]);

  useEffect(() => {
    const defaultPages = groupFieldsByOrder(schema);
    setPages(defaultPages);
    const getProgramData = async () => {
      const data = await getProgramDetails();
      // const newData = data.filter((item) => item?.name === 'YouthNet');
      const filtered = data.filter((item) => {
        const uiConfig = item.params?.uiConfig;
        return uiConfig?.showProgram === true && uiConfig?.showSignup === true;
      });
      setProgramData(filtered);
    };
    getProgramData();
    fetchStates();
  }, []);

  useEffect(() => {
    fetchStates();
  }, [updateEnable]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (currentPage > 0) {
          handlePrevious();
          return true; // Prevent default behavior (exit app)
        } else {
          // Optional: Show a confirmation dialog
          navigation.goBack();
          return true; // Prevent default behavior (exit app)
        }
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => {
        backHandler.remove(); // Clean up event listener on unmount
      };
    }, [currentPage]) // Dependencies to trigger the effect
  );

  const groupFieldsByOrder = (schema) => {
    const grouped = schema.reduce((acc, item) => {
      const order = parseInt(item.order);
      if (!acc[order]) {
        acc[order] = [];
      }
      acc[order].push(item.name);
      return acc;
    }, {});

    // Convert the grouped object into an ordered array of arrays
    const orderedPages = Object.keys(grouped)
      .sort((a, b) => a - b)
      .map((order) => grouped[order]);

    // Add the default 7th step if not already present
    if (!grouped[7]) {
      orderedPages.push(['what_do_you_want_to_become']);
    }

    return orderedPages;
  };

  // let pages = groupFieldsByOrder(schema);

  function updateOrder(fields, newOrder = 7) {
    return fields.map((field) => ({ ...field, order: newOrder }));
  }

  useEffect(() => {
    const fetchData = async () => {
      if (formData?.program) {
        setLoading(true);
        const defaultPages = groupFieldsByOrder(schema);
        setPages(defaultPages);

        const tenantId = formData?.program?.value;
        const data = await getStudentForm(tenantId);

        const field = data?.fields || [];
        const fields = updateOrder(field) || [];
        setDataInStorage('studentProgramForm', JSON.stringify(fields));
        // Remove existing fields with the same order (7) before merging
        const filteredSchema = orginalSchema?.filter(
          (item) => !fields.some((f) => f.order === item.order)
        );

        // Merge new fields into the filtered schema
        const newSchema = [...filteredSchema, ...fields];
        const result = newSchema.filter(
          (item) => item.label !== 'CENTER' && item.label !== 'BATCH'
        );

        console.log('newSchema', newSchema);
        setSchema(result);

        // Group fields into pages and update state
        const mypages = groupFieldsByOrder(newSchema);
        setPages(mypages);
        setLoading(false);
      }
    };

    fetchData();
  }, [formData['program']]);

  // const pages = [
  //   ['first_name', 'middle_name', 'last_name', 'email', 'mobile'],
  //   ['DOB', 'gender', 'mothers_name'],
  //   [
  //     'highest_education_level',
  //     'type_of_phone_available',
  //     'does_this_phone_belong_to_you',
  //   ],
  //   ['program'],
  //   ['states', 'districts', 'blocks', 'villages'],
  //   [
  //     'username',
  //     'password',
  //     'confirm_password',
  //     'parent_name',
  //     'parent_phone',
  //     'parent_phone_belong',
  //   ],
  // ];

  const handleInputChange = (name, value) => {
    const updatedFormData = { ...formData, [name]: value };

    // Reset dependent fields
    if (name === 'state') {
      updatedFormData['district'] = '';
      updatedFormData['block'] = '';
      updatedFormData['village'] = '';
    } else if (name === 'district') {
      updatedFormData['block'] = '';
      updatedFormData['village'] = '';
    } else if (name === 'block') {
      updatedFormData['village'] = '';
    }

    setFormData(updatedFormData);
    setErrors({ ...errors, [name]: '' }); // Clear errors for the field
  };

  const validateFields = () => {
    const pageFields = pages[currentPage];
    const newErrors = {};
    const age = calculateAge(formData?.dob || '');

    pageFields.forEach((fieldName) => {
      const field = schema?.find((f) => f.name === fieldName);

      if (field) {
        const value = formData[field.name] || '';

        if (['confirm_password'].includes(field.name)) {
          if (formData.password !== formData.confirm_password) {
            newErrors[field.label] = `${t('Password_must_match')}`;
          }
        }

        if (
          ['guardian_name', 'guardian_relation', 'parent_phone'].includes(
            field.name
          ) &&
          age &&
          parseInt(age, 10) >= 18
        ) {
          return; // Skip validation for these fields
        }
        if (['is_volunteer'].includes(field.name)) {
          return; // Skip validation for these fields
        }
        if (
          (isProfileFieldRequired(field) === true && !value) ||
          // (field.name === 'blocks' && !value) ||
          // (field.name === 'states' && !value) ||
          // (field.name === 'districts' && !value) ||
          (field.name === 'guardian_name' && !value) ||
          (field.name === 'guardian_relation' && !value)
        ) {
          newErrors[field.name] = `${t(field.label.toLowerCase())} ${t(
            'is_required'
          )}`;
        } else if (
          Number(field.minLength) > 0 &&
          value.length < Number(field.minLength) &&
          value
        ) {
          newErrors[field.name] = `${t('min_validation')
            .replace('{field}', t(field.label.toLowerCase()))
            .replace('{length}', Number(field.minLength))}`;
        } else if (
          Number(field.maxLength) > 0 &&
          value.length > Number(field.maxLength) &&
          value
        ) {
          newErrors[field.name] = `${t('max_validation')
            .replace('{field}', t(field.label.toLowerCase()))
            .replace('{length}', Number(field.maxLength))}`;
        } else if (
          field.pattern &&
          value &&
          !new RegExp(field.pattern.replace(/^\/|\/$/g, '')).test(value)
        ) {
          newErrors[field.name] = `${t(field.label)} ${t('is_invalid')}.`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const renderField = (field) => {
    const age = calculateAge(formData?.dob || '');
    if (
      (field.name === 'guardian_relation' ||
        field.name === 'guardian_name' ||
        field.name === 'parent_phone') &&
      age &&
      parseInt(age, 10) >= 18
    ) {
      return null;
    }
    const familyType = formData?.family_member_details;
    if (
      !familyType &&
      ['father_name', 'mother_name', 'spouse_name'].includes(field.name)
    ) {
      return null;
    }
    if (
      familyType === 'spouse' &&
      (field.name === 'father_name' || field.name === 'mother_name')
    ) {
      return null;
    }
    if (
      familyType === 'father' &&
      (field.name === 'spouse_name' || field.name === 'mother_name')
    ) {
      return null;
    }
    if (
      familyType === 'mother' &&
      (field.name === 'father_name' || field.name === 'spouse_name')
    ) {
      return null;
    }

    if (['is_volunteer'].includes(field.name)) {
      return null; // Skip validation for these fields
    }

    const UsernameText = () => {
      return (
        <>
          <GlobalText
            style={[globalStyles.text, { marginLeft: 10, color: '#0D599E' }]}
          >
            {t(
              'make_it_unique_try_adding_your_birth_date_or_your_lucky_number'
            )}
          </GlobalText>
          <View
            style={{
              backgroundColor: '#D2F1CF',
              padding: 10,
              borderRadius: 10,
              flexDirection: 'row',
            }}
          >
            <Image
              source={bulb}
              resizeMode="contain"
              style={{ width: 30, height: 30 }}
            />
            <GlobalText
              style={[
                globalStyles.text,
                { width: 300, marginLeft: 10, color: '#0D599E' },
              ]}
              numberOfLines={4}
              ellipsizeMode="tail"
            >
              {t(
                'tip_you_can_copy_and_save_your_username_on_your_device_so_you_dont_forget_it'
              )}
            </GlobalText>
          </View>
        </>
      );
    };

    switch (field.type) {
      case 'text':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <CustomTextField
              field={field}
              formData={formData}
              handleValue={handleInputChange}
              errors={errors}
              {...(field.name === 'username' && { text: UsernameText() })}
            />
          </View>
        );
      case 'email':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <CustomTextField
              field={field}
              formData={formData}
              handleValue={handleInputChange}
              errors={errors}
              autoCapitalize={'none'}
            />
          </View>
        );
      case 'numeric':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <CustomTextField
              field={field}
              formData={formData}
              handleValue={handleInputChange}
              errors={errors}
              keyboardType="numeric"
            />
          </View>
        );
      case 'cradio':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <CustomRadioCard
              field={field}
              options={programData}
              errors={errors}
              formData={formData}
              handleValue={handleInputChange}
            />
            <></>
          </View>
        );
      case 'radio':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <RadioButton
              field={field}
              options={programData}
              errors={errors}
              formData={formData}
              handleValue={handleInputChange}
            />
          </View>
        );
      case 'select':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <CustomCards
              field={field}
              errors={errors}
              formData={formData}
              handleValue={handleInputChange}
            />
          </View>
        );
      case 'drop_down':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <DropdownSelect
              field={field}
              options={
                field.name === 'state'
                  ? stateData
                  : field.name === 'district'
                  ? districtData
                  : field.name === 'block'
                  ? blockData
                  : field.name === 'village'
                  ? villageData
                  : field?.options
              }
              errors={errors}
              formData={formData}
              handleValue={handleInputChange}
            />
          </View>
        );
      case 'password':
      case 'confirm_password':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <CustomPasswordTextField
              field={field}
              errors={errors}
              formData={formData}
              handleValue={handleInputChange}
            />
          </View>
        );
      case 'date':
        return (
          <View key={field.name} style={styles.inputContainer}>
            <DateTimePicker
              field={field}
              errors={errors}
              formData={formData}
              handleValue={handleInputChange}
            />
          </View>
        );
      default:
        return null;
    }
  };

  const renderPage = () => {
    const pageFields = pages[currentPage];

    return schema
      .filter((field) => pageFields?.includes(field.name))
      .map((field) => renderField(field));
  };

  const checkUserExist = async () => {
    const payload = {
      firstName: formData?.firstName,
      lastName: formData?.lastName,
      mobile: formData?.mobile,
      ...(formData?.email && { email: formData.email }),
      ...(formData?.username && { username: formData.username }),
    };
    const data = await userExist(payload);
    return data;
  };

  const UserSuggestion = async () => {
    const payload = {
      firstName: formData?.firstName,
      lastName: formData?.lastName,
      username: formData?.username,
    };
    const data = await suggestUsername(payload);
    return data;
  };

  const sendOTPFunction = async () => {
    const payload = {
      mobile: formData?.mobile,
      reason: 'signup',
    };
    const data = await sendOtp(payload);
    setHashCode(data?.result?.data?.hash);
    setOTPError(data?.params?.err);
  };
  const verifyOTPFunction = async () => {
    const payload = {
      mobile: formData?.mobile,
      otp: OTP?.value,
      reason: 'signup',
      hash: hashCode,
    };
    const data = await verifyOtp(payload);
    return data?.params?.status;
  };

  const handleNext = async () => {
    if (validateFields()) {
      if (currentPage === 0) {
        const userExists = await checkUserExist();
        if (userExists?.params?.status === 'successful') {
          setUserModalVisible(true);
          setExistingUsers(userExists?.result);
        } else {
          await sendOTPFunction();
          setOtpModalVisible(true);
        }
      } else if (currentPage === 4) {
        const usernameSuggestion = await UserSuggestion();
        if (usernameSuggestion?.params?.status === 'successful') {
          setSuggestedUsernames(usernameSuggestion?.result?.suggestedUsername);
          setModal(true);
        } else {
          setCurrentPage(currentPage + 1);
        }
      } else {
        setCurrentPage(currentPage + 1);
      }
    }
    if (currentPage === 2 && !currentGeoData) {
      setEnable(true);
    }
    if (currentPage === 2) {
      const fullName = `${formData.firstName}${formData.lastName}`;

      const updatedFormData = {
        ...formData,
        ['username']: fullName.toLowerCase(),
      };
      setFormData(updatedFormData);
    }
  };
  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSubmit = () => {
    if (validateFields()) {
      onSubmit(formData);
    }
  };

  const handleOtpVerification = async () => {
    const isValidOtp = await verifyOTPFunction();
    if (isValidOtp !== 'failed') {
      setOtpModalVisible(false);
      setUserModalVisible(false);
      setCurrentPage(currentPage + 1);
    } else {
      alert('Invalid OTP. Please try again.');
    }
  };

  useEffect(() => {
    if (isOtpModalVisible) {
      startOtpTimer();
    } else {
      stopOtpTimer();
    }

    return () => stopOtpTimer(); // Clean up interval when component unmounts
  }, [isOtpModalVisible]);

  const startOtpTimer = () => {
    setCount(120); // Reset counter
    const id = setInterval(() => {
      setCount((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(id);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    setIntervalId(id);
  };

  const stopOtpTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const handleResendOTP = async () => {
    await sendOTPFunction();
    stopOtpTimer(); // Clear any existing timer
    startOtpTimer(); // Start a new timer
  };

  useEffect(() => {
    // Scroll to top when page changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [currentPage]);

  if (loading) {
    return <ActiveLoading />;
  }

  return (
    <SafeAreaWrapper style={{ padding: 10 }}>
      {currentPage > 0 && (
        <TouchableOpacity style={styles.backbutton} onPress={handlePrevious}>
          <Image
            source={backIcon}
            resizeMode="contain"
            style={{ width: 30, height: 30 }}
          />
        </TouchableOpacity>
      )}
      <HeaderComponent
        currentPage={currentPage + 1}
        questionIndex={currentPage + 1}
        totalForms={pages?.length}
      />
      {currentPage === 3 && (
        <>
          <GlobalText style={[globalStyles.text, { marginLeft: 20 }]}>
            {t('location_des')}
          </GlobalText>
          <View
            style={{
              padding: 15,
              borderRadius: 20,
              backgroundColor: '#EDE1CF',
              marginTop: 10,
            }}
          >
            <GlobalText style={[globalStyles.text]}>
              {t('location_des2')}
            </GlobalText>
          </View>
        </>
      )}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {renderPage()}

        {currentPage === 0 && (
          <GlobalText style={[globalStyles.text, { top: -20, left: 10 }]}>
            {t('an_otp_will_be_sent_for_verification')}
          </GlobalText>
        )}
        {currentPage === 3 && (
          <GlobalText
            style={[globalStyles.text, { marginBottom: 10, marginLeft: 10 }]}
          >
            {t(
              'if_your_village_is_not_mentioned_in_the_list_please_select_your_nearest_village'
            )}
          </GlobalText>
        )}
        {currentPage === 6 && (
          <>
            <View
              style={[
                globalStyles.flexrow,
                { marginVertical: 15, width: '85%' },
              ]}
            >
              <CustomCheckbox
                value={checked}
                onChange={(nextChecked) => {
                  setChecked(nextChecked);
                }}
              />

              <GlobalText
                numberOfLines={5}
                ellipsizeMode="tail"
                style={[globalStyles.text, { textAlign: 'justify' }]}
              >
                {t('Read_T_&_C')}{' '}
                <GlobalText
                  onPress={openInAppBrowser}
                  style={[
                    globalStyles.text,
                    {
                      color: '#0000cd',
                      textDecorationLine: 'underline', // This adds the underline
                    },
                  ]}
                >
                  {t('privacy_guidelines')}{' '}
                </GlobalText>
                {t(
                  'and_i_consent_to_the_collection_and_use_of_my_personal_data_as_described_in_the'
                )}{' '}
                <GlobalText
                  onPress={() => {
                    setModalVisible(true);
                  }}
                  style={[
                    globalStyles.text,
                    {
                      color: '#0000cd',
                      textDecorationLine: 'underline', // This adds the underline
                    },
                  ]}
                >
                  {t('consent_form')}
                </GlobalText>
              </GlobalText>
            </View>
            {formData['age'] < 18 && (
              <View
                style={[
                  globalStyles.flexrow,
                  { marginVertical: 15, width: '85%' },
                ]}
              >
                <CustomCheckbox
                  value={secondChecked}
                  onChange={(nextChecked) => {
                    setSecondChecked(nextChecked);
                  }}
                />

                <GlobalText style={globalStyles.text}>
                  {t('create_account_desp2')}
                </GlobalText>
              </View>
            )}
            <FullPagePdfModal
              // pdfPath={pdfPath}
              isModalVisible={isModalVisible}
              setModalVisible={setModalVisible}
              age={formData['age']}
            />
          </>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        {currentPage < pages.length - 1 ? (
          <PrimaryButton
            text={t('continue')}
            isDisabled={currentPage === 0 && !formData?.mobile}
            onPress={handleNext}
          />
        ) : (
          <PrimaryButton
            isDisabled={
              formData.age < 18 ? !(checked && secondChecked) : !checked
            } // Button disabled until both are checked
            text={t('create_account')}
            onPress={handleSubmit}
          />
        )}
      </View>
      {enable && (
        <EnableLocationModal
          enable={enable}
          setEnable={setEnable}
          setUpdateEnable={setUpdateEnable}
        />
      )}

      <Modal
        visible={isUserModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer} activeOpacity={1}>
          <View style={styles.alertBox}>
            <View
              style={{
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <GlobalText style={globalStyles.heading2}>
                {t('account_already_exists')}
              </GlobalText>
              <TouchableOpacity
                onPress={() => {
                  setUserModalVisible(false);
                }}
              >
                <Icon name={'close'} color="#000" size={30} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{
                marginVertical: 20,
                borderBottomWidth: 1,
                borderTopWidth: 1,
                borderColor: '#D0C5B4',
                paddingHorizontal: 5,
                height: 330,
              }}
            >
              <View style={{ padding: 10, alignItems: 'center' }}>
                <Image
                  source={Exclamation}
                  resizeMode="contain"
                  style={{ width: 50, height: 50 }}
                />
              </View>
              <View>
                <GlobalText
                  style={[globalStyles.subHeading, { textAlign: 'center' }]}
                >
                  {t(
                    'one_or_more_accounts_with_this_name_email_and_phone_number_already_exist'
                  )}
                </GlobalText>
              </View>

              {existingUsers?.map((item, key) => {
                return (
                  <View
                    key={key}
                    style={{
                      alignItems: 'center',
                      marginVertical: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('LoginScreen');
                        setUserModalVisible(false);
                      }}
                      style={{ width: 300 }}
                    >
                      <GlobalText
                        style={[
                          globalStyles.subHeading,
                          { textAlign: 'center' },
                        ]}
                      >
                        {item?.firstName} {item?.lastName}
                      </GlobalText>
                      <View
                        style={{
                          backgroundColor: '#D0C5B4',
                          padding: 10,
                          borderRadius: 10,
                        }}
                      >
                        <GlobalText
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={[globalStyles.subHeading]}
                        >
                          {item?.username}
                        </GlobalText>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <GlobalText
                            style={[
                              globalStyles.subHeading,
                              { color: '#0D599E' },
                            ]}
                          >
                            {t('login_with_this_username')}
                          </GlobalText>
                          <Icon
                            name="arrow-forward"
                            size={20}
                            color={'#0D599E'}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={{ paddingVertical: 10 }}>
                <GlobalText
                  style={[
                    globalStyles.heading2,
                    { textAlign: 'center', fontWeight: 'bold' },
                  ]}
                >
                  {t('are_you_sure_you_want_to_create_another_account')}
                </GlobalText>
              </View>
            </ScrollView>
            <View style={styles.btnbox}>
              <PrimaryButton
                text={t('yes_create_another_account')}
                onPress={async () => {
                  setUserModalVisible(false);
                  setOtpModalVisible(true);
                  await sendOTPFunction();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isOtpModalVisible}
        transparent={true}
        animationType="slide"
        onclo
      >
        <View style={styles.modalContainer} activeOpacity={1}>
          <View style={styles.alertBox}>
            <View
              style={{
                padding: 15,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <GlobalText style={[globalStyles.heading2, { fontWeight: 650 }]}>
                {t('verify_phone_number')}
              </GlobalText>
              <TouchableOpacity
                onPress={() => {
                  setOtpModalVisible(false);
                  setUserModalVisible(false);
                }}
              >
                <Icon name={'close'} color="#000" size={30} />
              </TouchableOpacity>
            </View>
            {OTPError ? (
              <GlobalText style={[globalStyles.heading2, { fontWeight: 650 }]}>
                {t('unable_to_send_otp')}
              </GlobalText>
            ) : (
              <View
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderBottomWidth: 1,
                  borderTopWidth: 1,
                  borderColor: '#D0C5B4',
                }}
              >
                <View>
                  <GlobalText style={[globalStyles.subHeading]}>
                    {t('we_sent_an_otp_to_verify_your_number')} :{' '}
                    {formData?.mobile}
                  </GlobalText>
                </View>

                <GlobalText style={[globalStyles.text, { marginVertical: 5 }]}>
                  {t('enter_otp')}
                </GlobalText>

                <View style={styles.otpInputContainer}>
                  <OtpInput
                    numberOfDigits={4}
                    focusColor="green"
                    autoFocus={false}
                    hideStick={true}
                    placeholder="******"
                    blurOnFilled={true}
                    disabled={false}
                    type="numeric"
                    secureTextEntry={false}
                    focusStickBlinkingDuration={500}
                    onTextChange={(text) => setOTP({ ...OTP, value: text })}
                    textInputProps={{
                      accessibilityLabel: 'One-Time Password',
                      textContentType: 'oneTimeCode', // Enables OTP autofill on iOS
                      keyboardType: 'number-pad', // Displays numeric keyboard
                      autoComplete: 'sms-otp',
                    }}
                    theme={{
                      containerStyle: styles.pinContainer,
                      pinCodeContainerStyle: styles.pinCodeContainer,
                      pinCodeTextStyle: styles.pinCodeText,
                      focusStickStyle: styles.focusStick,
                      focusedPinCodeContainerStyle:
                        styles.activePinCodeContainer,
                      placeholderTextStyle: styles.placeholderText,
                      filledPinCodeContainerStyle:
                        styles.filledPinCodeContainer,
                      disabledPinCodeContainerStyle:
                        styles.disabledPinCodeContainer,
                    }}
                  />
                </View>
                <TouchableOpacity
                  disabled={count > 0} // Disable the button if countdown is active
                  onPress={handleResendOTP}
                >
                  <GlobalText
                    style={[
                      globalStyles.text,
                      {
                        marginTop: 20,
                        marginBottom: 10,
                        textAlign: 'center',
                        color: count > 0 ? '#DADADA' : '#0D599E80',
                      },
                    ]}
                  >
                    {count !== 0
                      ? t('resend_otp_in').replace(`{count}`, count)
                      : t('resend_otp')}
                  </GlobalText>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.btnbox}>
              <PrimaryButton
                isDisabled={OTPError || !OTP?.value ? true : false}
                text={t('verify_otp')}
                onPress={handleOtpVerification}
              />
            </View>
          </View>
        </View>
      </Modal>
      <NetworkAlert onTryAgain={handleSubmit} isConnected={!networkError} />
      {modal && (
        <Modal transparent={true} animationType="slide">
          <TouchableOpacity style={styles.modalContainer} activeOpacity={1}>
            {suggestedUsernames && !err ? (
              <SuggestUsername
                setSuggestedUsernames={setSuggestedUsernames}
                suggestedUsernames={suggestedUsernames}
                setModal={setModal}
                setFormData={setFormData}
                formData={formData}
              />
            ) : err ? (
              <View style={styles.alertBox}>
                <GlobalText
                  style={[globalStyles.subHeading, { marginVertical: 10 }]}
                >
                  Error: {err}
                </GlobalText>

                <PrimaryButton
                  text={t('try_again')}
                  onPress={() => {
                    setModal(false);
                    setErr('');
                  }}
                />
              </View>
            ) : (
              <View style={styles.alertBox}>
                <FastImage
                  style={styles.image}
                  // eslint-disable-next-line no-undef
                  source={require('../../assets/images/gif/party.gif')}
                  resizeMode={FastImage.resizeMode.contain}
                  priority={FastImage.priority.high} // Set the priority here
                />
                <GlobalText
                  style={[
                    globalStyles.heading2,
                    { marginVertical: 10, textAlign: 'center' },
                  ]}
                >
                  {t('congratulations')}
                </GlobalText>
              </View>
            )}
          </TouchableOpacity>
        </Modal>
      )}
      <SwitchAccountDialog
        visible={switchDialogOpen}
        onClose={() => setSwitchDialogOpen(false)}
        callbackFunction={callBackSwitchDialog}
        authResponse={userDetails?.tenantData}
        callBackError={callBackError}
      />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginTop: 5,
    Bottom: 16,
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertBox: {
    width: 350,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    padding: 10,
  },
  image: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 10,
  },

  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    width: '100%', // Adjust the width as per your design
    alignSelf: 'center',
  },
  pinCodeText: {
    color: '#000',
  },
  pinCodeContainer: {
    // marginHorizontal: 5,
  },
  pinContainer: {
    width: '100%',
  },
  btnbox: {
    marginVertical: 10,
    alignItems: 'center',
  },
});

RegistrationForm.propTypes = {
  fields: PropTypes.any,
};

export default RegistrationForm;
