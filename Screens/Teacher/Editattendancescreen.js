import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import api from "../../src/utils/axios";

export default function EditAttendanceScreen({ route, navigation }) {
  const { sessionId, className, sectionName, date } = route.params;
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load attendance data on mount
  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      setLoading(true);

      // 1️⃣ Extract year from className
      const year =
        className.startsWith("1") ? 1 :
        className.startsWith("2") ? 2 :
        className.startsWith("3") ? 3 : 4;

      // 2️⃣ Extract division
      const division = sectionName.split(" ")[1];

      console.log("📘 Loading attendance:", { year, division, sessionId });

      // 3️⃣ FETCH STUDENTS FROM MONGODB
      const studentsRes = await api.get(
        `/api/teacher/students?year=${year}&division=${division}`
      );

      const allStudents = studentsRes.data;

      if (!allStudents.length) {
        Alert.alert("No Students", "No students found for this class.");
        setLoading(false);
        return;
      }

      // 4️⃣ FETCH PRESENT STUDENTS FROM SESSION
      const sessionRes = await api.get(
        `/api/attendance/session/${sessionId}`
      );

      const presentIds = sessionRes.data.presentStudents || [];
      console.log("✅ Present student IDs:", presentIds);

      // 5️⃣ MERGE DATA WITH PROPER ROLL NUMBER EXTRACTION
      const merged = allStudents.map(student => {
        // Get roll_no from student data
        const fullRollNo = student.roll_no || "";
        
        // Extract just the number from roll_no (e.g., "SY-B2-28" → "28")
        let rollCallNumber = "?";
        if (fullRollNo) {
          const parts = fullRollNo.split("-");
          rollCallNumber = parts[parts.length - 1] || "?";
        }

        console.log(`Student ${student.name}: full=${fullRollNo}, extracted=${rollCallNumber}`);

        return {
          studentId: student.id,
          name: student.name,
          rollNo: fullRollNo,           // Keep full roll number for reference
          rollCallNumber: rollCallNumber, // Just the number for display
          status: presentIds.includes(student.id) ? "present" : "absent",
        };
      });

      console.log("📊 Merged students:", merged.length);
      setStudents(merged);
      
    } catch (err) {
      console.error("❌ Load attendance error:", err);
      Alert.alert("Error", "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual student attendance
  const toggleAttendance = async (studentId, isPresent) => {
    try {
      console.log(`🔄 Toggling attendance for student ${studentId}, currently ${isPresent ? 'present' : 'absent'}`);
      
      setUpdating(true);

      if (isPresent) {
        // Make absent
        await api.post("/api/attendance/manual/remove", {
          sessionId,
          studentId,
        });
        console.log(`✅ Marked ${studentId} as absent`);
      } else {
        // Make present
        await api.post("/api/attendance/manual/add", {
          sessionId,
          studentId,
        });
        console.log(`✅ Marked ${studentId} as present`);
      }

      // Update UI instantly - ONLY for this specific student
      setStudents(prev =>
        prev.map(s => {
          if (s.studentId === studentId) {
            console.log(`Updating student ${studentId} from ${s.status} to ${isPresent ? "absent" : "present"}`);
            return { ...s, status: isPresent ? "absent" : "present" };
          }
          return s; // Return unchanged for all other students
        })
      );

    } catch (err) {
      console.error("❌ Toggle attendance error:", err);
      Alert.alert("Error", `Failed to update attendance: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Mark all students present
  const handleMarkAllPresent = async () => {
    try {
      if (students.length === 0) {
        Alert.alert("No Students", "No students to mark present.");
        return;
      }

      setUpdating(true);

      const studentIds = students.map(s => s.studentId);

      await api.post("/api/attendance/manual/mark-all-present", {
        sessionId,
        studentIds,
      });

      // Update UI after DB success
      setStudents(prev =>
        prev.map(s => ({ ...s, status: "present" }))
      );

      Alert.alert("Success", "All students marked present");
      console.log(`✅ Marked all ${studentIds.length} students present`);
    } catch (err) {
      console.error("❌ Mark all present error:", err);
      Alert.alert("Error", `Failed to mark all present: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Mark all students absent
  const handleMarkAllAbsent = async () => {
    try {
      if (students.length === 0) {
        Alert.alert("No Students", "No students to mark absent.");
        return;
      }

      setUpdating(true);

      await api.post("/api/attendance/manual/mark-all-absent", {
        sessionId,
      });

      // Update UI after DB success
      setStudents(prev =>
        prev.map(s => ({ ...s, status: "absent" }))
      );

      Alert.alert("Success", "All students marked absent");
      console.log(`✅ Marked all students absent`);
    } catch (err) {
      console.error("❌ Mark all absent error:", err);
      Alert.alert("Error", `Failed to mark all absent: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Get present count
  const getPresentCount = () => {
    return students.filter(s => s.status === 'present').length;
  };

  // Get absent count
  const getAbsentCount = () => {
    return students.filter(s => s.status === 'absent').length;
  };

  // Handle save
  const handleSave = () => {
    Alert.alert(
      'Attendance Saved',
      'All changes have been automatically saved to the system.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Render student item for 5-column grid
  const renderStudentItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.studentItem,
        item.status === 'present' ? styles.presentItem : styles.absentItem,
        updating && styles.disabledItem,
      ]}
      onPress={() => {
        console.log(`👆 Tapped on student ${item.studentId} (${item.name}) - Roll: ${item.rollCallNumber}`);
        toggleAttendance(item.studentId, item.status === "present");
      }}
      disabled={updating}
      activeOpacity={0.7}
    >
      <View style={styles.rollCircle}>
        <Text style={[
          styles.rollText,
          item.status === 'present' ? styles.presentRollText : styles.absentRollText,
        ]}>
          {item.rollCallNumber}
        </Text>
      </View>
      <Text style={styles.statusIndicator}>
        {item.status === 'present' ? '✓' : '✗'}
      </Text>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Edit Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {className} - {sectionName}
          </Text>
          {date && <Text style={styles.dateText}>{date}</Text>}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{students.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, styles.presentBox]}>
          <Text style={[styles.statNumber, styles.presentText]}>{getPresentCount()}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={[styles.statBox, styles.absentBox]}>
          <Text style={[styles.statNumber, styles.absentText]}>{getAbsentCount()}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#dcfce7' }]} />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#fee2e2' }]} />
          <Text style={styles.legendText}>Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendText}>Tap roll number to toggle</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, updating && styles.disabledButton]}
          onPress={handleMarkAllPresent}
          disabled={updating}
        >
          <Text style={styles.quickActionText}>
            {updating ? "Updating..." : "Mark All Present"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, styles.quickActionButtonSecondary, updating && styles.disabledButton]}
          onPress={handleMarkAllAbsent}
          disabled={updating}
        >
          <Text style={styles.quickActionTextSecondary}>
            {updating ? "Updating..." : "Mark All Absent"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5-Column Student Grid */}
      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.studentId}
        numColumns={5}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No students found</Text>
          </View>
        )}
      />

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, updating && styles.disabledButton]}
          onPress={handleSave}
          disabled={updating}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {updating ? "Saving..." : "Done"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBox: {
    alignItems: 'center',
  },
  presentBox: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
  },
  absentBox: {
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  presentText: {
    color: '#16a34a',
  },
  absentText: {
    color: '#dc2626',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionTextSecondary: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  studentItem: {
    width: 60,
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 8,
  },
  presentItem: {
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#86efac',
  },
  absentItem: {
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#fca5a5',
  },
  disabledItem: {
    opacity: 0.5,
  },
  rollCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  rollText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  presentRollText: {
    color: '#16a34a',
  },
  absentRollText: {
    color: '#dc2626',
  },
  statusIndicator: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});