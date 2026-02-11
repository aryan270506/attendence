import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { useEffect } from "react";
import api from "../../src/utils/axios";


export default function LabAttendance({ navigation }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [recentLabs, setRecentLabs] = useState([]);
  const [labs, setLabs] = useState([]);

  const handleSubmit = async () => {
  if (!selectedClass || !selectedSection || !selectedBatch || !selectedSubject) {
    alert("Please select Year, Division, Batch and Subject");
    return;
  }

  try {
    const teacherId = await AsyncStorage.getItem("teacherId");

    console.log("🧪 Creating lab session", {
      teacherId,
      year: selectedClass,
      division: selectedSection,
      batch: selectedBatch,
      subject: selectedSubject.subject,
    });

    const res = await api.post("/api/lab-attendance/session/create", {
      teacherId,
      year: selectedClass,
      division: selectedSection,
      batch: selectedBatch,
      subject: selectedSubject.subject,
    });

    const { sessionId, expiresAt } = res.data;

    console.log("✅ Lab session created:", sessionId);

    navigation.navigate("LabAttendanceQRScreen", {
      sessionId,               // 🔥 IMPORTANT
      year: selectedClass,
      division: selectedSection,
      batch: selectedBatch,
      subject: selectedSubject.subject,
      expiresAt,
    });
  } catch (err) {
    console.error("❌ Failed to create lab session", err);
    alert("Failed to start lab attendance");
  }
};


  useFocusEffect(
    useCallback(() => {
      loadRecentLabs();
    }, [])
  );

  useEffect(() => {
    fetchTeacherLabs();
  }, []);

  const fetchTeacherLabs = async () => {
  try {
    const teacherId = await AsyncStorage.getItem("teacherId");

    if (!teacherId) {
      console.warn("⚠️ No teacherId found in storage");
      return;
    }

    console.log("🧪 Fetching labs for", teacherId);

    const res = await api.get(`/api/teacher/labs/${teacherId}`);

    console.log("🧪 LAB API RESPONSE:", res.data);

    setLabs(res.data.labs || []);
  } catch (err) {
    console.error("❌ Failed to fetch labs:", err);
  }
};


useEffect(() => {
  fetchTeacherLabs();
}, []);

useEffect(() => {
  AsyncStorage.getItem("teacherId").then(v =>
    console.log("🧠 RAW teacherId from storage:", v)
  );
}, []);




 const loadRecentLabs = async () => {
  try {
    const teacherId = await AsyncStorage.getItem("teacherId");
    if (!teacherId) return;

    console.log("📋 Fetching recent lab sessions for", teacherId);

    const res = await api.get(
      `/api/lab-attendance/teacher/${teacherId}/recent`
    );

    setRecentLabs(res.data.sessions || []);
  } catch (err) {
    console.error("❌ Failed to load recent labs", err);
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Lab Attendance</Text>
        <Text style={styles.subtitle}>
          Select Lab & Batch (Assigned to You)
        </Text>

        {/* ================= LAB SUBJECT ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Assigned Labs</Text>

          {labs.length === 0 ? (
            <Text style={{ color: "#64748b" }}>No labs assigned by admin</Text>
          ) : (
            <View style={styles.subjectGrid}>
              {labs.map((lab, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.subjectButton,
                    selectedSubject?.subject === lab.subject &&
                      styles.selectedButton,
                  ]}
                  onPress={() => {
                    setSelectedSubject(lab);
                    setSelectedClass(lab.year);
                    setSelectedSection(lab.division);
                    setSelectedBatch(null);
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      selectedSubject?.subject === lab.subject &&
                        styles.selectedButtonText,
                    ]}
                  >
                    {lab.subject}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        selectedSubject?.subject === lab.subject
                          ? "#fff"
                          : "#64748b",
                      marginTop: 4,
                    }}
                  >
                    Year {lab.year} • Div {lab.division}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ================= BATCH ================= */}
        {selectedSubject && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Batch</Text>

            <View style={styles.batchGrid}>
              {Object.values(selectedSubject.batches).map((batch) => (
                <TouchableOpacity
                  key={batch}
                  style={[
                    styles.batchButton,
                    selectedBatch === batch && styles.selectedButton,
                  ]}
                  onPress={() => setSelectedBatch(batch)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      selectedBatch === batch && styles.selectedButtonText,
                    ]}
                  >
                    {batch}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ================= SUMMARY ================= */}
        {selectedSubject && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionLabel}>Your Selection</Text>

            <View style={styles.selectionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subject:</Text>
                <Text style={styles.detailValue}>
                  {selectedSubject.subject}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Year:</Text>
                <Text style={styles.detailValue}>{selectedClass}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Division:</Text>
                <Text style={styles.detailValue}>{selectedSection}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Batch:</Text>
                <Text style={styles.detailValue}>
                  {selectedBatch || "Not selected"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= SUBMIT ================= */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedSubject || !selectedBatch) && {
              opacity: 0.5,
            },
          ]}
          disabled={!selectedSubject || !selectedBatch}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Confirm Lab Attendance</Text>
        </TouchableOpacity>

        {/* ================= RECENT LABS ================= */}
        {recentLabs.length > 0 && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>RECENT LABS</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.recentsGrid}>
              {recentLabs.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentCard}
                  onPress={() =>
                    navigation.navigate("EditLabAttendanceScreen", {
                      session: item,
                    })
                  }
                >
                  <View>
                    <Text style={styles.recentClass}>
                      Year {item.year} • {item.batch}
                    </Text>

                    <Text style={styles.recentSub}>{item.subject}</Text>
                  </View>

                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 20, paddingBottom: 60 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 15,
  },
  subjectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  subjectButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c7d2fe",
    backgroundColor: "#eef2ff",
  },
  batchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  batchButton: {
    minWidth: "30%",
    backgroundColor: "#e2e8f0",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  selectedButton: { backgroundColor: "#4f46e5" },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  selectedButtonText: { color: "#ffffff" },
  selectionInfo: {
    backgroundColor: "#eef2ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  selectionLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  selectionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4f46e5",
  },
  submitButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
  },
  recentsGrid: {
    gap: 12,
  },
  recentCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recentClass: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  recentSub: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  editText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
  },
});