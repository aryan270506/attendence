import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { disconnectSocket } from "../../src/services/socket";
import api from "../../src/utils/axios";
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from "react-native";

const { width } = Dimensions.get('window');



const StudentProfile = ({ route }) => {
  const navigation = useNavigation();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadStudentData();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const logoutStudent = async () => {
    try {
      console.log(`🚪 STUDENT logging out: ${studentData?.id}`);

      try {
        disconnectSocket();
      } catch (e) {}

      await AsyncStorage.multiRemove([
        "userType",
        "studentKey",
        "studentId",
      ]);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );

      api.post("/api/users/logout", {
        userId: studentData?.id,
      }).catch(() => {});

    } catch (err) {
      console.error("Student logout fatal error:", err);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    }
  };

  const confirmStudentLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) {
        logoutStudent();
      }
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: logoutStudent,
          },
        ]
      );
    }
  };

  

  const loadStudentData = async () => {
  try {
    setLoading(true);

    // If passed from navigation (already Mongo-based)
    if (route?.params?.studentData) {
      setStudentData(route.params.studentData);
      return;
    }

    const studentId = await AsyncStorage.getItem("studentId");
    if (!studentId) throw new Error("Student ID missing");

    const res = await api.get(`/api/student/me/${studentId}`);
    setStudentData(res.data);

  } catch (error) {
    console.error("Error loading student data:", error.message);
    alert("Failed to load student data");
  } finally {
    setLoading(false);
  }
};


  // 📸 Image Compression Function
  const compressImage = async (uri) => {
  let quality = 0.9;
  let width = 1000;

  let result = await manipulateAsync(
    uri,
    [],
    { compress: quality, format: SaveFormat.JPEG }
  );

  let response = await fetch(result.uri);
  let blob = await response.blob();

  // If already <= 150KB, return as-is
  if (blob.size <= 150 * 1024) {
    return result.uri;
  }

  // Compress loop
  while (blob.size > 110 * 1024 && quality > 0.3)
 {
    quality -= 0.1;
    width -= 100;

    result = await manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: quality, format: SaveFormat.JPEG }
    );

    response = await fetch(result.uri);
    blob = await response.blob();
  }

  return result.uri;
};


  // 📤 Save Image to Firebase Database (as base64)
  const uploadImageToFirebase = async (imageUri) =>  {
    try {
          setUploadingImage(true);

    const studentId = await AsyncStorage.getItem("studentId");

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;

      await api.put(`/api/student/profile-image/${studentId}`, {
        image: base64Image,
      });

      setStudentData(prev => ({
        ...prev,
        image: base64Image,
      }));

      Alert.alert("Success", "Profile image saved");
    };

    reader.readAsDataURL(blob);

  } catch (err) {
    console.error(err);
    Alert.alert("Upload failed");
  } finally {
    setUploadingImage(false);
  }
};





  // 🗑️ Remove Image from Firebase
  const removeImage = async () => {
  try {
    setUploadingImage(true);

    const studentId = await AsyncStorage.getItem("studentId");
    await api.delete(`/api/student/profile-image/${studentId}`);

    setStudentData(prev => ({
      ...prev,
      image: null
    }));

    Alert.alert("Success", "Profile picture removed successfully!");

  } catch (error) {
    console.error("Error removing image:", error.message);
    Alert.alert("Error", "Failed to remove image.");
  } finally {
    setUploadingImage(false);
  }
};

  const confirmRemoveImage = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to remove your profile picture?");
      if (confirmed) {
        removeImage();
      }
    } else {
      Alert.alert(
        "Remove Profile Picture",
        "Are you sure you want to remove your profile picture?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: removeImage,
          },
        ]
      );
    }
  };

  // 📷 Pick Image from Gallery
  const pickImage = async () => {
  try {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need gallery permissions to update your profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ WORKING
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      const finalUri = await compressImage(result.assets[0].uri);
      await uploadImageToFirebase(finalUri);
    }
  } catch (error) {
    console.error("Error picking image:", error);
    Alert.alert("Error", "Failed to pick image.");
  }
};


  // 📸 Take Photo with Camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImageToFirebase(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  // 📷 Show Image Picker Options
  const showImagePickerOptions = () => {
    if (Platform.OS === 'web') {
      pickImage();
    } else {
      const options = [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: pickImage },
      ];

      // Add remove option if image exists
      if (studentData?.image) {
        options.push({
          text: "Remove Photo",
          onPress: confirmRemoveImage,
          style: "destructive"
        });
      }

      Alert.alert(
        "Update Profile Picture",
        "Choose an option",
        options
      );
    }
  };

  const InfoCard = ({ label, value, icon }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Text style={styles.iconText}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!studentData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No student data available</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.retryButtonText}>Return to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getYearDisplay = (year) => {
    if (!year) return 'N/A';
    const yearNum = parseInt(year);
    const yearNames = {
      1: 'First Year',
      2: 'Second Year', 
      3: 'Third Year',
      4: 'Fourth Year'
    };
    return yearNames[yearNum] || `Year ${year}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Student Profile</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.profileCard}>
            <View style={styles.imageContainer}>
              <TouchableOpacity 
                onPress={showImagePickerOptions}
                disabled={uploadingImage}
                style={styles.imageWrapper}
              >
                {studentData.image ? (
                  <>
                    <Image
                      source={{
                         uri: studentData.image
                          }}

                      style={styles.profileImage}
                    />
                    <View style={styles.imageBorder} />
                    
                    <View style={styles.cameraIconContainer}>
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.cameraIcon}>📷</Text>
                      )}
                    </View>
                  </>
                ) : (
                  <View style={styles.placeholderContainer}>
                    <View style={styles.dottedCircle}>
                      {uploadingImage ? (
                        <ActivityIndicator size="large" color="#667eea" />
                      ) : (
                        <Text style={styles.placeholderCameraIcon}>📷</Text>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              
              <Text style={styles.imageHint}>
                {uploadingImage ? 'Processing...' : studentData.image ? 'Tap to change photo' : 'Tap to add photo'}
              </Text>

              {studentData.image && !uploadingImage && (
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={confirmRemoveImage}
                >
                  <Text style={styles.removeImageText}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.studentName}>
              {studentData.name || 'Student Name'}
            </Text>
            <Text style={styles.studentCourse}>
              {studentData.course || 'Bachelor of Engineering'}
            </Text>
            <Text style={styles.studentDepartment}>
              {studentData.department || 'Computer Science'}
            </Text>
          </View>

          <View style={styles.credentialsSection}>
            <Text style={styles.sectionTitle}>Academic Credentials</Text>
            
            <InfoCard
              label="PRN Number"
              value={studentData.prn}
              icon="🎓"
            />
            
            <InfoCard
              label="Student ID"
              value={studentData.id}
              icon="🆔"
            />
            
            <InfoCard
              label="Academic Year"
              value={getYearDisplay(studentData.year)}
              icon="📅"
            />
            
            <InfoCard
              label="Division"
              value={studentData.division}
              icon="📚"
            />
            
            <InfoCard
              label="Email Address"
              value={studentData.email}
              icon="✉️"
            />
          </View>

          {studentData.subjects && Object.keys(studentData.subjects).length > 0 && (
            <View style={styles.credentialsSection}>
              <Text style={styles.sectionTitle}>Enrolled Subjects</Text>
              {Object.values(studentData.subjects).map((subject, index) => (
                <View key={index} style={styles.subjectCard}>
                  <Text style={styles.subjectText}>📖 {subject}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={confirmStudentLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#e53e3e',
    fontWeight: '600',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    marginTop: -20,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  imageBorder: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#667eea',
    top: -5,
    left: -5,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#667eea',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  cameraIcon: {
    fontSize: 16,
  },
  placeholderContainer: {
    width: 120,
    height: 120,
  },
  dottedCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
  },
  placeholderCameraIcon: {
    fontSize: 40,
  },
  imageHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontWeight: '500',
  },
  removeImageButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeImageText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
  studentName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
    textAlign: 'center',
  },
  studentCourse: {
    fontSize: 16,
    fontWeight: '500',
    color: '#667eea',
    marginBottom: 2,
    textAlign: 'center',
  },
  studentDepartment: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
    textAlign: 'center',
  },
  credentialsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
    paddingLeft: 4,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 20,
    marginRight: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginLeft: 30,
  },
  subjectCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  actionButtons: {
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
});

export default StudentProfile;