import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/utils/axios';

const StudentList = ({ route, navigation }) => {
  const { className, sectionName, year, division } = route.params;
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date range states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceType, setAttendanceType] = useState('theory'); // 'theory' or 'lab'
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [dateSelectionStep, setDateSelectionStep] = useState('start'); // 'start' or 'end'

  useEffect(() => {
    fetchStudents();
  }, [year, division]);

  useEffect(() => {
    if (showDatePicker) {
      fetchAvailableDates();
    }
  }, [showDatePicker, attendanceType]);

  const getRollNumber = (rollNo) => {
    if (!rollNo) return '--';
    const parts = rollNo.split('-');
    return parts[parts.length - 1];
  };

  const fetchStudents = async () => {
  setLoading(true);

  try {
    console.log('📊 Fetching students from MongoDB:', { year, division });

    const response = await api.get("/api/admin/students", {
      params: { year, division },
    });

    if (!response.data.success) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const studentsList = response.data.students.map((student) => ({
      id: student._id,
      name: student.name,
      email: student.email,
      studentId: student.id,
      prn: student.prn,
      subjects: student.subjects,
      year: student.year,
      division: student.division,
      rollNo: student.roll_no,
      batch: student.batch,
    }));

    console.log(`✅ Found ${studentsList.length} students`);
    setStudents(studentsList);
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    setStudents([]);
  } finally {
    setLoading(false);
  }
};


  const fetchAvailableDates = async () => {
    try {
      console.log('📅 Fetching available dates for:', { year, division, attendanceType });
      
      let dates = [];

      if (attendanceType === 'theory') {
        // ✅ FIXED: Directly fetch theory attendance sessions
        const response = await api.get('/api/attendance/sessions', {
          params: { year, division }
        });
        
        console.log('✅ Theory sessions fetched:', response.data.sessions?.length || 0);
        
        if (response.data.sessions && response.data.sessions.length > 0) {
          dates = response.data.sessions
            .map(session => new Date(session.createdAt).toDateString())
            .filter((date, index, self) => self.indexOf(date) === index)
            .sort((a, b) => new Date(b) - new Date(a));
        }
          
      } else {
        // ✅ Fetch lab attendance sessions
        const response = await api.get('/api/lab-attendance/sessions', {
          params: { year, division }
        });
        
        console.log('✅ Lab sessions fetched:', response.data.sessions?.length || 0);
        
        if (response.data.sessions && response.data.sessions.length > 0) {
          dates = response.data.sessions
            .map(session => new Date(session.createdAt).toDateString())
            .filter((date, index, self) => self.indexOf(date) === index)
            .sort((a, b) => new Date(b) - new Date(a));
        }
      }

      console.log(`✅ Found ${dates.length} unique dates`);
      setAvailableDates(dates);
      
    } catch (error) {
      console.error('❌ Error fetching available dates:', error);
      console.log('⚠️ No sessions available for this class');
      
      // Set empty array to show "No dates available" message
      setAvailableDates([]);
    }
  };

  const handleDateSelection = (date) => {
    if (dateSelectionStep === 'start') {
      setSelectedStartDate(date);
      setDateSelectionStep('end');
    } else {
      // Ensure end date is after start date
      if (new Date(date) < new Date(selectedStartDate)) {
        alert('End date must be after start date');
        return;
      }
      setSelectedEndDate(date);
      setDateSelectionStep('start');
    }
  };

  const resetDateSelection = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setDateSelectionStep('start');
  };

  const applyDateFilter = () => {
    if (!selectedStartDate || !selectedEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    setShowDatePicker(false);
    
    // Navigate to class attendance record with date range
    navigation.navigate('ClassAttendanceRecord', {
      year,
      division,
      className,
      sectionName,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      attendanceType,
    });
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStudent = ({ item }) => (
    <TouchableOpacity 
      onPress={() =>
        navigation.navigate("StudentAttendanceProfile", {
          studentName: item.name,
          studentId: item.studentId,
          studentData: item,
        })
      }
      style={styles.studentCard} 
      activeOpacity={0.7}
    >
      <View style={styles.studentRow}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {getRollNumber(item.rollNo)}
          </Text>
        </View>

        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentId}>ID: {item.studentId}</Text>
          {item.prn && <Text style={styles.studentPrn}>PRN: {item.prn}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{className} - {sectionName}</Text>
        <Text style={styles.headerSubtitle}>
          {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Attendance Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            attendanceType === 'theory' && styles.toggleButtonActive
          ]}
          onPress={() => setAttendanceType('theory')}
        >
          <Text style={[
            styles.toggleText,
            attendanceType === 'theory' && styles.toggleTextActive
          ]}>
            📚 Theory
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            attendanceType === 'lab' && styles.toggleButtonActive
          ]}
          onPress={() => setAttendanceType('lab')}
        >
          <Text style={[
            styles.toggleText,
            attendanceType === 'lab' && styles.toggleTextActive
          ]}>
            🧪 Lab
          </Text>
        </TouchableOpacity>
      </View>

      {/* Class Record Buttons */}
      <View style={styles.classRecordContainer}>
        <TouchableOpacity
          style={styles.classRecordButton}
          onPress={() =>
            navigation.navigate('ClassAttendanceRecord', {
              year,
              division,
              className,
              sectionName,
              attendanceType,
            })
          }
        >
          <Text style={styles.classRecordButtonText}>
            📊 View All {attendanceType === 'theory' ? 'Theory' : 'Lab'} Records
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.classRecordButton, styles.dateRangeButton]}
          onPress={() => {
            resetDateSelection();
            setShowDatePicker(true);
          }}
        >
          <Text style={styles.classRecordButtonText}>
            📅 Filter by Date Range
          </Text>
        </TouchableOpacity>

        {selectedStartDate && selectedEndDate && (
          <View style={styles.selectedRangeContainer}>
            <Text style={styles.selectedRangeText}>
              {formatDate(selectedStartDate)} → {formatDate(selectedEndDate)}
            </Text>
            <TouchableOpacity onPress={resetDateSelection}>
              <Text style={styles.clearRangeText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No students match your search' : 'No students found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateStepIndicator}>
              <Text style={styles.dateStepText}>
                {dateSelectionStep === 'start' 
                  ? '1️⃣ Select Start Date' 
                  : '2️⃣ Select End Date'}
              </Text>
            </View>

            <ScrollView style={styles.dateList}>
              {availableDates.length === 0 ? (
                <View style={styles.emptyDatesContainer}>
                  <Text style={styles.emptyDatesText}>
                    No attendance sessions found for this class
                  </Text>
                </View>
              ) : (
                availableDates.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateItem,
                      (selectedStartDate === date || selectedEndDate === date) && 
                        styles.dateItemSelected
                    ]}
                    onPress={() => handleDateSelection(date)}
                  >
                    <Text style={[
                      styles.dateItemText,
                      (selectedStartDate === date || selectedEndDate === date) && 
                        styles.dateItemTextSelected
                    ]}>
                      {formatDate(date)}
                    </Text>
                    
                    {selectedStartDate === date && (
                      <Text style={styles.dateBadge}>Start</Text>
                    )}
                    {selectedEndDate === date && (
                      <Text style={styles.dateBadge}>End</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetDateSelection}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.applyButton,
                  (!selectedStartDate || !selectedEndDate) && styles.applyButtonDisabled
                ]}
                onPress={applyDateFilter}
                disabled={!selectedStartDate || !selectedEndDate}
              >
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StudentList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4f46e5',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
  },
  listContainer: {
    padding: 20,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  studentInfo: {
    flex: 1,
  },
  classRecordContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  classRecordButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  dateRangeButton: {
    backgroundColor: '#10b981',
  },
  classRecordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  selectedRangeContainer: {
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedRangeText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
  },
  clearRangeText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  studentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  studentId: {
    fontSize: 13,
    color: '#6b7280',
  },
  studentPrn: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '300',
  },
  dateStepIndicator: {
    backgroundColor: '#eef2ff',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
  },
  dateStepText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    textAlign: 'center',
  },
  dateList: {
    maxHeight: 400,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  dateItemSelected: {
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  dateItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  dateItemTextSelected: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  dateBadge: {
    backgroundColor: '#4f46e5',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyDatesContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDatesText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});