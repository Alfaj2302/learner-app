import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import SecondaryHeader from '../../components/Layout/SecondaryHeader';
import CoursesBox from '../../components/CoursesBox/CoursesBox';
import SyncCard from '../../components/SyncComponent/SyncCard';
import CustomSearchBox from '../../components/CustomSearchBox/CustomSearchBox';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
import ActiveLoading from '../LoadingScreen/ActiveLoading';
import GlobalText from '@components/GlobalText/GlobalText';
import { useTranslation } from '../../context/LanguageContext';
import { l2CourseListApi } from '../../utils/API/AuthService';
import { courseTrackingStatus } from '../../utils/API/ApiCalls';
import { getDataFromStorage } from '../../utils/JsHelper/Helper';
import { getActiveBatchSkills } from '../../utils/Helper/useActiveBatchEligibility';
import globalStyles from '../../utils/Helper/Style';

// Same cadence as useActiveBatchEligibility, which refreshes the stored batch.
const SKILL_CHECK_INTERVAL = 3000;

// Learner's progress on a page of courses, as on Explore. Progress is
// secondary: a failure here still shows the courses.
const fetchTrackData = async (courseIds) => {
  const userId = await getDataFromStorage('userId');
  const track = await courseTrackingStatus(userId, courseIds).catch(() => null);
  return track?.data?.find((course) => course.userId === userId)?.course || [];
};

const L2Courses = () => {
  const { t } = useTranslation();

  const [courseData, setCourseData] = useState([]);
  const [trackData, setTrackData] = useState([]);
  const [count, setCount] = useState(0);
  const [skills, setSkills] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // Bumped on every reload so responses for an older skill set or search are
  // dropped.
  const requestIdRef = useRef(0);
  const courseDataRef = useRef([]);
  const skillsKeyRef = useRef(null);

  useEffect(() => {
    courseDataRef.current = courseData;
  }, [courseData]);

  const fetchData = useCallback(
    async (offset, append = false) => {
      if (!skills) {
        return;
      }
      const requestId = append ? requestIdRef.current : ++requestIdRef.current;
      setError(false);

      if (!append) {
        setCourseData([]);
        setTrackData([]);
        setCount(0);
        // No skill on the batch: nothing to scope the catalogue to.
        if (skills.length === 0) {
          setLoadingContent(false);
          return;
        }
        setLoadingContent(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await l2CourseListApi({ skills, searchText, offset });
        if (!data) {
          throw new Error('L2 course search failed');
        }
        const content = data?.content || [];
        const pageTrackData =
          content.length > 0
            ? await fetchTrackData(content.map((item) => item?.identifier))
            : [];
        if (requestId !== requestIdRef.current) {
          return;
        }

        setCount(data?.count || 0);
        setCourseData((prev) => (append ? [...prev, ...content] : content));
        setTrackData((prev) =>
          append ? [...prev, ...pageTrackData] : pageTrackData
        );
      } catch (e) {
        console.log('L2Courses: load failed', e);
        if (requestId === requestIdRef.current && !append) {
          setError(true);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingContent(false);
          setLoadingMore(false);
        }
      }
    },
    [skills, searchText]
  );

  // Reload on skill change, and on search (debounced, as on Explore).
  useEffect(() => {
    const handler = setTimeout(() => fetchData(0, false), 500);
    return () => clearTimeout(handler);
  }, [fetchData]);

  // Pick up the batch's skills on focus and while focused, so a skill change
  // never leaves stale courses on screen. When they are unchanged, refresh
  // progress instead, which may have moved in the player.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const checkSkills = async (onUnchanged) => {
        const nextSkills = await getActiveBatchSkills();
        if (!active) {
          return;
        }
        const nextKey = nextSkills.join(',');
        if (nextKey !== skillsKeyRef.current) {
          skillsKeyRef.current = nextKey;
          setSkills(nextSkills);
        } else if (onUnchanged) {
          onUnchanged();
        }
      };

      const refreshStatus = async () => {
        const courseIds = courseDataRef.current.map((item) => item?.identifier);
        if (courseIds.length === 0) {
          return;
        }
        const requestId = requestIdRef.current;
        const nextTrackData = await fetchTrackData(courseIds);
        if (active && requestId === requestIdRef.current) {
          setTrackData(nextTrackData);
        }
      };

      checkSkills(refreshStatus);
      const intervalId = setInterval(checkSkills, SKILL_CHECK_INTERVAL);
      return () => {
        active = false;
        clearInterval(intervalId);
      };
    }, [])
  );

  const handleRefresh = () => {
    fetchData(0, false);
  };

  const handleViewMore = () => {
    fetchData(courseData.length, true);
  };

  const renderCourses = () => {
    if (loadingContent) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.message}>
          <GlobalText style={[globalStyles.text, styles.messageText]}>
            {t('something_went_wrong_try_again_later')}
          </GlobalText>
          <View style={styles.retry}>
            <PrimaryButton onPress={handleRefresh} text={t('try_again')} />
          </View>
        </View>
      );
    }
    if (courseData.length === 0) {
      return (
        <GlobalText style={globalStyles.heading2}>
          {t('no_data_found')}
        </GlobalText>
      );
    }
    return (
      <>
        <CoursesBox
          style={{ titlecolor: '#06A816' }}
          ContentData={courseData}
          TrackData={trackData}
          isHorizontal={false}
        />
        {courseData.length < count &&
          (loadingMore ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <PrimaryButton onPress={handleViewMore} text={t('viewmore')} />
          ))}
      </>
    );
  };

  return (
    <SafeAreaWrapper style={{ flex: 1, backgroundColor: 'white' }}>
      <SecondaryHeader logo />
      <ScrollView
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.view}>
          {skills === null ? (
            <ActiveLoading />
          ) : (
            <>
              <View style={styles.view2}>
                <GlobalText style={globalStyles.heading}>
                  {t('l2_courses')}
                </GlobalText>
              </View>
              {skills.length > 0 && (
                <View style={{ width: '100%', marginBottom: 10 }}>
                  <CustomSearchBox
                    setSearchText={setSearchText}
                    searchText={searchText}
                    placeholder={t('Search Courses')}
                  />
                </View>
              )}
              <SyncCard doneSync={handleRefresh} />
              {renderCourses()}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  view: {
    width: '100%',
    padding: 15,
  },
  view2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  message: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  messageText: {
    textAlign: 'center',
  },
  retry: {
    width: 180,
    marginTop: 15,
  },
  loaderContainer: {
    paddingVertical: 20,
  },
});

export default L2Courses;
