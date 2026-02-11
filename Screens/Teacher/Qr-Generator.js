import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../src/utils/axios"; // adjust path if needed


export default function AttendanceQRScreen({ navigation, route }) {
  const { sessionId, className, sectionName, subjectName } = route.params;


  const [qrValue, setQrValue] = useState(null);

  const generateQR = async () => {
  const teacherId = await AsyncStorage.getItem("teacherId");

  const payload = {
  type: "ATTENDANCE_QR",
  sessionId,      // 🔥 PRIMARY KEY
  teacherId,      // optional but useful for validation/logs
  issuedAt: Date.now(),
};



  setQrValue(JSON.stringify(payload));
};

  useEffect(() => {
    generateQR();
    const interval = setInterval(generateQR, 3000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Save attendance
const handleSaveAttendance = async () => {
  const confirm =
    Platform.OS === "web"
      ? window.confirm("Are you sure you want to save attendance?")
      : await new Promise(resolve => {
          Alert.alert(
            "Confirm Save",
            "Are you sure you want to save attendance?",
            [
              { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
              { text: "Save", onPress: () => resolve(true) },
            ]
          );
        });

  if (!confirm) return;

  try {
    // 🔥 FINALIZE SESSION API CALL HERE (if any)

    await saveToRecents(className, sectionName);

    alert("Attendance saved successfully");
    navigation.goBack();

    console.log("✅ Attendance finalized:", sessionId);
  } catch (err) {
    console.error("❌ Save attendance failed:", err);
    alert("Failed to save attendance");
  }
};



  const saveToRecents = async (className, sectionName) => {
  try {
    const stored = await AsyncStorage.getItem("recentClasses");
    const recentClasses = stored ? JSON.parse(stored) : [];

    const newEntry = {
      className,
      sectionName,
      timestamp: new Date().toISOString(),
    };

    // remove duplicate
    const filtered = recentClasses.filter(
      item =>
        !(item.className === className && item.sectionName === sectionName)
    );

    const updated = [newEntry, ...filtered].slice(0, 6);
    await AsyncStorage.setItem("recentClasses", JSON.stringify(updated));
  } catch (err) {
    console.log("Error saving to recents", err);
  }
};


  // ❌ Delete class attendance
 const handleDeleteAttendance = async () => {
  const confirm =
    Platform.OS === "web"
      ? window.confirm(
          "This will delete all attendance records for this class. Continue?"
        )
      : await new Promise(resolve => {
          Alert.alert(
            "Delete Attendance",
            "This will delete all attendance records for this class.",
            [
              { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => resolve(true),
              },
            ]
          );
        });

  if (!confirm) return;

  try {
    await api.delete("/api/attendance/session/delete", {
      data: { sessionId },
    });

    alert("Class attendance deleted");
    navigation.goBack();

    console.log("❌ Attendance session deleted:", sessionId);
  } catch (err) {
    console.error("❌ Delete attendance failed:", err);
    alert("Failed to delete attendance");
  }
};



  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Live Attendance</Text>

      {/* Class Info */}
     <View style={styles.infoCard}>
        <Text style={styles.infoText}>📘 {className}</Text>
        <Text style={styles.infoText}>🧑‍🎓 Division {sectionName.split(" ")[1]}</Text>
        <Text style={styles.infoText}>📚 {subjectName}</Text>
      </View>


      {/* QR */}
      <View style={styles.qrBox}>
        {qrValue ? (
          <QRCode value={qrValue} size={220} />
        ) : (
          <Text>Generating QR...</Text>
        )}
      </View>

      <Text style={styles.hint}>
        QR refreshes every 5 seconds  
        Current + last 2 QRs are valid
      </Text>

      {/* Actions */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveAttendance}
        >
          <Text style={styles.saveText}>Save Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAttendance}
        >
          <Text style={styles.deleteText}>Delete Class Attendance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 20,
  },

  infoCard: {
    backgroundColor: "#eef2ff",
    padding: 16,
    borderRadius: 14,
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },

  infoText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3730a3",
    marginVertical: 2,
  },

  qrBox: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20,
    marginTop: 30,
    elevation: 4,
  },

  hint: {
    marginTop: 16,
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },

  buttonContainer: {
    width: "100%",
    marginTop: 30,
  },

  saveBtn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  saveText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },

  deleteBtn: {
    backgroundColor: "#fee2e2",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  deleteText: {
    color: "#b91c1c",
    fontSize: 16,
    fontWeight: "700",
  },
});
