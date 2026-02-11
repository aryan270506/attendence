import React, { useState, useEffect } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../src/utils/axios";

export default function TeacherRecord({ navigation }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  // ===============================
  // FETCH TEACHER DATA FROM MONGODB
  // ===============================
  const fetchTeacherData = async () => {
    try {
      setLoading(true);

      const teacherId = await AsyncStorage.getItem("teacherId");

      if (!teacherId) {
        Alert.alert("Error", "Teacher ID not found. Please login again.");
        navigation.replace("LoginScreen");
        return;
      }

      console.log("👩‍🏫 Fetching teacher profile for:", teacherId);

      const res = await api.get(`/api/teacher/me/${teacherId}`);
      const teacher = res.data;

      // Years → UI labels
      const yearLabels = (teacher.years || []).map((year) =>
        year === 1
          ? "1st Year"
          : year === 2
          ? "2nd Year"
          : year === 3
          ? "3rd Year"
          : "4th Year"
      );

      // Divisions → UI labels
      const divisionLabels = (teacher.divisions || []).map(
        (div) => `Div ${div}`
      );

      setClasses(yearLabels);
      setSections(divisionLabels);

      console.log("✅ Loaded from MongoDB:", {
        years: yearLabels,
        divisions: divisionLabels,
      });
    } catch (error) {
      console.error("❌ Error fetching teacher data:", error);
      Alert.alert("Error", "Failed to load teacher data.");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // SUBMIT
  // ===============================
  const handleSubmit = () => {
    if (!selectedClass || !selectedSection) {
      Alert.alert(
        "Incomplete Selection",
        "Please select both Year and Division"
      );
      return;
    }

    navigation.navigate("StudentListScreen", {
      className: selectedClass,
      sectionName: selectedSection,
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

          {/* YEAR */}
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
              <Text style={styles.emptyStateText}>
                No years assigned to you
              </Text>
            </View>
          )}

          {/* DIVISION */}
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
                        selectedSection === section &&
                          styles.selectedButtonText,
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
              <Text style={styles.emptyStateText}>
                No divisions assigned to you
              </Text>
            </View>
          )}

          {/* SELECTION */}
          {(selectedClass || selectedSection) && (
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionLabel}>Your Selection:</Text>
              <Text style={styles.selectionText}>
                {selectedClass || "—"} - {selectedSection || "—"}
              </Text>
            </View>
          )}

          {/* SUBMIT */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>Confirm Selection</Text>
          </TouchableOpacity>

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
    paddingBottom: 60, // Important for scroll
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
    flexWrap: 'wrap',
    gap: 12,
  },
  classButton: {
    width: '48%',
    backgroundColor: '#e2e8f0',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  sectionGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
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
});