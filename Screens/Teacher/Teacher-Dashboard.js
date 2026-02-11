import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import ClassSectionSelector from './Teacher-Classselection.js';
import TeacherRecord from './Teacher-Record.js';
import TeacherProfile from './Teacher-Profile.js';
import LabAttendance from './Teacher-LabAttendance.js'; // 🔹 create/import this screen

const Tab = createBottomTabNavigator();

const TeacherDashboard = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;

            if (route.name === 'ClassAttendance') iconName = 'how-to-reg';
            else if (route.name === 'LabAttendance') iconName = 'science';
            else if (route.name === 'Records') iconName = 'folder';
            else iconName = 'person';

            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4A90E2',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            height: 80,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            textAlign: 'center',
          },
        })}
      >

        {/* CLASS ATTENDANCE */}
        <Tab.Screen
          name="ClassAttendance"
          component={ClassSectionSelector}
          options={{
            title: 'Class Attendance',
            tabBarLabel: 'Class Attendance',
          }}
        />

        {/* LAB ATTENDANCE */}
        <Tab.Screen
          name="LabAttendance"
          component={LabAttendance}
          options={{
            title: 'Lab Attendance',
            tabBarLabel: 'Lab Attendance',
          }}
        />

        {/* RECORDS */}
        <Tab.Screen
          name="Records"
          component={TeacherRecord}
          options={{
            title: 'Student Records',
            tabBarLabel: 'Student Records',
          }}
        />

        {/* PROFILE */}
        <Tab.Screen
          name="Profile"
          component={TeacherProfile}
          options={{
            title: 'My Profile',
            tabBarLabel: 'My Profile',
          }}
        />

      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default TeacherDashboard;
