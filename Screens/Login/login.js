import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket } from '../../src/services/socket';
import api from "../../src/utils/axios";

export default function LoginScreen({ navigation }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginId || !password) {
      alert("Please enter Login ID and Password");
      return;
    }

    setIsLoading(true);

    // ================= ADMIN LOGIN =================
    try {
      const res = await api.post("/api/auth/admin/login", {
        id: loginId,
        password
      });

      if (res.data.success) {
        const admin = res.data;

        await AsyncStorage.setItem("userType", "admin");
        await AsyncStorage.setItem("adminId", admin.id);

        connectSocket({
          userId: admin.id,
          role: "admin"
        });

        await api.post("/api/users/login", {
          userId: admin.id,
          role: "admin"
        });

        setIsLoading(false);
        navigation.replace("AdminDashboard");
        return;
      }
    } catch (err) {}

    // ================= TEACHER LOGIN =================
    try {
      const res = await api.post("/api/auth/teacher/login", {
        id: loginId,
        password
      });

      if (res.data.success) {
        const teacher = res.data;

        await AsyncStorage.setItem("userType", "teacher");
        await AsyncStorage.setItem("teacherId", teacher.id);

        connectSocket({
          userId: teacher.id,
          role: "teacher"
        });

        await api.post("/api/users/login", {
          userId: teacher.id,
          role: "teacher"
        });

        setIsLoading(false);
        navigation.replace("TeacherDashboard", {
          teacherData: teacher
        });
        return;
      }
    } catch (err) {}

     // ================= PARENT LOGIN =================
  try {
    const res = await api.post("/api/auth/parent-login", {
  id: loginId,
  password
});

if (res.data.success) {
  const parent = res.data.parent;

  await AsyncStorage.setItem("userType", "parent");
  await AsyncStorage.setItem("parentId", parent.id);

  connectSocket({
    userId: parent.id,
    role: "parent"
  });

  await api.post("/api/users/login", {
    userId: parent.id,
    role: "parent"
  });

  navigation.replace("ParentAttendanceScreen", {
    parentData: parent
  });
  return;
}


    if (res.data.success) {
      const parent = res.data;

      await AsyncStorage.setItem("userType", "parent");
      await AsyncStorage.setItem("parentId", parent.id);

      connectSocket({ userId: parent.id, role: "parent" });
      await api.post("/api/users/login", { userId: parent.id, role: "parent" });

      setIsLoading(false);
      navigation.replace("ParentAttendanceScreen", {
        parentData: parent
      });
      return;
    }
  } catch (err) {}

    // ================= STUDENT LOGIN =================
    try {
      const res = await api.post("/api/auth/student/login", {
        id: loginId,
        password
      });

      if (res.data.success) {
        const student = res.data;

        await AsyncStorage.setItem("userType", "student");
        await AsyncStorage.setItem("studentId", student.id);
        await AsyncStorage.setItem("studentYear", String(student.year));
        await AsyncStorage.setItem("studentDivision", String(student.division));

        connectSocket({
          userId: student.id,
          role: "student"
        });

        await api.post("/api/users/login", {
          userId: student.id,
          role: "student"
        });

        setIsLoading(false);
        navigation.replace("StudentDashboard", {
          studentData: student
        });
        return;
      }
    } catch (err) {}

    // ❌ INVALID CREDENTIALS
    setIsLoading(false);
    alert("Invalid credentials ❌");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#1e3c72', '#2a5298', '#7e22ce']} style={{ flex: 1 }}>
          
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.shadowWrapper}>
              <View style={styles.logoCircle}>
                <Image
                  source={{ uri: 'https://www.sguk.ac.in/assets/images/banner-image/new-banner-image1.png' }}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </View>
            </View>
            <Text style={styles.collegeName}>Sanjay Ghodawat University 🎓</Text>
            <Text style={styles.subtitle}>Attendance Management System</Text>
            <Text style={styles.tagline}>"Scan to be Counted...."</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.loginText}>Login to your account</Text>

            {/* Login ID */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Login ID</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your ID"
                  placeholderTextColor="#a0aec0"
                  value={loginId}
                  onChangeText={setLoginId}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#a0aec0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={isLoading ? ['#9333ea', '#c084fc'] : ['#7e22ce', '#a855f7']}
                style={styles.loginButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>LOGIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Developer */}
            <View style={styles.developerBadge}>
              <Text style={styles.developerText}>Developed by</Text>
              <LinearGradient
                colors={['#7e22ce', '#a855f7', '#ec4899']}
                style={styles.badgeGradient}
              >
                <Text style={styles.badgeText}>⚡ Catalyst Coders</Text>
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 60,
  },
  shadowWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#00000060',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 40,
  },
  collegeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  loginText: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1e293b',
  },
  eyeIcon: {
    padding: 12,
  },
  eyeText: {
    fontSize: 20,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#7e22ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  developerBadge: {
    marginTop: 10,
    alignItems: 'center',
  },
  developerText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
  },
  badgeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#7e22ce',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});