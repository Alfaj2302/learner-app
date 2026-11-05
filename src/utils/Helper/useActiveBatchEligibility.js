import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { getDataFromStorage, setDataInStorage } from '../JsHelper/Helper';
import { getCohort } from '../API/AuthService';

// Same rule SCPUserTabScreen uses to show the Home / My Class tabs, except that
// a Vocational Training learner's member status is 'in_training' while they are
// enrolled, so both statuses count as an active batch member.
const ACTIVE_MEMBER_STATUSES = ['active', 'in_training'];

const isActiveBatch = (cohortData) =>
  cohortData?.type === 'BATCH' &&
  ACTIVE_MEMBER_STATUSES.includes(cohortData?.cohortMemberStatus) &&
  cohortData?.cohortStatus === 'active';

// `cohortData` is shared by every program, so it may still hold another
// program's batch (e.g. SCP) after a program switch. Only trust the stored copy
// when this hook saved it for the current tenant.
const BATCH_TENANT_KEY = 'activeBatchTenantId';

const readStoredEligibility = async (tenantid) => {
  try {
    const storedTenantId = await getDataFromStorage(BATCH_TENANT_KEY);
    if (!tenantid || storedTenantId !== tenantid) {
      return false;
    }
    const cohortparse = await getDataFromStorage('cohortData');
    if (!cohortparse) {
      return false;
    }
    return isActiveBatch(JSON.parse(cohortparse));
  } catch (error) {
    console.error('useActiveBatchEligibility: stored cohortData invalid', error);
    return false;
  }
};

/**
 * Values of the active batch's SKILLS custom field (e.g. ["Aari Work"]), read
 * from the `cohortData` this hook stored for the current tenant. Courses index
 * the same pos-framework level as `se_skills`, so these filter L2 courses
 * directly. Empty when there is no active batch or it has no skill.
 */
export const getActiveBatchSkills = async () => {
  try {
    const tenantData = JSON.parse(
      (await getDataFromStorage('tenantData')) || '[]'
    );
    if (!(await readStoredEligibility(tenantData?.[0]?.tenantId))) {
      return [];
    }
    const cohort = JSON.parse(await getDataFromStorage('cohortData'));
    const skillsField = cohort?.customField?.find(
      (field) => field?.label === 'SKILLS'
    );
    // selectedValues entries are either plain strings or { id, label }.
    return (skillsField?.selectedValues || [])
      .map((value) =>
        typeof value === 'string' ? value : value?.label ?? value?.id
      )
      .filter(Boolean);
  } catch (error) {
    console.error('getActiveBatchSkills: stored cohortData invalid', error);
    return [];
  }
};

/**
 * Returns true when the logged-in learner has an active batch.
 * Mirrors SCPUserTabScreen.refreshCohortData (including its 3-second re-check
 * while focused): re-fetches the cohort and falls back to the stored
 * `cohortData` when the API call fails or required keys are missing. Unlike SCP
 * it only writes `cohortData` / `cohortId` when it finds a matching batch, so
 * it never wipes what login stored.
 *
 * Pass `enabled = false` to make the hook inert (no API calls, no listeners).
 */
const useActiveBatchEligibility = (enabled = true) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const appState = useRef(AppState.currentState);
  const [eligible, setEligible] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setEligible(false);
      return;
    }

    let tenantid;
    try {
      const tenantData = JSON.parse(
        (await getDataFromStorage('tenantData')) || '[]'
      );
      tenantid = tenantData?.[0]?.tenantId;
      const user_id = await getDataFromStorage('userId');
      const academicYearId = await getDataFromStorage('academicYearId');

      if (!tenantid || !user_id || !academicYearId) {
        setEligible(await readStoredEligibility(tenantid));
        return;
      }

      const cohort = await getCohort({ user_id, tenantid, academicYearId });

      if (Array.isArray(cohort)) {
        const activeBatch = cohort.find(isActiveBatch);

        if (activeBatch) {
          // Assessment screens read the learner's board and cohort id from these keys.
          await setDataInStorage('cohortData', JSON.stringify(activeBatch));
          await setDataInStorage('cohortId', activeBatch.cohortId);
          await setDataInStorage(BATCH_TENANT_KEY, tenantid);
        }
        setEligible(!!activeBatch);
      } else if (cohort?.params?.status === 'failed') {
        // The server answered and reported no cohort for this tenant / year.
        setEligible(false);
      } else {
        // No answer from the server (e.g. offline): use what this hook saved
        // earlier for the same tenant.
        setEligible(await readStoredEligibility(tenantid));
      }
    } catch (error) {
      console.error('useActiveBatchEligibility: refresh failed', error);
      setEligible(await readStoredEligibility(tenantid));
    }
  }, [enabled]);

  // Mount, enable change and screen focus.
  useEffect(() => {
    if (isFocused) {
      refresh();
    }
  }, [isFocused, refresh]);

  // Navigation state change (e.g. coming back from another screen).
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    return navigation.addListener('state', refresh);
  }, [enabled, navigation, refresh]);

  // Same as SCPUserTabScreen: re-check every 3 seconds while the screen is
  // focused and the app is in the foreground, so the tab appears / disappears
  // as soon as the batch is assigned / removed.
  useEffect(() => {
    if (!enabled || !isFocused) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        refresh();
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [enabled, isFocused, refresh]);

  // App returning to the foreground.
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        refresh();
      }
      appState.current = nextAppState;
    });
    return () => subscription?.remove();
  }, [enabled, refresh]);

  return eligible;
};

export default useActiveBatchEligibility;
