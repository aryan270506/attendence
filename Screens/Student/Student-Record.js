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


const extractBatchFromRollNo = (rollNo) => {
  if (!rollNo) return null;
  // FY-A1-01 → A1
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
        <View style={styles.subjectHeader}>
          <Text style={styles.subjectName}>{subject}</Text>
        </View>
        <Text style={styles.subjectStats}>
          {present}/{total} classes
        </Text>
      </View>
      <AttendanceCircle percentage={percentage} size={70} />
    </View>
  );
};

/* -------------------- Main Screen -------------------- */
export default function AttendanceScreen() {
  const [subjects, setSubjects] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    year: '',
    division: '',
  });

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);

      const studentId = await getItem('studentId');
      if (!studentId) return;

      /* -------- MongoDB: Student + Subjects + Labs -------- */
      const studentRes = await api.get(
        `/api/student/me/${studentId}`
      );

      const student = studentRes.data;

      setStudentInfo({
        name: student.name || 'Student',
        year: student.year,
        division: student.division,
      });

      const subjectsList = student.subjects || [];
      const labsList = student.lab || [];

      /* -------- THEORY ATTENDANCE (UNCHANGED) -------- */
      const theoryRes = await api.post(
        '/api/attendance/student-summary',
        {
          studentId,
          year: Number(student.year),
          division: student.division,
          subjects: subjectsList,
        }
      );

      setSubjects(theoryRes.data.subjects || []);

      /* -------- LAB ATTENDANCE (UNCHANGED) -------- */
      const batch = extractBatchFromRollNo(student.roll_no);

if (!batch) {
  console.log("❌ Batch not found from roll number");
  setLabs([]);
  return;
}

const labsWithBatch = labsList
  .filter(Boolean)
  .map((labName) => ({
    name: labName,
    batch: batch,
  }));

console.log("🧪 Sending labs with batch:", labsWithBatch);

const labRes = await api.post(
  '/api/lab-attendance/student-summary',
  {
    studentId,
    year: Number(student.year),
    division: student.division,
    labs: labsWithBatch, // ✅ FIXED
  }
);


console.log("🧪 Lab API response:", labRes.data);

setLabs(
  (labRes.data.labs || []).map((lab, index) => ({
    subject: labsList[index], // ✅ attach name from MongoDB
    present: lab.present,
    total: lab.total,
    isLab: true,
  }))
);

console.log("🧪 Mongo labsList:", labsList);
console.log("🧪 Lab response keys:", Object.keys(labRes.data));
console.log("🧪 labRes.data.labs:", labRes.data.labs);


    } catch (error) {
      console.error(
        '❌ Attendance fetch error:',
        error.response?.data || error.message
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

  /* -------- Overall Attendance -------- */
  const allItems = [...subjects, ...labs];
  const totalPresent = allItems.reduce((s, i) => s + i.present, 0);
  const totalClasses = allItems.reduce((s, i) => s + i.total, 0);
  const overallAttendance =
    totalClasses > 0
      ? Math.round((totalPresent / totalClasses) * 100)
      : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>
          Loading your attendance...
        </Text>
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
        <Text style={styles.headerTitle}>Attendance Overview</Text>
        <Text style={styles.headerSubtitle}>
          {studentInfo.name} • Year {studentInfo.year} • Division{' '}
          {studentInfo.division}
        </Text>
      </View>

      <View style={styles.overallSection}>
        <Text style={styles.overallLabel}>Overall Attendance</Text>
        <AttendanceCircle percentage={overallAttendance} size={160} />
        <Text style={styles.overallSubtext}>
          {totalPresent} / {totalClasses} classes attended
        </Text>
      </View>

      <View style={styles.subjectsSection}>
        {subjects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Theory Subjects</Text>
            {subjects.map((s, i) => (
              <SubjectCard key={`s-${i}`} {...s} />
            ))}
          </>
        )}

        {labs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              Lab Subjects
            </Text>
            {labs.map((l, i) => (
              <SubjectCard key={`l-${i}`} {...l} />
            ))}
          </>
        )}

        {subjects.length === 0 && labs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              No Attendance Records Yet
            </Text>
            <Text style={styles.emptyStateText}>
              Attendance will appear once lectures are conducted
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}


// Styles
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
});