import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { disconnectSocket } from "../../src/services/socket";
import api from "../../src/utils/axios";
import { ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";

// ✅ HELPER FUNCTION FOR DETAILED ERROR DISPLAY
const showDetailedError = (err, context = "Upload") => {
  console.log("═══════════════════════════════════════");
  console.log(`❌ ${context} ERROR DETAILS:`);
  console.log("═══════════════════════════════════════");
  
  // Log the full error object
  console.log("Full Error:", err);
  
  // Log response data if available
  if (err?.response?.data) {
    console.log("Response Data:", JSON.stringify(err.response.data, null, 2));
    console.log("Success:", err.response.data.success);
    console.log("Message:", err.response.data.message);
    console.log("Error Code:", err.response.data.error);
    console.log("Details:", err.response.data.details);
  }
  
  // Log response status
  if (err?.response?.status) {
    console.log("HTTP Status:", err.response.status);
  }
  
  // Log request info
  if (err?.config) {
    console.log("Request URL:", err.config.url);
    console.log("Request Method:", err.config.method);
  }
  
  console.log("Error Message:", err.message);
  console.log("═══════════════════════════════════════");

  // Build detailed error message for user
  let userMessage = "";
  const errorData = err?.response?.data;

  if (errorData) {
    // Main error message
    userMessage = errorData.message || "Upload failed";
    
    // Add error code if available
    if (errorData.error) {
      userMessage += `\n\nError Code: ${errorData.error}`;
    }

    // Add validation details if available
    if (errorData.details && Array.isArray(errorData.details)) {
      userMessage += "\n\nProblems found:";
      errorData.details.slice(0, 5).forEach((detail, index) => {
        const rowNum = detail.index !== undefined ? detail.index + 1 : index + 1;
        const id = detail.studentId || detail.teacherId || detail.parentId || detail.adminId || "unknown";
        const missing = detail.missingFields ? detail.missingFields.join(", ") : "unknown fields";
        userMessage += `\n• Row ${rowNum} (ID: ${id}): Missing ${missing}`;
      });
      
      if (errorData.details.length > 5) {
        userMessage += `\n• ... and ${errorData.details.length - 5} more`;
      }
    } else if (errorData.details && typeof errorData.details === 'string') {
      userMessage += `\n\nDetails: ${errorData.details}`;
    }
  } else {
    userMessage = err.message || "An unknown error occurred";
  }

  return userMessage;
};

export default function AdminProfile() {
  const navigation = useNavigation();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const adminId = await AsyncStorage.getItem("adminId");
      if (!adminId) {
        throw new Error("Admin ID not found");
      }
      const res = await api.get(`/api/admin/me/${adminId}`);
      setAdmin(res.data);
    } catch (err) {
      console.error("❌ Admin profile error:", err);
      Alert.alert("Error", "Failed to load admin profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTeachers = async () => {
    console.log("═══════════════════════════════════════");
    console.log("🟢 STARTING TEACHER UPLOAD");
    console.log("═══════════════════════════════════════");
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      console.log("📁 File picker result:", result);

      if (result.canceled) {
        console.log("⚠️ Upload canceled by user");
        return;
      }

      const file = result.assets[0];
      console.log("📄 Selected file:", file.name);

      if (!file.name.endsWith(".json")) {
        console.log("❌ Invalid file type:", file.name);
        Alert.alert("Invalid File", "Only JSON files are allowed");
        return;
      }

      console.log("📖 Reading file from URI:", file.uri);
      const response = await fetch(file.uri);
      const text = await response.text();
      console.log("📝 File content length:", text.length);

      let jsonData;
      try {
        jsonData = JSON.parse(text);
        console.log("✅ JSON parsed successfully");
        console.log("📊 Is Array:", Array.isArray(jsonData));
        console.log("📊 Array length:", jsonData?.length);
        console.log("📊 First item:", JSON.stringify(jsonData?.[0], null, 2));
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        Alert.alert("Invalid JSON", "File is not valid JSON");
        return;
      }

      console.log("🚀 Sending POST request to /api/admin/upload-teachers");
      const res = await api.post("/api/admin/upload-teachers", jsonData, {
        headers: { "Content-Type": "application/json" }
      });

      console.log("✅ Upload response:", res.data);
      console.log("═══════════════════════════════════════");
      Alert.alert("Upload Successful", `${res.data.count} teachers uploaded successfully`);

    } catch (err) {
      const errorMessage = showDetailedError(err, "Teacher Upload");
      Alert.alert("Upload Failed", errorMessage);
    }
  };

  const handleUploadAdmins = async () => {
    console.log("═══════════════════════════════════════");
    console.log("🟢 STARTING ADMIN UPLOAD");
    console.log("═══════════════════════════════════════");
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      console.log("📁 File picker result:", result);

      if (result.canceled) {
        console.log("⚠️ Upload canceled by user");
        return;
      }

      const file = result.assets[0];
      console.log("📄 Selected file:", file.name);

      if (!file.name.endsWith(".json")) {
        console.log("❌ Invalid file type:", file.name);
        Alert.alert("Invalid File", "Only JSON files are allowed");
        return;
      }

      console.log("📖 Reading file from URI:", file.uri);
      const response = await fetch(file.uri);
      const text = await response.text();
      console.log("📝 File content length:", text.length);

      let jsonData;
      try {
        jsonData = JSON.parse(text);
        console.log("✅ JSON parsed successfully");
        console.log("📊 Is Array:", Array.isArray(jsonData));
        console.log("📊 Array length:", jsonData?.length);
        console.log("📊 First item:", JSON.stringify(jsonData?.[0], null, 2));
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        Alert.alert("Invalid JSON", "File is not valid JSON");
        return;
      }

      console.log("🚀 Sending POST request to /api/admin/upload-admins");
      const res = await api.post("/api/admin/upload-admins", jsonData, {
        headers: { "Content-Type": "application/json" }
      });

      console.log("✅ Upload response:", res.data);
      console.log("═══════════════════════════════════════");
      Alert.alert("Upload Successful", `${res.data.count} admins uploaded successfully`);

    } catch (err) {
      const errorMessage = showDetailedError(err, "Admin Upload");
      Alert.alert("Upload Failed", errorMessage);
    }
  };

  const handleUploadStudents = async () => {
    console.log("═══════════════════════════════════════");
    console.log("🟢 STARTING STUDENT UPLOAD");
    console.log("═══════════════════════════════════════");
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      console.log("📁 File picker result:", result);

      if (result.canceled) {
        console.log("⚠️ Upload canceled by user");
        return;
      }

      const file = result.assets[0];
      console.log("📄 Selected file:", file.name);

      if (!file.name.endsWith(".json")) {
        console.log("❌ Invalid file type:", file.name);
        Alert.alert("Invalid File", "Only JSON files are allowed");
        return;
      }

      console.log("📖 Reading file from URI:", file.uri);
      const response = await fetch(file.uri);
      const text = await response.text();
      console.log("📝 File content length:", text.length);

      let jsonData;
      try {
        jsonData = JSON.parse(text);
        console.log("✅ JSON parsed successfully");
        console.log("📊 Is Array:", Array.isArray(jsonData));
        console.log("📊 Array length:", jsonData?.length);
        console.log("📊 First item:", JSON.stringify(jsonData?.[0], null, 2));
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        Alert.alert("Invalid JSON", "File is not valid JSON");
        return;
      }

      console.log("🚀 Sending POST request to /api/admin/upload-students");
      const res = await api.post("/api/admin/upload-students", jsonData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("✅ Upload response:", res.data);
      console.log("═══════════════════════════════════════");
      Alert.alert("Upload Successful", `${res.data.count} students uploaded successfully`);

    } catch (err) {
      const errorMessage = showDetailedError(err, "Student Upload");
      Alert.alert("Upload Failed", errorMessage);
    }
  };

  const handleUploadParents = async () => {
    console.log("═══════════════════════════════════════");
    console.log("🟢 STARTING PARENT UPLOAD");
    console.log("═══════════════════════════════════════");
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      console.log("📁 File picker result:", result);

      if (result.canceled) {
        console.log("⚠️ File picker canceled");
        return;
      }

      const file = result.assets[0];
      console.log("📄 Selected file:", file.name);

      if (!file.name.endsWith(".json")) {
        console.log("❌ Invalid file type:", file.name);
        Alert.alert("Invalid File", "Only JSON files are allowed");
        return;
      }

      console.log("📖 Reading file from URI:", file.uri);
      const response = await fetch(file.uri);
      const text = await response.text();
      console.log("📝 File content length:", text.length);

      let jsonData;
      try {
        jsonData = JSON.parse(text);
        console.log("✅ JSON parsed successfully");
        console.log("📊 Data type:", typeof jsonData);
        console.log("📊 Is Array:", Array.isArray(jsonData));
        console.log("📊 Array length:", jsonData?.length);
        console.log("📊 First item:", JSON.stringify(jsonData?.[0], null, 2));
      } catch (e) {
        console.log("❌ JSON parse error:", e);
        Alert.alert("Invalid JSON", "File is not valid JSON");
        return;
      }

      if (Platform.OS === "web") {
        const confirmed = window.confirm(
          "Uploading parents will DELETE all existing parents. Continue?"
        );
        
        if (!confirmed) {
          console.log("⚠️ Upload canceled by user");
          return;
        }

        try {
          console.log("🚀 Sending POST request to /api/admin/upload-parents");
          console.log("📦 Payload preview:", JSON.stringify(jsonData.slice(0, 2), null, 2));
          
          const res = await api.post("/api/admin/upload-parents", jsonData, {
            headers: { "Content-Type": "application/json" },
          });

          console.log("✅ Upload response:", res.data);
          console.log("═══════════════════════════════════════");
          window.alert(`Upload Successful\n${res.data.count} parents uploaded successfully`);
        } catch (err) {
          const errorMessage = showDetailedError(err, "Parent Upload");
          window.alert(`Upload Failed\n\n${errorMessage}`);
        }
      } else {
        Alert.alert(
          "Confirm Upload",
          "Uploading parents will DELETE all existing parents. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Upload",
              style: "destructive",
              onPress: async () => {
                try {
                  console.log("🚀 Sending POST request to /api/admin/upload-parents");
                  console.log("📦 Payload preview:", JSON.stringify(jsonData.slice(0, 2), null, 2));
                  
                  const res = await api.post("/api/admin/upload-parents", jsonData, {
                    headers: { "Content-Type": "application/json" },
                  });

                  console.log("✅ Upload response:", res.data);
                  console.log("═══════════════════════════════════════");
                  Alert.alert("Upload Successful", `${res.data.count} parents uploaded successfully`);
                } catch (err) {
                  const errorMessage = showDetailedError(err, "Parent Upload");
                  Alert.alert("Upload Failed", errorMessage);
                }
              },
            },
          ]
        );
      }
    } catch (err) {
      const errorMessage = showDetailedError(err, "Parent Upload (Outer)");
      if (Platform.OS === "web") {
        window.alert(`Upload Failed\n\n${errorMessage}`);
      } else {
        Alert.alert("Upload Failed", errorMessage);
      }
    }
  };

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) logoutAdmin();
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logoutAdmin },
      ]);
    }
  };

  const logoutAdmin = async () => {
    try {
      const adminName = admin?.email ? admin.email.split('@')[0] : admin?.id || 'Unknown Admin';
      console.log(`🚪 ADMIN logged out: ${adminName}`);

      await AsyncStorage.multiRemove(["adminId", "userType"]);
      try { disconnectSocket(); } catch (e) { console.warn("Socket disconnect failed:", e); }
      try { await api.post("/api/users/logout", { userId: admin?.id }); } catch (e) { console.warn("Logout API failed:", e); }

      if (Platform.OS === "web") {
        window.location.href = "/";
        return;
      }

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
    } catch (err) {
      console.error("Logout error:", err);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!admin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load admin data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAdminData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{admin.name ? admin.name.substring(0, 2).toUpperCase() : "AD"}</Text>
          </View>
          <Text style={styles.name}>Administrator</Text>
          <Text style={styles.role}>{admin.branch || 'All Branches'}</Text>
        </View>

        <View style={styles.card}>
          <ProfileRow label="Branch" value={admin.branch || 'All Branches'} />
          <ProfileRow label="Email" value={admin.email || 'N/A'} />
          <ProfileRow label="Admin ID" value={admin.id || 'N/A'} />
        </View>

        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Upload Data</Text>
          <TouchableOpacity style={styles.uploadCard} onPress={handleUploadStudents}>
            <Text style={styles.uploadTitle}>Upload Students</Text>
            <Text style={styles.uploadSubtitle}>.json file only</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadCard} onPress={handleUploadTeachers}>
            <Text style={styles.uploadTitle}>Upload Teachers</Text>
            <Text style={styles.uploadSubtitle}>.json file only</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadCard} onPress={handleUploadAdmins}>
            <Text style={styles.uploadTitle}>Upload Admins</Text>
            <Text style={styles.uploadSubtitle}>.json file only</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadCard} onPress={handleUploadParents}>
            <Text style={styles.uploadTitle}>Upload Parents</Text>
            <Text style={styles.uploadSubtitle}>.json file only</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const ProfileRow = ({ label, value }) => (
  <View style={styles.profileRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#ef4444', marginBottom: 20 },
  retryButton: { backgroundColor: '#4f46e5', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  role: { fontSize: 14, color: '#64748b' },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  value: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  uploadSection: { marginHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  uploadCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 5 },
  uploadSubtitle: { fontSize: 12, color: '#64748b' },
  logoutButton: { backgroundColor: '#ef4444', marginHorizontal: 20, marginTop: 30, padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});