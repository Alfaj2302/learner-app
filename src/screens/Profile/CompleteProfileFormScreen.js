import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SecondaryHeader from '../../components/Layout/SecondaryHeader';
import GlobalText from '@components/GlobalText/GlobalText';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
import globalStyles from '../../utils/Helper/Style';
import { useTranslation } from '@context/LanguageContext';
import { useInternet } from '@context/NetworkContext';
import ActiveLoading from '../LoadingScreen/ActiveLoading';
import lightning from '../../assets/images/png/lightning.png';
import {
  buildUserDetailsObject,
  getDataFromStorage,
  getMergedProfileSchema,
  getOtherFieldParent,
  getProfileFormFields,
  logEventFunction,
  setDataInStorage,
} from '../../utils/JsHelper/Helper';
import {
  getGeoLocation,
  getProfileDetails,
  updateUser,
} from '../../utils/API/AuthService';
import { transformPayload } from './TransformPayload';
import {
  renderProfileField,
  reorderFamilyFieldsAfterSelector,
  validateProfileFields,
} from './ProfileFormShared';

const FAMILY_NAME_FIELDS = ['father_name', 'mother_name', 'spouse_name'];

const CompleteProfileFormScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { isConnected } = useInternet();

  const [loading, setLoading] = useState(true);
  const [filteredSchema, setFilteredSchema] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState();
  const [stateData, setStateData] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [blockData, setBlockData] = useState([]);
  const [villageData, setVillageData] = useState([]);

  useEffect(() => {
    const loadSchema = async () => {
      const tenantData = JSON.parse((await getDataFromStorage('tenantData')) || 'null');
      const tenantId = route.params?.tenantId || tenantData?.[0]?.tenantId;
      // Scope is common + program-specific, matching web. The form asks for a
      // slightly wider set than the banner counts (getProfileFormFields includes
      // middleName, which must never by itself keep the banner up).
      const schema = await getMergedProfileSchema(tenantId);

      const tenantName = tenantData?.find((t) => t?.tenantId === tenantId)?.name;
      const mandatoryFields = schema.filter((field) => field.isRequired).map((field) => field.name);
      const nonMandatoryFields = schema.filter((field) => !field.isRequired).map((field) => field.name);
      console.log(`[CompleteProfileForm] ${tenantName || tenantId} mandatory fields:`, mandatoryFields);
      console.log(`[CompleteProfileForm] ${tenantName || tenantId} non-mandatory fields:`, nonMandatoryFields);

      const profileData = JSON.parse((await getDataFromStorage('profileData')) || 'null');
      const userDetails = buildUserDetailsObject(profileData, schema);

      const fieldsToShow = new Set(getProfileFormFields(schema, userDetails));
      if (fieldsToShow.has('family_member_details')) {
        // The relation is still unknown, so keep all three name fields in the
        // schema - once the user picks one, isFieldVisible() shows only that one.
        FAMILY_NAME_FIELDS.forEach((name) => fieldsToShow.add(name));
      }
      // Same for "please specify" fields: keep e.g. fromWhichBoardDidYouPassClass10Other
      // in the schema while its parent is being asked, so picking "other" shows it.
      schema.forEach((field) => {
        if (fieldsToShow.has(getOtherFieldParent(field?.name))) {
          fieldsToShow.add(field.name);
        }
      });

      setFilteredSchema(schema.filter((field) => fieldsToShow.has(field.name)));
      // Seed with the user's already-saved values (not just the missing ones) so
      // conditional visibility that depends on a field NOT being edited here -
      // e.g. mobile/guardian fields depending on a dob already on file - still
      // resolves correctly.
      setFormData(userDetails);
      setLoading(false);
    };

    loadSchema();

    const logOpen = async () => {
      await logEventFunction({
        eventName: 'complete_profile_form_view',
        method: 'on-view',
        screenName: 'CompleteProfileForm',
      });
    };
    logOpen();
  }, []);

  useEffect(() => {
    if (filteredSchema.some((field) => field.name === 'state') && stateData.length === 0) {
      getGeoLocation({ payload: { offset: 0, fieldName: 'state' } }).then((data) =>
        setStateData(data?.values || [])
      );
    }
  }, [filteredSchema]);

  useEffect(() => {
    if (!filteredSchema.some((field) => field.name === 'district')) {
      return;
    }
    const stateValue = formData?.state?.value;
    if (!stateValue) {
      return;
    }
    getGeoLocation({
      payload: { offset: 0, fieldName: 'district', controllingfieldfk: [stateValue] },
    }).then((data) => setDistrictData(data?.values || []));
  }, [formData?.state]);

  useEffect(() => {
    if (!filteredSchema.some((field) => field.name === 'block')) {
      return;
    }
    const districtValue = formData?.district?.value;
    if (!districtValue) {
      return;
    }
    getGeoLocation({
      payload: { offset: 0, fieldName: 'block', controllingfieldfk: [districtValue] },
    }).then((data) => setBlockData(data?.values || []));
  }, [formData?.district]);

  useEffect(() => {
    if (!filteredSchema.some((field) => field.name === 'village')) {
      return;
    }
    const blockValue = formData?.block?.value;
    if (!blockValue) {
      return;
    }
    getGeoLocation({
      payload: { offset: 0, fieldName: 'village', controllingfieldfk: [blockValue] },
    }).then((data) => setVillageData(data?.values || []));
  }, [formData?.block]);

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async () => {
    const familyType = (() => {
      const raw = formData?.family_member_details;
      return raw && typeof raw === 'object' ? raw.value : raw;
    })();

    const dataToValidate = { ...formData };
    if (familyType) {
      ['father_name', 'mother_name', 'spouse_name']
        .filter((name) => name !== `${familyType}_name`)
        .forEach((name) => {
          dataToValidate[name] = '';
        });
    }

    const newErrors = validateProfileFields(filteredSchema, dataToValidate, t);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    const payload = await transformPayload(dataToValidate);
    const user_id = await getDataFromStorage('userId');
    const register = await updateUser({ payload, user_id });

    if (!isConnected) {
      setLoading(false);
    } else if (register?.params?.status === 'failed') {
      setLoading(false);
      setModal(true);
      setErr(register?.params?.err);
    } else {
      const profileData = await getProfileDetails({ userId: user_id });
      await setDataInStorage('profileData', JSON.stringify(profileData));
      navigation.goBack();
    }
  };

  if (loading) {
    return <ActiveLoading />;
  }

  const orderedSchema = reorderFamilyFieldsAfterSelector(filteredSchema);
  const geoOptions = { stateData, districtData, blockData, villageData };

  return (
    <>
      <SecondaryHeader logo />
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <GlobalText style={[globalStyles.h5, styles.title]}>
          {t('complete_profile_title')}
        </GlobalText>
      </View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={styles.card}>
            <GlobalText style={[globalStyles.h6, styles.intro]}>
              🧐📝  {t('complete_profile_intro')}
            </GlobalText>
            <View style={styles.fieldList}>
              {orderedSchema.map((field) => {
                const content = renderProfileField(field, {
                  formData,
                  errors,
                  handleInputChange,
                  geoOptions,
                });
                if (!content) {
                  return null;
                }
                return (
                  <View key={field.name} style={styles.fieldContainer}>
                    {content}
                  </View>
                );
              })}
            </View>
            <PrimaryButton text={t('submit')} onPress={handleSubmit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {modal && (
        <Modal transparent animationType="slide">
          <View style={styles.modalContainer}>
            {err && (
              <View style={styles.alertBox}>
                <Image source={lightning} resizeMode="contain" />
                <GlobalText style={[globalStyles.subHeading, { marginVertical: 10 }]}>
                  Error: {err}
                </GlobalText>
                <PrimaryButton text={t('continue')} onPress={() => setModal(false)} />
              </View>
            )}
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginRight: 34,
  },
  card: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#EEE6DA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  intro: {
    marginBottom: 15,
  },
  fieldList: {
    marginBottom: 20,
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 10,
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
});

export default CompleteProfileFormScreen;
