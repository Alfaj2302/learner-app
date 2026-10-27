import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AppState,
  DeviceEventEmitter,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { Button, useTheme } from '@ui-kitten/components';
import { useTranslation } from '../../context/LanguageContext';
import {
  getBatchAssignmentCacheKey,
  getDataFromStorage,
  getDefaultProgramTags,
  setDataInStorage,
} from '../../utils/JsHelper/Helper';
import { PROGRAM_SWITCHED_EVENT } from '../../utils/Constants/app-constants';
import {
  ContentSearch,
  getRegistrationAssessmentStatus,
} from '../../utils/API/AuthService';
import GlobalText from '../GlobalText/GlobalText';
import globalStyles from '../../utils/Helper/Style';

// Mirrors the batch eligibility check used by SCPUserTabScreen to show the
// Home/My Class tabs, so the button disappears as soon as those tabs appear.
// Keyed by the currently selected program/tenant (see getBatchAssignmentCacheKey)
// so a dual-enrolled user's batch status in one program never leaks into the other.
const hasActiveBatchAssigned = async () => {
  const cohortAssignedId = await getDataFromStorage(
    await getBatchAssignmentCacheKey()
  );
  if (cohortAssignedId) {
    return true;
  }

  try {
    const cohortparse = await getDataFromStorage('cohortData');
    if (!cohortparse) {
      return false;
    }
    const cohortData = JSON.parse(cohortparse);
    return (
      cohortData?.type === 'BATCH' &&
      cohortData?.cohortMemberStatus === 'active' &&
      cohortData?.cohortStatus === 'active'
    );
  } catch (error) {
    console.error('AttemptAssessmentButton: cohortData parse failed', error);
    return false;
  }
};

const AttemptAssessmentButton = ({ onStateChange } = {}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [showButton, setShowButton] = useState(false);
  const [questionSetIdentifier, setQuestionSetIdentifier] = useState(null);
  const [questionSetMimeType, setQuestionSetMimeType] = useState(null);
  const [isContentAvailable, setIsContentAvailable] = useState(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);

  // Read via a ref so re-renders of the parent (which happen when it reacts
  // to onStateChange) don't recreate checkPendingAssessment and retrigger it.
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  });

  // Tracks the last known attempts so the batch-assignment poll below (which
  // only re-checks batch status, not attempts) can still emit a correct state.
  const attemptsRef = useRef([]);

  // Set right before navigating to the assessment player, so the very next
  // status check (on refocus, after the learner returns) knows to tolerate
  // brief backend indexing lag instead of trusting an immediate zero-result.
  const justAttemptedRef = useRef(false);

  const emitState = useCallback((state) => {
    if (state.attempts) {
      attemptsRef.current = state.attempts;
    }
    onStateChangeRef.current?.({
      visible: false,
      showButton: false,
      attempts: attemptsRef.current,
      ...state,
    });
  }, []);

  const checkPendingAssessment = useCallback(async () => {
    try {
    // Consumed once per call, right away, so it can't leak into an unrelated
    // later focus event if this call returns early before reaching the
    // attempts check below.
    const wasJustAttempted = justAttemptedRef.current;
    justAttemptedRef.current = false;

    const userType = await getDataFromStorage('userType');
    console.log('AttemptAssessmentButton: userType from storage:', userType);
    if (userType !== 'scp') {
      console.log('AttemptAssessmentButton: userType is not scp, hiding button');
      setShowButton(false);
      emitState({ visible: false });
      return;
    }

    let uiConfig = {};
    try {
      const uiConfigRaw = await getDataFromStorage('uiConfig');
      uiConfig = JSON.parse(uiConfigRaw || '{}');
      console.log('AttemptAssessmentButton: uiConfig from storage:', uiConfig);
    } catch (_) {}
    const isRegistrationTestEnabled =
      uiConfig?.RegisterationTest === true ||
      uiConfig?.RegisterationTest === 'true';

    if (!isRegistrationTestEnabled) {
      setShowButton(false);
      emitState({ visible: false });
      return;
    }

    const userId = await getDataFromStorage('userId');
    if (!userId) {
      setShowButton(false);
      emitState({ visible: false });
      return;
    }

    const batchAssigned = await hasActiveBatchAssigned();
    console.log('AttemptAssessmentButton: batchAssigned:', batchAssigned);

    const preferredLanguage = await getDataFromStorage('preferred_language');

    try {
      const response = await ContentSearch({
        query: '',
        filters: {
          status: ['Live'],
          primaryCategory: ['Practice Question Set'],
          assessmentType: 'Eligibility Test',
          program: uiConfig?.program || (await getDefaultProgramTags()),
          ...(preferredLanguage ? { contentLanguage: [preferredLanguage] } : {}),
        },
        sort_by: { lastUpdatedOn: 'desc' },
        limit: 1,
        offset: 0,
      });

      const item = response?.result?.QuestionSet?.[0];
      const identifier = item?.identifier;

      if (!identifier) {
        setIsContentAvailable(false);
        setQuestionSetIdentifier(null);
        // No question set to attempt — with no attempt history to fall back
        // on, mirror the batch-assigned/0-attempts rule and hide the section.
        if (batchAssigned) {
          setShowButton(false);
          emitState({ visible: false, showButton: false, attempts: [] });
        } else {
          setShowButton(true);
          emitState({ visible: true, showButton: true, attempts: [] });
        }
        return;
      }

      const result = await getRegistrationAssessmentStatus({
        userId,
        courseId: identifier,
        unitId: identifier,
        contentId: identifier,
      });

      let attempts = Array.isArray(result) ? result : [];

      // A zero-result response right after a fresh submission can just be
      // read-after-write lag on the backend, not a real "no attempts" state
      // — retry once after a short delay before trusting a zero count. Only
      // do this for the check right after the learner returns from an
      // attempt (wasJustAttempted) — otherwise every normal page load with
      // genuinely zero attempts would pay this delay before the button/
      // section can even appear.
      if (attempts.length === 0 && wasJustAttempted) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const retryResult = await getRegistrationAssessmentStatus({
          userId,
          courseId: identifier,
          unitId: identifier,
          contentId: identifier,
        });
        const retryAttempts = Array.isArray(retryResult) ? retryResult : [];
        if (retryAttempts.length > 0) {
          attempts = retryAttempts;
        }
      }

      const registrationTestReattempt = Number(
        uiConfig?.registrationTestReattempt ?? 0
      );
      console.log(
        'AttemptAssessmentButton: registrationTestReattempt from uiConfig:',
        registrationTestReattempt
      );
      const usedCount = attempts.length;
      console.log(
        'AttemptAssessmentButton: remaining attempts:',
        registrationTestReattempt - usedCount
      );

      // Once a batch is assigned (i.e. the learner now sees the Home/My
      // Class dashboard), the learner can no longer start/continue an
      // attempt — the button always hides. The attempts section itself only
      // hides when there is nothing to show (zero attempts so far).
      if (batchAssigned) {
        setIsContentAvailable(false);
        setQuestionSetIdentifier(null);
        setShowButton(false);
        if (usedCount === 0) {
          emitState({ visible: false, showButton: false, attempts });
        } else {
          emitState({ visible: true, showButton: false, attempts });
        }
        return;
      }

      if (usedCount < registrationTestReattempt) {
        await setDataInStorage('registerationTestQuestionSetIdentifier', identifier);
        setQuestionSetIdentifier(identifier);
        setQuestionSetMimeType(
          item?.mimeType || 'application/vnd.sunbird.questionset'
        );
        setIsContentAvailable(true);
        setShowButton(true);
        emitState({ visible: true, showButton: true, attempts });
      } else {
        setShowButton(false);
        emitState({ visible: true, showButton: false, attempts });
      }
    } catch (error) {
      console.error('AttemptAssessmentButton: status check failed', error);
      setIsContentAvailable(false);
      // Attempt history could not be confirmed. If a batch is assigned the
      // button must still hide (safe default); otherwise fall back to
      // letting the learner attempt, as before.
      setShowButton(!batchAssigned);
      emitState({
        visible: true,
        showButton: !batchAssigned,
        attempts: attemptsRef.current,
      });
    }
  } catch (error) {
    console.error('AttemptAssessmentButton: check failed', error);
    emitState({ visible: false, showButton: false, attempts: [] });
  }
  }, [emitState]);

  useFocusEffect(
    useCallback(() => {
      checkPendingAssessment();
    }, [checkPendingAssessment])
  );

  // Switching the active program doesn't always recreate this screen (e.g. a
  // dashboard reused across programs without a nav reset), so re-run the
  // check reactively whenever the selected program changes, not just on focus.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      PROGRAM_SWITCHED_EVENT,
      checkPendingAssessment
    );
    return () => subscription.remove();
  }, [checkPendingAssessment]);

  // SCPUserTabScreen keeps `cohortData` fresh while the tabs are mounted, so a
  // cheap storage-only poll is enough to drop the button the moment a batch is
  // assigned — no need to repeat the ContentSearch/assessment-status calls.
  useEffect(() => {
    if (!isFocused || !showButton) {
      return;
    }

    let cancelled = false;
    const checkBatch = async () => {
      if (AppState.currentState !== 'active') {
        return;
      }
      const batchAssigned = await hasActiveBatchAssigned();
      if (!cancelled && batchAssigned) {
        setShowButton(false);
        emitState({
          visible: attemptsRef.current.length > 0,
          showButton: false,
          attempts: attemptsRef.current,
        });
      }
    };

    const intervalId = setInterval(checkBatch, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isFocused, showButton, emitState]);

  const handlePress = () => {
    if (isContentAvailable && questionSetIdentifier) {
      justAttemptedRef.current = true;
      navigation.navigate('StandAlonePlayer', {
        content_do_id: questionSetIdentifier,
        content_mime_type: questionSetMimeType,
        isOffline: false,
        title: t('attempt_assessment'),
        isRegistrationTest: true,
      });
    } else {
      setShowUnavailableModal(true);
    }
  };

  if (!showButton) {
    return null;
  }

  return (
    <>
      <Button
        status="basic"
        onPress={handlePress}
        style={[styles.button, styles.buttonFirst]}
      >
        {(props) => (
          <GlobalText
            {...props}
            style={[globalStyles.h6, styles.buttonText, styles.buttonTextFirst]}
          >
            {t('attempt_assessment')}
          </GlobalText>
        )}
      </Button>

      <Modal
        visible={showUnavailableModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnavailableModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <GlobalText style={styles.modalTitle}>
              {t('come_back_later')}
            </GlobalText>
            <GlobalText style={styles.modalBody}>
              {t('assessment_unavailable_message')}
            </GlobalText>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme['color-primary-500'] }]}
              onPress={() => setShowUnavailableModal(false)}
            >
              <GlobalText style={[globalStyles.h6, styles.modalButtonText]}>
                {t('ok')}
              </GlobalText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 24,
    height: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 0,
  },
  buttonFirst: {
    backgroundColor: '#FDBE16',
  },
  buttonText: {
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '700',
    fontFamily: 'Roboto-Black',
    fontSize: 13,
    lineHeight: 13,
    includeFontPadding: false,
  },
  buttonTextFirst: {
    color: '#1F1B13',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1B13',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    color: '#3B383E',
    marginBottom: 20,
  },
  modalButton: {
    borderRadius: 30,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#1F1B13',
    fontWeight: '700',
    fontFamily: 'Roboto-Black',
  },
});

AttemptAssessmentButton.propTypes = {
  onStateChange: PropTypes.func,
};

export default AttemptAssessmentButton;
