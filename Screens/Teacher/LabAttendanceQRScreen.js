import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import api from "../../src/utils/axios";

export default function LabAttendanceQRScreen({ route, navigation }) {
  const { sessionId, year, division, batch, subject } = route.params;

  const [qrValue, setQrValue] = useState(null);

  /* ===============================
     GENERATE QR
  ================================ */
  const generateQR = () => {
    const payload = {
      type: "LAB_ATTENDANCE_QR",
      sessionId,           // 🔥 IMPORTANT
      year,
      division,
      batch,
      issuedAt: Date.now(),
    };

    setQrValue(JSON.stringify(payload));
  };

  useEffect(() => {
    generateQR();
    const interval = setInterval(generateQR, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ===============================
     SAVE LAB ATTENDANCE
     (Already saved via QR scans)
  ================================ */
  const handleSaveAttendance = async () => {
    const confirm =
      Platform.OS === "web"
        ? window.confirm("Confirm lab attendance?")
        : await new Promise(resolve => {
            Alert.alert(
              "Confirm Save",
              "Attendance has already been recorded. Confirm and close?",
              [
                { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                { text: "Confirm", onPress: () => resolve(true) },
              ]
            );
          });

    if (!confirm) return;

    console.log("✅ Lab attendance finalized:", sessionId);
    alert("Lab attendance saved successfully");
    navigation.goBack();
  };

  /* ===============================
     DELETE LAB ATTENDANCE
     (FULL DELETE FROM DB)
  ================================ */
  const handleDeleteAttendance = async () => {
    const confirm =
      Platform.OS === "web"
        ? window.confirm(
            "This will permanently delete this lab session. Continue?"
          )
        : await new Promise(resolve => {
            Alert.alert(
              "Delete Lab Attendance",
              "This will permanently delete this lab session.",
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
      console.log("🗑️ Deleting lab session:", sessionId);

      await api.delete("/api/lab-attendance/session/delete", {
        data: { sessionId },
      });

      alert("Lab attendance deleted permanently");
      navigation.goBack();
    } catch (err) {
      console.error("❌ Delete lab attendance failed:", err);
      alert("Failed to delete lab attendance");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Lab Attendance</Text>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>🏫 Year {year}</Text>
        <Text style={styles.infoText}>🧑‍🎓 Division {division}</Text>
        <Text style={styles.infoText}>🧪 Batch {batch}</Text>
        <Text style={styles.infoText}>📚 {subject}</Text>
      </View>

      {/* QR */}
      <View style={styles.qrBox}>
        {qrValue ? <QRCode value={qrValue} size={220} /> : <Text>Loading QR...</Text>}
      </View>

      <Text style={styles.hint}>
        QR refreshes every 3 seconds  
        Current + last 2 QRs are valid
      </Text>

      {/* Actions */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAttendance}>
          <Text style={styles.saveText}>Save Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAttendance}>
          <Text style={styles.deleteText}>Delete Lab Attendance</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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

  deleteBtn: {
  backgroundColor: "#fee2e2",
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#fecaca",
  marginTop: 12,
},

deleteText: {
  color: "#b91c1c",
  fontSize: 16,
  fontWeight: "700",
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
  },

  saveText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
