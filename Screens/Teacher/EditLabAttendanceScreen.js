import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import api from "../../src/utils/axios";

export default function EditLabAttendanceScreen({ route, navigation }) {
  const { session } = route.params;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 🔒 1 hour edit lock
  const isExpired = Date.now() - session.createdAt > 60 * 60 * 1000;

  useEffect(() => {
    loadLabAttendance();
  }, []);

  const extractRollNumber = (rollNo = "") => {
    const parts = rollNo.split("-");
    return parts[parts.length - 1] || "?";
  };

  const loadLabAttendance = async () => {
    try {
      setLoading(true);

      // 1️⃣ Fetch students from MongoDB
      const studentsRes = await api.get(
        `/api/teacher/students?year=${session.year}&division=${session.division}`
      );

      const allStudents = studentsRes.data || [];

      if (!allStudents.length) {
        Alert.alert("No Students", "No students found for this lab.");
        return;
      }

      // 2️⃣ Fetch present students for lab session
      const sessionRes = await api.get(
        `/api/lab-attendance/session/${session.sessionId}`
      );

      const presentIds = sessionRes.data.presentStudents || [];

      // 3️⃣ Filter by batch + merge status
      const merged = allStudents
        .filter(
          s =>
            s.roll_no &&
            s.roll_no.toUpperCase().includes(session.batch.toUpperCase())
        )
        .map(student => ({
          studentId: student.id,
          rollNo: student.roll_no,
          rollCallNumber: extractRollNumber(student.roll_no),
          status: presentIds.includes(student.id) ? "present" : "absent",
        }));

      setStudents(merged);
    } catch (err) {
      console.error("❌ Load lab attendance error:", err);
      Alert.alert("Error", "Failed to load lab attendance");
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (studentId, isPresent) => {
    if (isExpired) {
      Alert.alert("Edit Locked", "Editing allowed only within 1 hour");
      return;
    }

    try {
      setUpdating(true);

      if (isPresent) {
        await api.post("/api/lab-attendance/manual/remove", {
          sessionId: session.sessionId,
          studentId,
        });
      } else {
        await api.post("/api/lab-attendance/manual/add", {
          sessionId: session.sessionId,
          studentId,
        });
      }

      setStudents(prev =>
        prev.map(s =>
          s.studentId === studentId
            ? { ...s, status: isPresent ? "absent" : "present" }
            : s
        )
      );
    } catch (err) {
      console.error("❌ Toggle failed", err);
      Alert.alert("Error", "Failed to update attendance");
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAllPresent = async () => {
    if (isExpired) return;

    try {
      setUpdating(true);

      for (const s of students) {
        await api.post("/api/lab-attendance/manual/add", {
          sessionId: session.sessionId,
          studentId: s.studentId,
        });
      }

      setStudents(prev => prev.map(s => ({ ...s, status: "present" })));
    } catch {
      Alert.alert("Error", "Failed to mark all present");
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAllAbsent = async () => {
    if (isExpired) return;

    try {
      setUpdating(true);

      for (const s of students) {
        await api.post("/api/lab-attendance/manual/remove", {
          sessionId: session.sessionId,
          studentId: s.studentId,
        });
      }

      setStudents(prev => prev.map(s => ({ ...s, status: "absent" })));
    } catch {
      Alert.alert("Error", "Failed to mark all absent");
    } finally {
      setUpdating(false);
    }
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.studentItem,
        item.status === "present" ? styles.presentItem : styles.absentItem,
        (updating || isExpired) && styles.disabledItem,
      ]}
      onPress={() =>
        toggleAttendance(item.studentId, item.status === "present")
      }
      disabled={updating || isExpired}
      activeOpacity={0.7}
    >
      <View style={styles.rollCircle}>
        <Text
          style={[
            styles.rollText,
            item.status === "present"
              ? styles.presentRollText
              : styles.absentRollText,
          ]}
        >
          {item.rollCallNumber}
        </Text>
      </View>
      <Text style={styles.statusIndicator}>
        {item.status === "present" ? "✓" : "✗"}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Lab Attendance</Text>
        <Text style={styles.headerSubtitle}>
          {session.year} - {session.division} ({session.batch})
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, isExpired && styles.disabledButton]}
          onPress={handleMarkAllPresent}
          disabled={isExpired}
        >
          <Text style={styles.quickActionText}>Mark All Present</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickActionButton,
            styles.quickActionButtonSecondary,
            isExpired && styles.disabledButton,
          ]}
          onPress={handleMarkAllAbsent}
          disabled={isExpired}
        >
          <Text style={styles.quickActionTextSecondary}>Mark All Absent</Text>
        </TouchableOpacity>
      </View>

      {/* 5 Column Grid */}
      <FlatList
        data={students}
        keyExtractor={item => item.studentId}
        renderItem={renderStudentItem}
        numColumns={5}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isExpired && styles.disabledButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.saveButtonText}>
            {isExpired ? "Edit Locked" : "Done"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  /* ================= HEADER ================= */
  header: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
  },
  backButtonText: {
    alignSelf: "flex-start",
    fontSize: 16,
    color: "#4f46e5",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },

  /* ================= QUICK ACTIONS ================= */
  quickActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionButtonSecondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quickActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  quickActionTextSecondary: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },

  /* ================= GRID ================= */
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  studentItem: {
    width: 60,
    height: 75,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    padding: 8,
  },
  presentItem: {
    backgroundColor: "#dcfce7",
    borderWidth: 2,
    borderColor: "#86efac",
  },
  absentItem: {
    backgroundColor: "#fee2e2",
    borderWidth: 2,
    borderColor: "#fca5a5",
  },
  disabledItem: {
    opacity: 0.5,
  },

  /* ================= ROLL CIRCLE ================= */
  rollCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  rollText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  presentRollText: {
    color: "#16a34a",
  },
  absentRollText: {
    color: "#dc2626",
  },
  statusIndicator: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#334155",
  },

  /* ================= SAVE BUTTON ================= */
  saveButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  saveButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

