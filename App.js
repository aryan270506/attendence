import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';

import LoginScreen from './Screens/Login/login.js';

// Admin Screens
import AdminDashboard from './Screens/Admin/Admin-Dashboard.js';
import AdminClassSectionSelector from './Screens/Admin/Admin-YearSelection.js';
import StudentList from './Screens/Admin/Student-List.js';
import StudentAttendanceProfile from './Screens/Admin/Student-Attendance-Profile.js';
import AdminProfile from './Screens/Admin/Admin-Profile.js';
import ClassAttendanceRecord from './Screens/Admin/Classattendancerecord.js';

// Teacher Screens
import TeacherDashboard from './Screens/Teacher/Teacher-Dashboard.js';
import ClassSectionSelector from './Screens/Teacher/Teacher-Classselection.js';
import AttendanceQRScreen from './Screens/Teacher/Qr-Generator.js';
import StudentListScreen from './Screens/Teacher/Teacher-Record-Studentlist.js';
import StudentRecordTeacher from './Screens/Teacher/Student-Record.js';
import EditAttendanceScreen from './Screens/Teacher/Editattendancescreen.js';
import TeacherProfile from './Screens/Teacher/Teacher-Profile.js';
import LabAttendance from './Screens/Teacher/Teacher-LabAttendance.js';
import LabAttendanceQRScreen from './Screens/Teacher/LabAttendanceQRScreen.js';
import EditLabAttendanceScreen from './Screens/Teacher/EditLabAttendanceScreen.js';

// Student Screens
import Studentdashboard from './Screens/Student/Student-Dashboard.js';
import AttendanceScreen from './Screens/Student/Student-Record.js';
import StudentQRScannerScreen from './Screens/Student/Qr-Scanner.js';
import StudentProfile from './Screens/Student/Student-Profile.js';


// Parent Screens
import ParentAttendanceScreen from './Screens/Parents/ParentDashboard.js';

const Stack = createNativeStackNavigator();

 function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const userType = await AsyncStorage.getItem('userType');

        if (userType === 'admin') {
          setInitialRoute('AdminDashboard');
        } else if (userType === 'teacher') {
          setInitialRoute('TeacherDashboard');
        } else if (userType === 'student') {
          setInitialRoute('StudentDashboard');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.log('Session error:', error);
        setInitialRoute('Login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>

          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

          {/* Dashboards */}
          <Stack.Screen name="StudentDashboard" component={Studentdashboard} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} options={{ headerShown: false }} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />

          {/* Teacher */}
          <Stack.Screen name="ClassSectionSelector" component={ClassSectionSelector} options={{ headerShown: false }} />
          <Stack.Screen name="AttendanceQRScreen" component={AttendanceQRScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StudentListScreen" component={StudentListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StudentRecordTeacher" component={StudentRecordTeacher} options={{ headerShown: false }} />
          <Stack.Screen name="EditAttendanceScreen" component={EditAttendanceScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherProfile" component={TeacherProfile} options={{ headerShown: false }} />
          <Stack.Screen name="LabAttendance" component={LabAttendance} options={{ headerShown: false }} />
          <Stack.Screen name="LabAttendanceQRScreen" component={LabAttendanceQRScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditLabAttendanceScreen" component={EditLabAttendanceScreen} options={{ headerShown: false }} />

          {/* Student */}
          <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StudentQRScannerScreen" component={StudentQRScannerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StudentProfile" component={StudentProfile} options={{ headerShown: false }} />

          {/* Admin */}
          <Stack.Screen name="AdminClassSectionSelector" component={AdminClassSectionSelector} options={{ headerShown: false }} />
          <Stack.Screen name="StudentList" component={StudentList} options={{ headerShown: false }} />
          <Stack.Screen name="StudentAttendanceProfile" component={StudentAttendanceProfile} options={{ headerShown: false }} />
          <Stack.Screen name="AdminProfile" component={AdminProfile} options={{ headerShown: false }} />
          <Stack.Screen name="ClassAttendanceRecord" component={ClassAttendanceRecord} options={{ headerShown: false }} />

          {/* Parent */}
          <Stack.Screen name="ParentAttendanceScreen" component={ParentAttendanceScreen} options={{ headerShown: false }} />

        </Stack.Navigator>

        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}


registerRootComponent(App);
export default App;