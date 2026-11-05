import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CourseContentList from '@src/screens/Dashboard/Courses/CourseContentList';
import UnitList from '@src/screens/Dashboard/Courses/UnitList';
import L2Courses from '../../screens/YouthNet/L2Courses';

const Stack = createNativeStackNavigator();

// Vocational Training L2 courses, with the same course screens as ExploreStack.
// Players live in the root stack.
const L2CoursesStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="L2Courses"
        component={L2Courses}
        options={{ lazy: true }}
      />
      <Stack.Screen
        name="UnitList"
        component={UnitList}
        options={{ lazy: true }}
      />
      <Stack.Screen
        name="CourseContentList"
        component={CourseContentList}
        options={{ lazy: true }}
      />
    </Stack.Navigator>
  );
};

export default L2CoursesStack;
