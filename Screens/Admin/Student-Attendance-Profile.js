import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import api from "../../src/utils/axios";

export default function StudentRecordTeacher({ route, navigation }) {
  const { studentId, studentName, studentData } = route.params;

  const [subjectAttendance, setSubjectAttendance] = useState([]);
  const [labAttendance, setLabAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [freshStudentData, setFreshStudentData] = useState(studentData);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);

  useEffect(() => {
    fetchFreshStudentData();
  }, []);

  useEffect(() => {
    if (freshStudentData) {
      fetchStudentAttendance();
    }
  }, [freshStudentData]);

  const fetchFreshStudentData = async () => {
  try {
    console.log('🔄 Fetching fresh student data from MongoDB...');

    const response = await api.get(`/api/student/${studentId}`);

    if (response.data) {
      setFreshStudentData(response.data);
    } else {
      setFreshStudentData(studentData);
    }
  } catch (error) {
    console.error('❌ Error fetching student from MongoDB:', error);
    setFreshStudentData(studentData);
  }
};



  // 🔥 HELPER FUNCTION: Extract batch from roll_no
  const extractBatchFromRollNo = (rollNo) => {
    if (!rollNo) {
      console.log('⚠️ No roll_no provided');
      return null;
    }
    
    console.log('🔍 Extracting batch from roll_no:', rollNo);
    
    // Roll no format: "TY-C1-07" or "SY-B2-15"
    const match = rollNo.match(/[A-Z]+-([A-Z]\d+)-\d+/);
    if (match && match[1]) {
      console.log('✅ Extracted batch:', match[1]);
      return match[1]; // Returns "C1", "B2", etc.
    }
    
    console.log('❌ Could not extract batch from roll_no format');
    return null;
  };

  const fetchStudentAttendance = async () => {
    try {
      console.log('📊 Fetching attendance for student:', studentId);
      console.log('📚 Using student data:', freshStudentData);

      // Extract subjects from student data
      const subjectsObj = freshStudentData.subjects || {};
      const subjectsList = Object.values(subjectsObj);

      console.log('📖 Student subjects:', subjectsList);

      if (subjectsList.length === 0) {
        console.log('⚠️ No subjects assigned to student');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Call backend API to get attendance summary
      const response = await api.post('/api/attendance/student-summary', {
        studentId: freshStudentData.id,
        year: Number(freshStudentData.year),
        division: String(freshStudentData.division),
        subjects: subjectsList
      });

      console.log('✅ Attendance data received:', response.data);

      // Format data for display
      const formattedData = response.data.subjects.map((item, index) => ({
        id: String(index + 1),
        subject: item.subject,
        attended: item.present,
        total: item.total,
      }));

      setSubjectAttendance(formattedData);

      // 🔥 FIX: Extract student's batch from roll_no
      const studentBatch = extractBatchFromRollNo(freshStudentData.roll_no);
      
      console.log('🎯 Final extracted batch:', studentBatch);

      // Fetch lab attendance
      const labsObj = freshStudentData.lab || {};
      
      console.log('🧪 Raw lab object:', labsObj);

      if (!studentBatch) {
        console.log('❌ Cannot fetch lab attendance - batch extraction failed');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Convert lab object to array with batch info
      const labsList = Object.values(labsObj)
        .filter(Boolean) // Remove empty values
        .map(labName => ({
          name: labName,
          batch: studentBatch, // 🔥 CRITICAL FIX: Use extracted batch
        }));

      console.log('🧪 Labs list with correct batch:', labsList);
      console.log('🧪 Number of labs:', labsList.length);

      if (labsList.length > 0) {
        try {
          console.log('📤 Sending lab summary request:', {
            studentId: freshStudentData.id || freshStudentData.prn,
            year: Number(freshStudentData.year),
            division: String(freshStudentData.division),
            labs: labsList,
          });

          const labResponse = await api.post(
            "/api/lab-attendance/student-summary",
            {
              studentId: freshStudentData.id || freshStudentData.prn,
              year: Number(freshStudentData.year),
              division: String(freshStudentData.division),
              labs: labsList,
            }
          );

          console.log("✅ Lab summary response:", labResponse.data);

          const formattedLabData = labResponse.data.labs.map(
            (item, index) => ({
              id: String(index + 1),
              lab: item.subject,
              attended: item.present,
              total: item.total,
            })
          );

          console.log('📋 Formatted lab data:', formattedLabData);
          setLabAttendance(formattedLabData);
        } catch (labError) {
          console.error('❌ Error fetching lab attendance:', labError);
          console.log('Lab error details:', labError.response?.data);
        }
      } else {
        console.log('⚠️ No labs found for this student');
      }

    } catch (error) {
      console.error('❌ Error fetching student attendance:', error);
      console.log('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFreshStudentData();
  };

  // Calculate totals
  const totalLectures = subjectAttendance.reduce((sum, s) => sum + s.total, 0);
  const totalAttended = subjectAttendance.reduce((sum, s) => sum + s.attended, 0);
  const overallPercentage = totalLectures > 0 
    ? Math.round((totalAttended / totalLectures) * 100) 
    : 0;

  const getOverallColor = () => {
    if (overallPercentage >= 75) return '#16a34a';
    if (overallPercentage >= 60) return '#f59e0b';
    return '#dc2626';
  };

  const getStatusText = () => {
    if (overallPercentage >= 75) return 'Good Standing ✅';
    if (overallPercentage >= 60) return 'Below Average ⚠️';
    return 'Attendance Shortage ❌';
  };

  const renderItem = ({ item }) => {
    const percentage = item.total > 0 
      ? Math.round((item.attended / item.total) * 100) 
      : 0;

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, styles.subject]}>{item.subject}</Text>
        <Text style={styles.cell}>{item.attended}</Text>
        <Text style={styles.cell}>{item.total}</Text>
        <Text
          style={[
            styles.cell,
            { 
              color: percentage < 75 ? '#dc2626' : '#16a34a', 
              fontWeight: '700' 
            },
          ]}
        >
          {percentage}%
        </Text>
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No Attendance Records</Text>
      <Text style={styles.emptySubtext}>
        Attendance data will appear here once classes are conducted
      </Text>
    </View>
  );

  const renderLabItem = ({ item }) => {
    const percentage = item.total > 0 
      ? Math.round((item.attended / item.total) * 100) 
      : 0;

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, styles.subject]}>{item.lab}</Text>
        <Text style={styles.cell}>{item.attended}</Text>
        <Text style={styles.cell}>{item.total}</Text>
        <Text
          style={[
            styles.cell,
            { 
              color: percentage < 75 ? '#dc2626' : '#16a34a', 
              fontWeight: '700' 
            },
          ]}
        >
          {percentage}%
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Header with Profile Image */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {freshStudentData.image ? (
            <TouchableOpacity
              onPress={() => setImagePreviewVisible(true)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: freshStudentData.image }}
                style={styles.profileImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>👁️</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {studentName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.subtitle}>
              Year {freshStudentData.year} • Division {freshStudentData.division}
            </Text>
            <Text style={styles.prnText}>PRN: {freshStudentData.prn}</Text>
            {freshStudentData.roll_no && (
              <Text style={styles.rollText}>Roll: {freshStudentData.roll_no}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Subject Table */}
      <FlatList
        data={subjectAttendance}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Overall Attendance Card */}
            <View style={styles.overallCard}>
              <Text style={[styles.overallPercentage, { color: getOverallColor() }]}>
                {overallPercentage}%
              </Text>

              <Text style={styles.overallText}>
                Attended {totalAttended} out of {totalLectures} lectures
              </Text>

              <Text style={[styles.statusText, { color: getOverallColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            {/* Subject Table Header */}
            <View style={[styles.row, styles.tableHeader]}>
              <Text style={[styles.cell, styles.subject, styles.headerText]}>
                Subject
              </Text>
              <Text style={[styles.cell, styles.headerText]}>Attended</Text>
              <Text style={[styles.cell, styles.headerText]}>Total</Text>
              <Text style={[styles.cell, styles.headerText]}>%</Text>
            </View>
          </>
        }
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={
          <>
            {/* Lab Section */}
            {labAttendance.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🧪 Lab Attendance</Text>
                
                {/* Lab Table Header */}
                <View style={[styles.row, styles.tableHeader]}>
                  <Text style={[styles.cell, styles.subject, styles.headerText]}>
                    Lab
                  </Text>
                  <Text style={[styles.cell, styles.headerText]}>Attended</Text>
                  <Text style={[styles.cell, styles.headerText]}>Total</Text>
                  <Text style={[styles.cell, styles.headerText]}>%</Text>
                </View>

                {/* Lab Table */}
                {labAttendance.map(item => (
                  <View key={item.id}>
                    {renderLabItem({ item })}
                  </View>
                ))}
              </>
            )}

            {/* Pull to refresh hint */}
            <View style={styles.refreshHint}>
              <Text style={styles.refreshHintText}>
                Pull down to refresh attendance data
              </Text>
            </View>
          </>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#4f46e5']}
          />
        }
      />

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setImagePreviewVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Profile Picture</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setImagePreviewVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              {freshStudentData.image && (
                <Image
                  source={{ uri: freshStudentData.image }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              
              <View style={styles.previewFooter}>
                <Text style={styles.previewStudentName}>{studentName}</Text>
                <Text style={styles.previewStudentInfo}>
                  PRN: {freshStudentData.prn}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  backButton: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  header: {
    marginTop: 8,
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#4f46e5',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4f46e5',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  imageOverlayText: {
    fontSize: 14,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  profileImagePlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  previewHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  previewImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: '#4f46e5',
    marginBottom: 20,
  },
  previewFooter: {
    alignItems: 'center',
    paddingTop: 10,
  },
  previewStudentName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  previewStudentInfo: {
    fontSize: 14,
    color: '#64748b',
  },
  studentInfo: {
    marginLeft: 16,
    flex: 1,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  prnText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  rollText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  overallCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overallPercentage: {
    fontSize: 52,
    fontWeight: 'bold',
  },
  overallText: {
    fontSize: 16,
    color: '#475569',
    marginTop: 6,
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  tableHeader: {
    backgroundColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    textAlign: 'center',
  },
  subject: {
    flex: 2,
    textAlign: 'left',
  },
  headerText: {
    fontWeight: '700',
    color: '#334155',
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  refreshHint: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshHintText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});