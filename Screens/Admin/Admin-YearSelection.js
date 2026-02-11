import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';

export default function AdminClassSectionSelector({ navigation }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const classes = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const sections = ['Div A', 'Div B', 'Div C'];

  const handleSubmit = () => {
    if (selectedClass && selectedSection) {
      // Extract year number (1, 2, 3, 4) from selected class
      const yearNumber = selectedClass.match(/\d+/)[0];
      
      // Extract division letter (A, B, C) from selected section
      const divisionLetter = selectedSection.split(' ')[1];

      // Navigate to the StudentList screen with params
      navigation.navigate("StudentList", {
        className: selectedClass,
        sectionName: selectedSection,
        year: yearNumber,
        division: divisionLetter,
      });
    } else {
      Alert.alert(
        "Incomplete Selection",
        "Please select both class and section",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Select Year & Division</Text>
        <Text style={styles.subtitle}>Choose your class and section</Text>

        {/* Class Selection */}
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

        {/* Section Selection */}
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

        {/* Selected Info */}
        {(selectedClass || selectedSection) && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionLabel}>Your Selection:</Text>
            <Text style={styles.selectionText}>
              {selectedClass || 'No class selected'} - {selectedSection || 'No section selected'}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Confirm Selection</Text>
        </TouchableOpacity>

        {/* Extra bottom space so the button never hides */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
});