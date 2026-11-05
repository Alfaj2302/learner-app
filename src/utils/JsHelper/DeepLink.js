import { courseDetails, hierarchyContent, readContent } from '../API/ApiCalls';
import {
  getUserDetails,
  getCohort,
  getProfileDetails,
  getProgramDetails,
  setAcademicYear,
  notificationSubscribe,
  telemetryTrackingData,
} from '../API/AuthService';
import {
  getDataFromStorage,
  deleteSavedItem,
  setDataInStorage,
  getuserDetails,
  getActiveCohortData,
  getActiveCohortIds,
  storeUsername,
  getDeviceId,
} from './Helper';
import { TENANT_DATA } from '../Constants/app-constants';
import moment from 'moment';

/**
 * Helper function to switch program based on tenant data
 */
const switchToProgram = async (tenant, navigation) => {
  try {

    const tenantId = tenant?.tenantId;
    const tenantName = tenant?.tenantName;
    
    console.log('#### DeepLink: Starting program switch for:', tenantName, tenantId);
    
    // Get user_id from storage
    const user_id = await getDataFromStorage('userId');
    
    if (!user_id) {
      console.error('#### DeepLink: User ID not found');
      return false;
    }

    // Get user details from storage
    const userDetails = await getuserDetails();
    
    if (!userDetails || !userDetails.tenantData) {
      console.error('#### DeepLink: User details not found');
      return false;
    }

    const selectedTenantData = [
      userDetails?.tenantData?.find((t) => t.tenantId === tenantId),
    ];
    
    const uiConfig = selectedTenantData?.[0]?.params?.uiConfig;
    await setDataInStorage('uiConfig', JSON.stringify(uiConfig));
    console.log('#### DeepLink: uiConfig set', JSON.stringify(uiConfig));

    if (!selectedTenantData[0]) {
      console.error('#### DeepLink: Program data not found');
      return false;
    }

    const enrollmentId = userDetails?.enrollmentId;
    await setDataInStorage('tenantData', JSON.stringify(selectedTenantData || {}));
    await setDataInStorage('userId', user_id || '');
    await setDataInStorage('enrollmentId', enrollmentId || '');

    //store dynamic templateId
    const templateId = selectedTenantData?.[0]?.templateId;
    await setDataInStorage('templateId', templateId || '');

    const academicyear = await setAcademicYear({ tenantid: tenantId });
    const academicYearId = academicyear?.[0]?.id;
    await setDataInStorage('academicYearId', academicYearId || '');
    await setDataInStorage('userTenantid', tenantId || '');
    
    const cohort = await getCohort({
      user_id,
      tenantid: tenantId,
      academicYearId,
    });
    console.log('#### DeepLink: cohort', cohort);

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
    console.log('#### DeepLink: profileData', profileData);

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

    await setDataInStorage(
      'contentFilter',
      JSON.stringify(MatchedTenant?.[0]?.contentFilter || {})
    );

    // Get tenant IDs for each program type
    const youthnetTenantIds = tenantDetails
      ?.filter((item) => item?.name === TENANT_DATA.YOUTHNET)
      ?.map((item) => item?.tenantId);

    const scpTenantIds = tenantDetails
      ?.filter((item) => [TENANT_DATA.SECOND_CHANCE_PROGRAM, TENANT_DATA.PATHWAYS].includes(item?.name))
      ?.map((item) => item?.tenantId);

    const campToClubTenantIds = tenantDetails
      ?.filter((item) => item?.name === TENANT_DATA.CAMP_TO_CLUB)
      ?.map((item) => item?.tenantId);

    console.log('#### DeepLink: All tenant details:', JSON.stringify(tenantDetails));
    console.log('#### DeepLink: Tenant IDs - SCP:', scpTenantIds, 'Youthnet:', youthnetTenantIds, 'Camp to Club:', campToClubTenantIds);
    
    const selectedTenantName = selectedTenantData?.[0]?.tenantName;
    console.log('#### DeepLink: Selected tenant name:', selectedTenantName);

    // Device notification subscription
    try {
      const deviceId = await getDeviceId();
      const action = 'add';
      await notificationSubscribe({ deviceId, user_id, action });
    } catch (notifError) {
      console.log('#### DeepLink: Notification subscribe error (non-critical):', notifError);
    }
    
    // Telemetry tracking
    try {
      const now = moment();
      const telemetryPayloadData = {
        event: 'login',
        type: 'click',
        ets: now.unix(),
      };
      await telemetryTrackingData({
        telemetryPayloadData,
      });
    } catch (telemetryError) {
      console.log('#### DeepLink: Telemetry tracking error (non-critical):', telemetryError);
    }

    // Set userType based on program type
    if (scpTenantIds?.includes(tenantId)) {
      console.log('#### DeepLink: Setting userType to scp');
      await setDataInStorage('userType', 'scp');
    } else if ([TENANT_DATA.SECOND_CHANCE_PROGRAM, TENANT_DATA.PATHWAYS].includes(selectedTenantName)) {
      console.log('#### DeepLink: Setting userType to scp (by name)');
      await setDataInStorage('userType', 'scp');
    } else if (youthnetTenantIds?.includes(tenantId)) {
      console.log('#### DeepLink: Setting userType to youthnet');
      await setDataInStorage('userType', 'youthnet');
    } else if (selectedTenantName === TENANT_DATA.YOUTHNET) {
      console.log('#### DeepLink: Setting userType to youthnet (by name)');
      await setDataInStorage('userType', 'youthnet');
    } else if (campToClubTenantIds?.includes(tenantId)) {
      console.log('#### DeepLink: Setting userType to Camp to Club');
      await setDataInStorage('userType', TENANT_DATA.CAMP_TO_CLUB);
    } else if (selectedTenantName === TENANT_DATA.CAMP_TO_CLUB) {
      console.log('#### DeepLink: Setting userType to Camp to Club (by name)');
      await setDataInStorage('userType', TENANT_DATA.CAMP_TO_CLUB);
    } else {
      console.log('#### DeepLink: Setting userType to:', selectedTenantName);
      await setDataInStorage('userType', selectedTenantName || 'default');
    }
    
    console.log('#### DeepLink: Program switch completed successfully');
    return true;
    
  } catch (error) {
    console.error('#### DeepLink: Error in switchToProgram:', error);
    return false;
  }
};

export const deepLinkCheck = async (navigation) => {
  try {
    const deeplinkData = await getDataFromStorage('deep_link_data');
    console.log('########## deeplinkData found', deeplinkData);
    
    if (!deeplinkData) {
      console.log('########## No deep link data found');
      return;
    }
    
    const deeplinkDataJson = JSON.parse(deeplinkData);
    if (!deeplinkDataJson) {
      console.log('########## Deep link data is empty');
      return;
    }

    await deleteSavedItem('deep_link_data');

    const { page, type, identifier, program } = deeplinkDataJson;
    console.log('########## page', page);
    console.log('########## type', type);
    console.log('########## identifier', identifier);
    console.log('########## program', program);

    // Get parent data to check program
    const parentData = await courseDetails(identifier);
    const parentProgram = parentData?.result?.content?.program;
    console.log('########## parentProgram', parentProgram);

    // Check program authorization
    if (parentData && parentProgram) {
      try {
        // Get stored program from tenantData
        const tenantData = JSON.parse(await getDataFromStorage('tenantData')) || {};
        const storedProgram = tenantData?.[0]?.tenantName;
        
        console.log('########## storedProgram', storedProgram);
        
        // Check if any deep link program matches current stored program
        const hasMatchWithCurrentProgram = parentProgram?.some(deepLinkProg => 
          storedProgram && storedProgram.includes(deepLinkProg)
        );
        
        if (!hasMatchWithCurrentProgram) {
          console.log('########## Program mismatch detected. Checking enrolled programs...');
          
          // Get user_id from storage
          const user_id = await getDataFromStorage('userId');
          
          if (!user_id) {
            console.log('########## User ID not found, showing unauthorized screen');
            navigation.navigate('UnauthorizedScreen');
            return;
          }

          // Fetch all user's tenant data (enrolled programs)
          const response = await getUserDetails({ user_id });
          console.log('########## User details fetched for deep link');
          
          if (response?.userData?.tenantData) {
            const allTenantData = response.userData.tenantData;
            
            // Filter tenants where role is "Learner" and status is "active" or "pending"
            const enrolledPrograms = allTenantData.filter((tenant) => {
              const hasLearnerRole = tenant.roles?.some(
                (role) => role.roleName?.toLowerCase() === 'learner'
              );
              const isActiveOrPending =
                tenant.tenantStatus === 'active' || tenant.tenantStatus === 'pending';
              
              return hasLearnerRole && isActiveOrPending;
            });
            
            console.log('########## Enrolled programs:', enrolledPrograms.map(p => p.tenantName));
            
            // Find if any enrolled program matches the deep link program
            let matchingTenant = null;
            for (const deepLinkProg of parentProgram) {
              matchingTenant = enrolledPrograms.find(tenant => 
                tenant.tenantName && tenant.tenantName.includes(deepLinkProg)
              );
              console.log('########## matchingTenant', matchingTenant);
              if (matchingTenant) {
                console.log('########## Found matching enrolled program:', matchingTenant.tenantName);
                break;
              }
            }
            
            if (matchingTenant) {
              // User is enrolled in the program, switch to it
              console.log('########## Switching to program:', matchingTenant.tenantName);
              
              const switchSuccess = await switchToProgram(matchingTenant, navigation);
              
              if (!switchSuccess) {
                console.log('########## Failed to switch program, showing unauthorized screen');
                navigation.navigate('UnauthorizedScreen');
                return;
              }
              
              // Small delay to ensure storage is written
              await new Promise(resolve => setTimeout(resolve, 300));
              
              console.log('########## Program switched successfully, proceeding with deep link navigation');
              // Continue with navigation below (don't return here)
            } else {
              // User is not enrolled in the required program
              console.log('########## User not enrolled in required program, showing unauthorized screen');
              navigation.navigate('UnauthorizedScreen');
              return;
            }
          } else {
            console.log('########## Failed to fetch user details, showing unauthorized screen');
            navigation.navigate('UnauthorizedScreen');
            return;
          }
        } else {
          console.log('########## Program matches current program, proceeding with navigation');
        }
      } catch (error) {
        console.log('########## Error checking program authorization:', error);
        // Continue with normal flow if check fails
      }
    }

    // Navigate to the appropriate content
    if (type === 'course') {
      const data = await courseDetails(identifier);
      console.log('########## Navigating to course');
      navigation.navigate('CourseContentList', {
        do_id: identifier,
        course_id: identifier,
        content_list_node: data?.result?.content?.leafNodes,
      });
    }

    if (type === 'content') {
      console.log('########## Navigating to content');
      const content_response = await readContent(identifier);

      navigation.push('StandAlonePlayer', {
        content_do_id: identifier,
        content_mime_type: content_response?.result?.content?.mimeType,
        isOffline: false,
        course_id: identifier,
        unit_id: identifier,
      });
    }
  } catch (e) {
    console.log('########## Error in deepLinkCheck:', e);
  }
};
