import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import DropdownSelect2 from '../../../../../components/DropdownSelect/DropdownSelect2';
import { View } from 'react-native';
import MaterialCard from './MaterialCard';
import { useTranslation } from '../../../../../context/LanguageContext';
import {
  getDataFromStorage,
  getOptionsByCategory,
} from '../../../../../utils/JsHelper/Helper';
import { LearningMaterialAPI } from '../../../../../utils/API/AuthService';
import ActiveLoading from '../../../../LoadingScreen/ActiveLoading';
import globalStyles from '../../../../../utils/Helper/Style';
import GlobalText from '@components/GlobalText/GlobalText';

const LearningMaterial = () => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState(null);
  const [courseTypes, setCourseTypes] = useState([]);
  const [courseSubjectList, setCourseSubjectList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try{
      setLoading(true);
      const boardData = await LearningMaterialAPI();

      const cohortData = JSON.parse((await getDataFromStorage('cohortData')) || 'null');

      console.log('cohortData', JSON.stringify(cohortData));

      const frameworks = boardData?.result?.framework;


      const board = cohortData?.customField.find(
        (item) => item.label === 'BOARD'
      );
      const medium = cohortData?.customField.find(
        (item) => item.label === 'MEDIUM'
      );
      const grade = cohortData?.customField.find(
        (item) => item.label === 'GRADE'
      );

      console.log('board', board);
      console.log('medium', medium);
      console.log('grade', grade);

      // const getStates = getOptionsByCategory(frameworks, 'state');
      // const matchState = getStates.find((item) => item.name === state?.value);

      const getBoards = getOptionsByCategory(frameworks, 'board');
      console.log('getBoards', JSON.stringify(getBoards));

      const matchBoard = getBoards.find(
        (item) => item.name === board?.selectedValues[0]
      );

      const getMedium = getOptionsByCategory(frameworks, 'medium');
      const matchMedium = getMedium.find(
        (item) => item.name === medium?.selectedValues[0]
      );

      const getGrades = getOptionsByCategory(frameworks, 'gradeLevel');
      const matchGrade = getGrades.find(
        (item) => item.name === grade?.selectedValues[0]
      );

      const getCourseTypes = getOptionsByCategory(frameworks, 'courseType');
      // const getCourseTypes = getOptionsByCategory(frameworks, 'board');

      const courseType = getCourseTypes?.map((type) => ({
        label: type.name,
        value: type.name,
      }));
      // const courseTypesAssociations = matchBoard?.map((type) => {
      //   return {
      //     code: type.code,
      //     name: type.name,
      //     associations: type.associations,
      //   };
      // });
      // console.log(
      //   'courseTypesAssociations',
      //   JSON.stringify(courseTypesAssociations)
      // );

      // console.log('getBoards', JSON.stringify(getBoards));
      console.log('matchBoard', matchBoard);

      const commonAssociations = matchBoard?.associations?.filter(
        (assoc) =>
          // matchState?.associations.some((item) => item.code === assoc.code) &&
          matchBoard?.associations.some((item) => item.code === assoc.code) &&
          matchMedium?.associations.some((item) => item.code === assoc.code) &&
          matchGrade?.associations.some((item) => item.code === assoc.code)
      );

      const getSubjects = getOptionsByCategory(frameworks, 'subject');

      const subjectAssociations = commonAssociations
        ?.filter((assoc) =>
          getSubjects.some(
            (item) => assoc.code === item?.code && assoc?.category === 'subject'
          )
        )
        ?.map((assoc) => assoc.name);

      setSubjects(subjectAssociations || []);

      // return {
      //   courseTypeName: courseType?.name,
      //   courseType: courseType?.code,
      //   subjects: subjectAssociations?.map((subject) => subject?.name),
      // };

      // setCourseSubjectList(courseSubjectLists);
      setCourseTypes(courseType);
      }
      catch(error){
        console.log('error======>', error);

      }
      finally{
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // useEffect(() => {
  //   // Find the selected course and update the subjects
  //   const selectedCourse = courseSubjectList.find(
  //     (item) => item.courseTypeName === selectedIds?.label
  //   );

  //   setSubjects(selectedCourse ? selectedCourse.subjects : []);
  // }, [selectedIds]);

  console.log('sub', subjects);

  return loading ? (
    <ActiveLoading />
  ) : (
    <ScrollView style={globalStyles.container}>
      <DropdownSelect2
        field={courseTypes}
        name={'course_type'}
        setSelectedIds={setSelectedIds}
        selectedIds={selectedIds}
        value={''}
      />

      {selectedIds?.value && subjects && (
        <View style={styles.viewbox}>
          {subjects.length > 0 ? (
            subjects.map((item, key) => {
              return (
                <MaterialCard
                  key={key}
                  selectedIds={selectedIds}
                  title={item}
                />
              );
            })
          ) : (
            <GlobalText style={globalStyles.text}>{t('no_data')}</GlobalText>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  viewbox: {
    // borderWidth: 1,
    padding: 15,
    // height: 100,
    borderRadius: 20,
    // paddingBottom: 150,
    marginBottom: 0,
    backgroundColor: '#FBF4E4',
  },
});

export default LearningMaterial;
