import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import SafeAreaWrapper from '../../../components/SafeAreaWrapper/SafeAreaWrapper';
import globalStyles from '../../../utils/Helper/Style';
import eventcal from '../../../assets/images/png/eventcal.png';

import GlobalText from '@components/GlobalText/GlobalText';

const WeeklyCalendar = ({ setDate, postdays, allEventData }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventDate, setEventDate] = useState(null);
  const flatListRef = useRef(null);

  // const formatDate = (date) => {
  //   const day = date.getDate().toString().padStart(2, '0');
  //   const month = (date.getMonth() + 1).toString().padStart(2, '0');
  //   const year = date.getFullYear();
  //   return `${month}/${day}/${year}`;
  // };

  // Generate data for last 7 or next 7 days
  const generateDaysData = () => {
    const daysData = Array.from({ length: 7 }, (_, i) => {
      const currentDate = new Date();
      if (postdays) {
        // If postdays prop is true, calculate the upcoming days
        currentDate.setDate(currentDate.getDate() + i);
      } else {
        // Default: calculate the previous days
        currentDate.setDate(currentDate.getDate() - (6 - i));
      }
      return {
        id: i,
        date: currentDate.getDate(),
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
          currentDate.getDay()
        ],
        exactDate: currentDate,
      };
    });
    return daysData;
  };

  const last30Days = generateDaysData();

  const onDateClick = (item) => {
    setSelectedDate(item.date);
    setDate(item?.exactDate);
  };

  const today = new Date();

  useEffect(() => {
    if (flatListRef.current && last30Days && !postdays) {
      flatListRef.current.scrollToIndex({
        index: last30Days.length - 1,
        animated: true,
      });
    }
  }, [last30Days]);

  const getItemLayout = (data, index) => ({
    length: 100,
    offset: 58 * index,
    index,
  });

  const handleScrollToIndexFailed = (info) => {
    console.warn('Failed to scroll to index', info.index);
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: last30Days.length - 1,
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (allEventData) {
      setEventDate([]);
      const uniqueDates = Array.from(
        new Set(
          allEventData.map((item) => {
            const eventDate = new Date(item?.startDateTime);
            // Local calendar day (e.g. "Tue Oct 27 2026"). getUTCDate() put
            // sessions starting before 05:30 IST on the previous day.
            return eventDate.toDateString();
          })
        )
      );

      setEventDate(uniqueDates);
    }
  }, [allEventData]);

  // console.log('eventDate', JSON.stringify(eventDate));

  return (
    <SafeAreaWrapper>
      <FlatList
        ref={flatListRef}
        data={last30Days}
        keyExtractor={(item) => item.id.toString()}
        horizontal={true}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => onDateClick(item)}
          >
            <GlobalText style={globalStyles.text}>
              {item.date === today.getDate() ? 'Today' : item.day}
            </GlobalText>

            <View
              style={[
                styles.box,
                item.date === selectedDate && styles.selectedBox,
                item.date === today.getDate() && styles.todayBox,
              ]}
            >
              <GlobalText style={[globalStyles.text, { fontSize: 12 }]}>
                {item.date}
              </GlobalText>

              {eventDate?.includes(item.exactDate.toDateString()) && (
                <Image source={eventcal} style={{ width: 20, height: 20 }} />
              )}
            </View>
          </TouchableOpacity>
        )}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={handleScrollToIndexFailed}
      />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  box: {
    padding: 16,
    paddingVertical: 10,
    margin: 5,
    alignItems: 'center',
    // justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#eee',
    width: 50,
    minHeight: 70,
  },
  todayBox: {
    backgroundColor: '#FDBE16',
  },
  selectedBox: {
    borderWidth: 1,
  },
});

export default WeeklyCalendar;
