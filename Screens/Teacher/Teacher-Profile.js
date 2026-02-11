import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { disconnectSocket } from "../../src/services/socket";
import api from "../../src/utils/axios";
import { Platform } from "react-native";

export default function TeacherProfile() {
  const navigation = useNavigation();

  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      
      // Get teacher ID from AsyncStorage (stored during login)
      const teacherId = await AsyncStorage.getItem('teacherId');
      
      if (!teacherId) {
        setError("Teacher ID not found. Please login again.");
        setLoading(false);
        return;
      }

      console.log("📘 Fetching teacher profile for ID:", teacherId);

      // ✅ FETCH FROM MONGODB API
      const response = await api.get(`/api/teacher/me/${teacherId}`);
      
      if (response.data) {
        console.log("✅ Teacher data loaded:", response.data);
        setTeacherData(response.data);
        setError(null);
      } else {
        setError("Teacher data not found");
      }
    } catch (err) {
      console.error("❌ Error fetching teacher data:", err);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const logoutTeacher = async () => {
    try {
      console.log(`🚪 TEACHER logging out: ${teacherData?.id}`);

      // 🔌 Disconnect socket safely
      try {
        disconnectSocket();
      } catch (e) {
        console.log("Socket disconnect error (ignored):", e);
      }

      // 🧹 Clear local session
      await AsyncStorage.multiRemove([
        "teacherId",
        "userType",
      ]);

      // 🔁 FORCE navigation
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );

      // 🔥 Inform backend (non-blocking)
      api.post("/api/users/logout", {
        userId: teacherData?.id,
      }).catch(() => {});

    } catch (err) {
      console.error("Teacher logout fatal error:", err);

      // 🚨 absolute fallback
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    }
  };

  const confirmTeacherLogout = () => {
    if (Platform.OS === "web") {
      // 🌐 Web
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) logoutTeacher();
    } else {
      // 📱 Android / iOS
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: logoutTeacher,
          },
        ]
      );
    }
  };

  const renderDivisions = () => {
    if (!teacherData?.divisions || !Array.isArray(teacherData.divisions)) return null;
    
    return teacherData.divisions.map((division, index) => (
      <View key={index} style={styles.divisionChip}>
        <Text style={styles.divisionText}>Division {division}</Text>
      </View>
    ));
  };

  const renderYears = () => {
    if (!teacherData?.years || !Array.isArray(teacherData.years)) return null;
    
    return teacherData.years.map((year, index) => (
      <View key={index} style={styles.yearChip}>
        <Text style={styles.yearText}>Year {year}</Text>
      </View>
    ));
  };

  const renderSubjects = () => {
    if (!teacherData?.subjects || typeof teacherData.subjects !== 'object') return null;
    
    const subjectYears = Object.keys(teacherData.subjects);
    
    if (subjectYears.length === 0) {
      return <Text style={styles.noDataText}>No subjects assigned</Text>;
    }

    return subjectYears.map((yearKey) => {
      const subjects = teacherData.subjects[yearKey];
      
      if (!Array.isArray(subjects) || subjects.length === 0) return null;

      // Extract year number from key (e.g., "year1" -> "1")
      const yearNumber = yearKey.replace('year', '');

      return (
        <View key={yearKey} style={styles.subjectYearSection}>
          <Text style={styles.subjectYearTitle}>Year {yearNumber} Subjects</Text>
          {subjects.map((subject, index) => (
            <View key={index} style={styles.subjectItem}>
              <Text style={styles.subjectText}>• {subject}</Text>
            </View>
          ))}
        </View>
      );
    });
  };

  const renderCourseCodes = () => {
    if (!teacherData?.course_codes || typeof teacherData.course_codes !== 'object') return null;
    
    const codeYears = Object.keys(teacherData.course_codes);
    
    if (codeYears.length === 0) {
      return <Text style={styles.noDataText}>No course codes assigned</Text>;
    }

    return codeYears.map((yearKey) => {
      const codes = teacherData.course_codes[yearKey];
      
      if (!Array.isArray(codes) || codes.length === 0) return null;

      // Extract year number from key (e.g., "year1" -> "1")
      const yearNumber = yearKey.replace('year', '');

      return (
        <View key={yearKey} style={styles.courseYearSection}>
          <Text style={styles.courseYearTitle}>Year {yearNumber} Course Codes</Text>
          <View style={styles.courseCodesContainer}>
            {codes.map((code, index) => (
              <View key={index} style={styles.courseCodeChip}>
                <Text style={styles.courseCodeText}>{code}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    });
  };

  const renderLabs = () => {
    if (!teacherData?.lab || typeof teacherData.lab !== 'object') return null;
    
    const labNames = Object.keys(teacherData.lab);
    
    if (labNames.length === 0) {
      return <Text style={styles.noDataText}>No labs assigned</Text>;
    }

    return labNames.map((labName, index) => {
      const labInfo = teacherData.lab[labName];
      
      return (
        <View key={index} style={styles.labCard}>
          <Text style={styles.labName}>{labName}</Text>
          {labInfo.course_code && (
            <Text style={styles.labCourseCode}>Course Code: {labInfo.course_code}</Text>
          )}
          {labInfo.year && (
            <Text style={styles.labYear}>Year: {labInfo.year}</Text>
          )}
          {labInfo.sub_divisions && Array.isArray(labInfo.sub_divisions) && (
            <View style={styles.subDivisionsContainer}>
              <Text style={styles.subDivisionsLabel}>Sub-divisions:</Text>
              <View style={styles.subDivisionsChips}>
                {labInfo.sub_divisions.map((subDiv, idx) => (
                  <View key={idx} style={styles.subDivisionChip}>
                    <Text style={styles.subDivisionText}>{subDiv}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTeacherData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Header Section */}
      <LinearGradient colors={['#ffffff', '#ffffff']} style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {teacherData?.name?.charAt(0)?.toUpperCase() || 'T'}
            </Text>
          </View>
        </View>
        <Text style={styles.nameText}>{teacherData?.name || 'Teacher Name'}</Text>
        <Text style={styles.idText}>ID: {teacherData?.id || 'N/A'}</Text>
      </LinearGradient>

      {/* Profile Details Card */}
      <View style={styles.detailsCard}>
        
        {/* Divisions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📚</Text>
            <Text style={styles.sectionTitle}>Divisions</Text>
          </View>
          <View style={styles.chipsContainer}>
            {teacherData?.divisions && teacherData.divisions.length > 0 ? renderDivisions() : (
              <Text style={styles.noDataText}>No divisions assigned</Text>
            )}
          </View>
        </View>

        {/* Years Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={styles.sectionTitle}>Teaching Years</Text>
          </View>
          <View style={styles.chipsContainer}>
            {teacherData?.years && teacherData.years.length > 0 ? renderYears() : (
              <Text style={styles.noDataText}>No years assigned</Text>
            )}
          </View>
        </View>

        {/* Subjects Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📖</Text>
            <Text style={styles.sectionTitle}>Subjects</Text>
          </View>
          {renderSubjects()}
        </View>

        {/* Course Codes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔢</Text>
            <Text style={styles.sectionTitle}>Course Codes</Text>
          </View>
          {renderCourseCodes()}
        </View>

        {/* Labs Section */}
        {teacherData?.lab && Object.keys(teacherData.lab).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🔬</Text>
              <Text style={styles.sectionTitle}>Labs</Text>
            </View>
            {renderLabs()}
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={confirmTeacherLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    color: '#4A90E2',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  nameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  idText: {
    fontSize: 16,
    color: '#413b3b',
    marginBottom: 4,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  divisionChip: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  divisionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  yearChip: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  yearText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  subjectYearSection: {
    marginBottom: 16,
  },
  subjectYearTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  subjectItem: {
    paddingVertical: 6,
  },
  subjectText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  courseYearSection: {
    marginBottom: 16,
  },
  courseYearTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  courseCodesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  courseCodeChip: {
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#D1DCE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  courseCodeText: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '500',
  },
  labCard: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9B59B6',
  },
  labName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 6,
  },
  labCourseCode: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  labYear: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
  },
  subDivisionsContainer: {
    marginTop: 6,
  },
  subDivisionsLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  subDivisionsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subDivisionChip: {
    backgroundColor: '#E8DAEF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  subDivisionText: {
    color: '#7D3C98',
    fontSize: 12,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});