import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import api from "../../src/utils/axios";




export default function TeacherRecord({ navigation }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [recentClasses, setRecentClasses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
const [selectedSubject, setSelectedSubject] = useState(null);
const [teacherFullData, setTeacherFullData] = useState(null);


  // Load recent classes when component mounts
  useEffect(() => {
  fetchTeacherData();
}, []);

useFocusEffect(
  useCallback(() => {
    loadRecentClasses(); // 🔥 reload every time screen opens
  }, [])
);


  // Fetch teacher's assigned years and divisions from Firebase
  const fetchTeacherData = async () => {
  try {
    setLoading(true);

    const teacherId = await AsyncStorage.getItem("teacherId");

    if (!teacherId) {
      Alert.alert("Error", "Teacher ID not found. Please login again.");
      navigation.replace("LoginScreen");
      return;
    }

    // 🔥 FETCH FROM MONGODB BACKEND
    const response = await api.get(`/api/teacher/me/${teacherId}`);
    const teacherData = response.data;

    setTeacherFullData(teacherData);

    // Years → UI labels
    const yearLabels = (teacherData.years || []).map(year =>
      year === 1 ? "1st Year" :
      year === 2 ? "2nd Year" :
      year === 3 ? "3rd Year" : "4th Year"
    );
    setClasses(yearLabels);

    // Divisions → UI labels
    const divisionLabels = (teacherData.divisions || []).map(
      div => `Div ${div}`
    );
    setSections(divisionLabels);

  } catch (error) {
    console.error("❌ Error fetching teacher data:", error);
    Alert.alert("Error", "Failed to load teacher data.");
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
  if (!selectedClass || !teacherFullData) return;

  // Convert "1st Year" → year1
  const yearKey = selectedClass.startsWith("1")
    ? "year1"
    : selectedClass.startsWith("2")
    ? "year2"
    : selectedClass.startsWith("3")
    ? "year3"
    : "year4";

  const yearSubjects = teacherFullData.subjects?.[yearKey] || [];

  setSubjects(yearSubjects);
  setSelectedSubject(null); // reset on year change
}, [selectedClass]);


  // Load recent classes from database (last 1 hour)
const loadRecentClasses = async () => {
  try {
    const teacherId = await AsyncStorage.getItem("teacherId");
    console.log("📱 Loading recent classes for teacher:", teacherId);
    
    if (!teacherId) {
      console.log("⚠️ No teacherId found");
      return;
    }

    // 🔥 FETCH FROM DATABASE INSTEAD OF ASYNCSTORAGE
    console.log(`🔍 Fetching: /api/attendance/teacher/${teacherId}/recent`);
    const response = await api.get(`/api/attendance/teacher/${teacherId}/recent`);
    console.log("✅ Response received:", response.data);
    
    const sessions = response.data.sessions;

    // Convert to display format
    const formatted = sessions.map(session => {
      // Convert year number to label (1 → "1st Year")
      const yearLabel =
        session.year === 1 ? "1st Year" :
        session.year === 2 ? "2nd Year" :
        session.year === 3 ? "3rd Year" : "4th Year";

      return {
        sessionId: session.sessionId,
        className: yearLabel,
        sectionName: `Div ${session.division}`,
        subjectName: session.subject,
        timestamp: session.createdAt,
        presentCount: session.presentCount,
      };
    });

    console.log("📊 Formatted recent classes:", formatted);
    setRecentClasses(formatted);
  } catch (err) {
    console.log("❌ Error loading recent classes:", err.message);
    console.log("Error details:", err.response?.data || err);
  }
};




const handleSubmit = async () => {
  if (!selectedClass || !selectedSection || !selectedSubject) {
    Alert.alert(
      "Incomplete Selection",
      "Please select Year, Division, and Subject",
      [{ text: "OK" }]
    );
    return;
  }

  try {
    const teacherId = await AsyncStorage.getItem("teacherId");

    // 🔥 convert "1st Year" → 1
    const year =
      selectedClass.startsWith("1") ? 1 :
      selectedClass.startsWith("2") ? 2 :
      selectedClass.startsWith("3") ? 3 : 4;

    const division = selectedSection.split(" ")[1];

    // 📡 CREATE SESSION IN BACKEND
    const response = await api.post("/api/attendance/session/create", {
      teacherId,
      year,
      division,
      subject: selectedSubject,
    });

    const { sessionId } = response.data;

    console.log("📘 Attendance session created:", sessionId);

    // ➡️ GO TO QR SCREEN WITH SESSION ID
    navigation.navigate("AttendanceQRScreen", {
      sessionId,
      className: selectedClass,
      sectionName: selectedSection,
      subjectName: selectedSubject,
    });

  } catch (error) {
    console.error("❌ Failed to create session:", error);
    Alert.alert(
      "Error",
      "Failed to create attendance session. Please try again.",
      [{ text: "OK" }]
    );
  }
};



 const handleEditAttendance = (item) => {
  const now = Date.now();
  const createdTime = new Date(item.timestamp).getTime();
  const diff = now - createdTime;

  // Check if more than 1 hour has passed
  if (diff > 60 * 60 * 1000) {
    Alert.alert(
      "Edit Locked",
      "Attendance can only be edited within 1 hour.",
      [{ text: "OK" }]
    );
    return;
  }

  navigation.navigate("EditAttendanceScreen", {
    sessionId: item.sessionId,
    className: item.className,
    sectionName: item.sectionName,
    subjectName: item.subjectName,
    date: new Date(item.timestamp).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  });
};


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading your classes...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>Select Year & Division</Text>
          <Text style={styles.subtitle}>Choose your class and section</Text>

          {/* Class Selection */}
          {classes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Year</Text>
              <View style={styles.classGrid}>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    style={[
                      styles.classButton,
                      selectedClass === cls && styles.selectedButton,
                    ]}
                    onPress={() => setSelectedClass(cls)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        selectedClass === cls && styles.selectedButtonText,
                      ]}
                    >
                      {cls}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No years assigned to you</Text>
            </View>
          )}

          {/* Section Selection */}
          {sections.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Division</Text>
              <View style={styles.sectionGrid}>
                {sections.map((section) => (
                  <TouchableOpacity
                    key={section}
                    style={[
                      styles.sectionButton,
                      selectedSection === section && styles.selectedButton,
                    ]}
                    onPress={() => setSelectedSection(section)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        selectedSection === section && styles.selectedButtonText,
                      ]}
                    >
                      {section.split(" ")[1]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No divisions assigned to you</Text>
            </View>
          )}

          {/* Subject Selection */}
{subjects.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Select Subject</Text>

    <View style={styles.subjectGrid}>
      {subjects.map((subject) => (
        <TouchableOpacity
          key={subject}
          style={[
            styles.subjectButton,
            selectedSubject === subject && styles.selectedButton,
          ]}
          onPress={() => setSelectedSubject(subject)}
        >
          <Text
            style={[
              styles.buttonText,
              selectedSubject === subject && styles.selectedButtonText,
            ]}
          >
            {subject}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}


        {/* Selected Info */}
        <View style={styles.selectionInfo}>
  <Text style={styles.selectionLabel}>Your Selection:</Text>
  <Text style={styles.selectionText}>
    {selectedClass} - {selectedSection} - {selectedSubject || "No subject"}
  </Text>
</View>


        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Confirm Selection</Text>
        </TouchableOpacity>

        {/* Recent Classes Section */}
        {recentClasses.length > 0 && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>RECENT CLASSES</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.recentsSection}>
              <Text style={styles.recentsSectionTitle}>Recently Accessed</Text>
              <Text style={styles.recentsSectionSubtitle}>
                Tap to edit attendance
              </Text>
              <View style={styles.recentsGrid}>
                {recentClasses.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentCard}
                    onPress={() => handleEditAttendance(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentCardContent}>
                      <Text style={styles.recentClassName}>{item.className} </Text>
<Text style={styles.recentSectionName}>
  {item.sectionName.split(" ")[1]} Div 
</Text>

<Text style={{ color: "#16a34a", fontWeight: "600" }}>
  Present: {item.presentCount}
</Text>

                    </View>
                    <Text style={styles.editLabel}>Edit</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Extra bottom space */}
        <View style={{ height: 40 }} />
      </ScrollView>
      )}
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
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
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

  emptyState: {
    backgroundColor: '#fef3c7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 15,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  classButton: {
    width: '48%',
    backgroundColor: '#e2e8f0',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  sectionButton: {
    width: '30%',
    backgroundColor: '#e2e8f0',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  selectedButtonText: {
    color: '#ffffff',
  },
  selectionInfo: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
  },
  selectionLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  selectionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4f46e5',
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  recentsSection: {
    marginBottom: 20,
  },
  recentsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  recentsSectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 15,
  },
  recentsGrid: {
    gap: 12,
  },
  recentCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentClassName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  recentSectionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
});