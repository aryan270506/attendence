import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AttendanceScreen from './Student-Record';
import StudentQRScannerScreen from './Qr-Scanner';
import StudentProfile from './Student-Profile';
import { SafeAreaView } from 'react-native-safe-area-context';


// Placeholder screens for each tab



const ProfileScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenTitle}>Profile Screen</Text>
    <Text style={styles.screenSubtitle}>Your profile information</Text>
  </View>
);

const Studentdashboard = () => {
  const [activeTab, setActiveTab] = useState('qr');

  const renderScreen = () => {
    switch (activeTab) {
      case 'record':
  return <AttendanceScreen />;

      case 'qr':
        return <StudentQRScannerScreen />;
      case 'profile':
        return <StudentProfile />;
      default:
        return <StudentQRScannerScreen />;
    }
  };

  return (
    
    <SafeAreaView style={{ flex: 1 }}>
      {/* Main Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Custom Bottom Tab Navigator */}
      <View style={styles.tabBarContainer}>
        {/* Record Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('record')}
        >
          <View style={[styles.iconContainer, activeTab === 'record' && styles.activeIconContainer]}>
            <View style={styles.recordIcon}>
              <View style={styles.recordIconInner} />
            </View>
          </View>
          <Text style={[styles.tabLabel, activeTab === 'record' && styles.activeTabLabel]}>
            Record
          </Text>
        </TouchableOpacity>

        {/* QR Scanner Tab (Highlighted/Elevated) */}
        <TouchableOpacity
          style={styles.qrTabButton}
          onPress={() => setActiveTab('qr')}
        >
          <View style={styles.qrButtonElevated}>
            <View style={styles.qrIcon}>
              <View style={styles.qrIconTopLeft} />
              <View style={styles.qrIconTopRight} />
              <View style={styles.qrIconBottomLeft} />
              <View style={styles.qrIconBottomRight} />
            </View>
          </View>
          <Text style={[styles.tabLabel, styles.qrTabLabel]}>
            Scan QR
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('profile')}
        >
          <View style={[styles.iconContainer, activeTab === 'profile' && styles.activeIconContainer]}>
            <View style={styles.profileIcon}>
              <View style={styles.profileIconHead} />
              <View style={styles.profileIconBody} />
            </View>
          </View>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.activeTabLabel]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  qrTabButton: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: -25,
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    opacity: 1,
  },
  qrButtonElevated: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5B21B6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#5B21B6',
    fontWeight: '600',
  },
  qrTabLabel: {
    color: '#5B21B6',
    fontWeight: '600',
  },
  // Record Icon
  recordIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIconInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  // QR Scanner Icon
  qrIcon: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  qrIconTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#ffffff',
  },
  qrIconTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#ffffff',
  },
  qrIconBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#ffffff',
  },
  qrIconBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#ffffff',
  },
  // Profile Icon
  profileIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666',
    marginBottom: 2,
  },
  profileIconBody: {
    width: 18,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#666',
  },
});

export default Studentdashboard;