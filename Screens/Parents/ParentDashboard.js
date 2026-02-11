import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getItem } from '../../src/utils/storage';
import api from '../../src/utils/axios';
import { TouchableOpacity, Alert } from 'react-native';
import { removeItem } from '../../src/utils/storage';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';




/* -------------------- Batch Extract -------------------- */
const extractBatchFromRollNo = (rollNo) => {
  if (!rollNo) return null;
  const parts = rollNo.split("-");
  return parts.length >= 2 ? parts[1] : null;
};

/* -------------------- Circular Progress -------------------- */
const AttendanceCircle = ({ percentage, size = 120 }) => {
  const getColor = () => {
    if (percentage < 60) return '#EF4444';
    if (percentage < 80) return '#F59E0B';
    return '#10B981';
  };

  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.circleContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="12"
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth="12"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.percentageContainer}>
        <Text
          style={[
            styles.percentageText,
            { fontSize: size / 4, color: getColor() },
          ]}
        >
          {percentage}%
        </Text>
      </View>
    </View>
  );
};

/* -------------------- Subject Card -------------------- */
const SubjectCard = ({ subject, present, total }) => {
  const percentage =
    total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <View style={styles.subjectCard}>
      <View style={styles.subjectInfo}>
        <Text style={styles.subjectName}>{subject}</Text>
        <Text style={styles.subjectStats}>
          {present}/{total} classes
        </Text>
      </View>
      <AttendanceCircle percentage={percentage} size={70} />
    </View>
  );
};

/* -------------------- MAIN SCREEN -------------------- */
export default function ParentAttendanceScreen() {
  const [subjects, setSubjects] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    year: '',
    division: '',
  });

  const navigation = useNavigation();

  const handleLogout = async () => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      'Are you sure you want to logout?'
    );

    if (!confirmed) return;

    await removeItem('parentId');
    await removeItem('userType');

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  } else {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await removeItem('parentId');
            await removeItem('userType');

            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  }
};



  const fetchAttendanceData = async () => {
    try {
      setLoading(true);

      /* 🔑 PARENT ID */
      const parentId = await getItem('parentId');
      if (!parentId) return;

      /* --------------------
         FETCH STUDENT VIA PARENT
      -------------------- */
      const parentRes = await api.get(
        `/api/parent/profile/${parentId}`
      );

      const student = parentRes.data.parent;

      setStudentInfo({
        name: student.name,
        year: student.year,
        division: student.division,
      });

      const subjectsList = student.subjects || [];
      const labsList = student.lab || [];

      /* --------------------
         THEORY ATTENDANCE
      -------------------- */
      const theoryRes = await api.post(
        '/api/attendance/student-summary',
        {
          studentId: student.id, // 🔥 derived from parent
          year: Number(student.year),
          division: student.division,
          subjects: subjectsList,
        }
      );

      setSubjects(theoryRes.data.subjects || []);

      /* --------------------
         LAB ATTENDANCE
      -------------------- */
      const batch = extractBatchFromRollNo(student.roll_no);
      if (!batch) {
        setLabs([]);
        return;
      }

      const labsWithBatch = labsList.map((lab) => ({
        name: lab,
        batch,
      }));

      const labRes = await api.post(
        '/api/lab-attendance/student-summary',
        {
          studentId: student.id,
          year: Number(student.year),
          division: student.division,
          labs: labsWithBatch,
        }
      );

      setLabs(
        (labRes.data.labs || []).map((lab, index) => ({
          subject: labsList[index],
          present: lab.present,
          total: lab.total,
        }))
      );
    } catch (err) {
      console.error(
        '❌ Parent attendance fetch error:',
        err.response?.data || err.message
      );
      setSubjects([]);
      setLabs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceData();
  };

  /* -------------------- OVERALL -------------------- */
  const all = [...subjects, ...labs];
  const totalPresent = all.reduce((s, i) => s + i.present, 0);
  const totalClasses = all.reduce((s, i) => s + i.total, 0);
  const overall =
    totalClasses > 0
      ? Math.round((totalPresent / totalClasses) * 100)
      : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Attendance</Text>
        <Text style={styles.headerSubtitle}>
          {studentInfo.name} • Year {studentInfo.year} • Division{' '}
          {studentInfo.division}
        </Text>
      </View>

      <View style={styles.overallSection}>
        <AttendanceCircle percentage={overall} size={160} />
        <Text>
          {totalPresent}/{totalClasses} classes attended
        </Text>
      </View>

      <View style={styles.subjectsSection}>
        {subjects.map((s, i) => (
          <SubjectCard key={`s-${i}`} {...s} />
        ))}
        {labs.map((l, i) => (
          <SubjectCard key={`l-${i}`} {...l} />
        ))}
      </View>

      <View style={styles.logoutContainer}>
  <TouchableOpacity
    style={styles.logoutButton}
    onPress={handleLogout}
  >
    <Text style={styles.logoutText}>Logout</Text>
  </TouchableOpacity>
</View>

    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  overallSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  overallLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
  },
  overallSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 15,
  },
  circleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontWeight: 'bold',
  },
  subjectsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 15,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  labBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  labBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subjectStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    backgroundColor: '#F3F4F6',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  logoutContainer: {
  marginTop: 30,
  marginBottom: 40,
  alignItems: 'center',
},

logoutButton: {
  backgroundColor: '#EF4444',
  paddingVertical: 14,
  paddingHorizontal: 40,
  borderRadius: 14,
  width: '90%',
  alignItems: 'center',
},

logoutText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},

});