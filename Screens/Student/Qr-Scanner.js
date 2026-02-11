import React, { useState, useEffect, useRef } from "react";
import { Alert, Animated, Platform  } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../src/utils/axios";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function StudentQRScannerScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);

  const scanAnimation = useRef(new Animated.Value(0)).current;

  // 🔒 HARD LOCK (prevents double scan instantly)
  const scanLockRef = useRef(false);

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    if (scanning && !scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnimation.setValue(0);
    }
  }, [scanning, scanned]);


  useEffect(() => {
  const loadStudentData = async () => {
    try {
      const studentId = await AsyncStorage.getItem("studentId");

      const res = await api.get(`/api/student/me/${studentId}`);

      const {
        year,
        division,
        subBranch,
      } = res.data;

      // ✅ Store EVERYTHING locally
      await AsyncStorage.multiSet([
        ["studentYear", year],
        ["studentDivision", division],
        ["studentSubBranch", subBranch],
      ]);

    } catch (err) {
      console.error("Failed to load student data", err);
    }
  };

  loadStudentData();
}, []);

  

  const showMessage = (title, message, onOk) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(
      title,
      message,
      onOk ? [{ text: "OK", onPress: onOk }] : undefined
    );
  }
};



  /* =========================
     FINAL QR HANDLER (LOGIC)
  ========================== */
  const handleBarCodeScanned = async ({ data }) => {
  if (scanned || scanLockRef.current) return;
  scanLockRef.current = true;

  setScanned(true);
  setScanning(false);

  let payload;
  try {
    payload = JSON.parse(data);
  } catch {
    showInvalidQR();
    return;
  }

  const { type, sessionId, issuedAt } = payload;

  if (!type || !sessionId || !issuedAt) {
    showInvalidQR();
    return;
  }

  if (Date.now() - issuedAt > 10000) {
    showMessage("QR Expired ⏰", "Please scan the latest QR", resetScanner);
    return;
  }

  try {
    const studentId = await AsyncStorage.getItem("studentId");
    const studentYear = await AsyncStorage.getItem("studentYear");
    const studentDivision = await AsyncStorage.getItem("studentDivision");
    const studentBatch = await AsyncStorage.getItem("studentSubBranch"); // A1 / B1

    /* ===============================
       🧠 THEORY QR
    ================================ */
    if (type === "ATTENDANCE_QR") {
      await api.post("/api/attendance/mark", {
        sessionId,
        studentId,
        studentYear,
        studentDivision,
      });

      showMessage(
        "Attendance Marked ✅",
        "You are marked present for this class."
      );
      return;
    }

    /* ===============================
       🧪 LAB QR
    ================================ */
    if (type === "LAB_ATTENDANCE_QR") {
      const { year, division, batch } = payload;

      // 🚨 STRICT LAB VALIDATION
      if (
        String(studentYear) !== String(year) ||
        String(studentDivision) !== String(division) ||
        String(studentBatch) !== String(batch)
      ) {
        showMessage(
          "Access Denied ❌",
          `This lab is only for Batch ${batch}`
        );
        return;
      }

      await api.post("/api/lab-attendance/mark", {
        sessionId,
        studentId,
        studentYear,
        studentDivision,
        studentBatch,
      });

      showMessage(
        "Lab Attendance Marked ✅",
        "You are marked present for this lab."
      );
      return;
    }

    // ❌ Unknown QR type
    showInvalidQR();

  } catch (err) {
    if (err?.response?.status === 409) {
      showMessage("Already Marked ⚠️", "Attendance already recorded.");
    } else if (err?.response?.status === 403) {
      showMessage("Access Denied ❌", err.response.data.msg);
    } else {
      showMessage(
        "Attendance Failed ❌",
        err?.response?.data?.msg || "Try again",
        resetScanner
      );
    }
  }
};




  const resetScanner = () => {
    scanLockRef.current = false;
    setScanned(false);
    setScanning(true);
  };

  const showInvalidQR = () => {
  showMessage(
    "Invalid QR ❌",
    "This QR is not generated by your teacher.",
    resetScanner
  );
};


  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  // Calculate the animated position (moves from top to bottom of the frame)
  const scanLineTranslateY = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [25, 200], // 220 is roughly the height of the scanner frame minus the line height
  });

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan Attendance QR</Text>
        <Text style={styles.subtitle}>
          Point your camera at the QR code displayed by your teacher
        </Text>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Scanner Frame Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Animated Scanning Line */}
            {scanning && !scanned && (
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [{ translateY: scanLineTranslateY }],
                  },
                ]}
              />
            )}
          </View>
        </View>

        {/* Scanning Indicator */}
        {scanning && !scanned && (
          <View style={styles.scanningIndicator}>
            <Text style={styles.scanningText}>Scanning...</Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          📱 Hold your device steady
        </Text>
        <Text style={styles.instructionText}>
          🎯 Center the QR code in the frame
        </Text>
        <Text style={styles.instructionText}>
          ⚡ QR code refreshes every 3 seconds
        </Text>
      </View>

      {/* Manual Reset Button (if needed) */}
      {scanned && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setScanned(false);
            setScanning(true);
          }}
        >
          <Text style={styles.resetButtonText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 15,
    padding: 10,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  header: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#fff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
  position: "absolute",
  left: 25,      // ← Add this (left padding)
  right: 25,     // ← Add this (right padding)
  height: 3,
  backgroundColor: "#4CAF50",
  shadowColor: "#4CAF50",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 10,
  elevation: 5,
},
  scanningIndicator: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    alignItems: "center",
  },
  scanningText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  instructions: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    backgroundColor: "#f9f9f9",
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 100,
  },
  subText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 40,
  },
  backButton: {
    marginTop: 30,
    alignSelf: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    alignSelf: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 30,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});