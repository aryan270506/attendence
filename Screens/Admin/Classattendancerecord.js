import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../src/utils/axios';

const ClassAttendanceRecord = ({ route, navigation }) => {
  const { 
    year, 
    division, 
    className, 
    sectionName,
    startDate,
    endDate,
    attendanceType = 'theory' // 'theory' or 'lab'
  } = route.params;
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchAttendanceData();
  }, [year, division, attendanceType, startDate, endDate]);

  // 🔥 HELPER FUNCTION: Extract batch from roll_no
  const extractBatchFromRollNo = (rollNo) => {
    if (!rollNo) return null;
    // Roll no format: "TY-C1-07" or "SY-B2-15"
    const match = rollNo.match(/[A-Z]+-([A-Z]\d+)-\d+/);
    return match && match[1] ? match[1] : null;
  };

  const fetchAttendanceData = async () => {
  setLoading(true);

  try {
    console.log('📊 Fetching attendance for class:', {
      year,
      division,
      attendanceType,
      startDate,
      endDate,
    });

    const yearNumber = parseInt(year);

    // ===============================
    // ✅ FETCH STUDENTS FROM MONGODB
    // ===============================
    const response = await api.get("/api/admin/students", {
      params: { year, division },
    });

    if (!response.data.success || response.data.students.length === 0) {
      console.log('⚠️ No students found for this class');
      setStudents([]);
      setSubjects([]);
      setLoading(false);
      return;
    }

    // Keep SAME structure as Firebase: [key, student]
    const filteredStudents = response.data.students.map(student => [
      student.id,
      student,
    ]);

    console.log(`✅ Found ${filteredStudents.length} students`);

    // ===============================
    // 🔥 COLLECT SUBJECTS / LABS
    // ===============================
    let subjectsList = [];

    if (attendanceType === 'theory') {
      const allSubjects = new Set();
      filteredStudents.forEach(([_, student]) => {
        if (student.subjects) {
          student.subjects.forEach(subject => allSubjects.add(subject));
        }
      });
      subjectsList = Array.from(allSubjects).sort();
    } else {
      const allLabs = new Set();
      filteredStudents.forEach(([_, student]) => {
        if (student.lab) {
          student.lab.forEach(lab => allLabs.add(lab));
        }
      });
      subjectsList = Array.from(allLabs).sort();
    }

    setSubjects(subjectsList);

    console.log(
      `📚 ${attendanceType === 'theory' ? 'Subjects' : 'Labs'} found:`,
      subjectsList
    );

    // ===============================
    // 📊 FETCH ATTENDANCE PER STUDENT
    // ===============================
    const studentPromises = filteredStudents.map(async ([key, student]) => {
      try {
        let attendanceData = [];

        if (attendanceType === 'theory') {
          const studentSubjects = student.subjects || [];

          if (studentSubjects.length > 0) {
            const res = await api.post('/api/attendance/student-summary', {
              studentId: student.id,
              year: yearNumber,
              division,
              subjects: studentSubjects,
            });

            attendanceData = res.data.subjects;
          }
        } else {
          const studentBatch = extractBatchFromRollNo(student.roll_no);

          const studentLabs = student.lab
            ? student.lab
                .filter(Boolean)
                .map(labName => ({
                  name: labName,
                  batch: studentBatch,
                }))
            : [];

          if (studentLabs.length > 0 && studentBatch) {
            const res = await api.post(
              '/api/lab-attendance/student-summary',
              {
                studentId: student.id,
                year: yearNumber,
                division,
                labs: studentLabs,
              }
            );

            attendanceData = res.data.labs.map(lab => ({
              subject: lab.subject,
              present: lab.present,
              total: lab.total,
            }));
          }
        }

        // ===============================
        // 📐 PROCESS ATTENDANCE DATA
        // ===============================
        const subjectAttendance = {};
        let totalPresent = 0;
        let totalClasses = 0;

        const studentCourses =
          attendanceType === 'theory'
            ? student.subjects || []
            : student.lab || [];

        subjectsList.forEach(subject => {
          if (studentCourses.includes(subject)) {
            const subjectData = attendanceData.find(
              item => item.subject === subject
            );

            if (subjectData) {
              const present = subjectData.present;
              const total = subjectData.total;
              const percentage =
                total > 0 ? ((present / total) * 100).toFixed(2) : 0;

              subjectAttendance[subject] = {
                present,
                total,
                percentage,
              };

              totalPresent += present;
              totalClasses += total;
            } else {
              subjectAttendance[subject] = {
                present: 0,
                total: 0,
                percentage: 0,
              };
            }
          } else {
            subjectAttendance[subject] = {
              present: '-',
              total: '-',
              percentage: 'N/A',
            };
          }
        });

        return {
          id: student.id,
          name: student.name,
          studentId: student.id,
          prn: student.prn,
          batch: extractBatchFromRollNo(student.roll_no),
          rollNo: student.roll_no,
          subjectAttendance,
          totalPresent,
          totalClasses,
          overallPercentage:
            totalClasses > 0
              ? ((totalPresent / totalClasses) * 100).toFixed(2)
              : 0,
        };
      } catch (error) {
        console.error(
          `❌ Error fetching attendance for ${student.name}:`,
          error
        );

        const subjectAttendance = {};
        subjectsList.forEach(subject => {
          subjectAttendance[subject] = {
            present: 0,
            total: 0,
            percentage: 0,
          };
        });

        return {
          id: student.id,
          name: student.name,
          studentId: student.id,
          prn: student.prn,
          batch: extractBatchFromRollNo(student.roll_no),
          rollNo: student.roll_no,
          subjectAttendance,
          totalPresent: 0,
          totalClasses: 0,
          overallPercentage: 0,
        };
      }
    });

    const studentsData = await Promise.all(studentPromises);

    // ===============================
    // 🔢 SORT BY ROLL NUMBER
    // ===============================
    const sortedStudents = studentsData.sort((a, b) => {
      const getRoll = rollNo => {
        if (!rollNo) return 999999;
        const match = rollNo.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 999999;
      };
      return getRoll(a.rollNo) - getRoll(b.rollNo);
    });

    setStudents(sortedStudents);
    console.log('✅ Attendance data loaded for all students');
  } catch (error) {
    console.error('❌ Error fetching attendance data:', error);
    Alert.alert('Error', 'Failed to load attendance data. Please try again.');
    setStudents([]);
    setSubjects([]);
  } finally {
    setLoading(false);
  }
};


  const handleStudentClick = (student) => {
    navigation.navigate('StudentAttendanceProfile', {
      studentId: student.id,
      studentName: student.name,
      studentData: {
        ...student,
        year: parseInt(year),
        division: division,
      }
    });
  };

  const generateHTMLTable = () => {
    const dateRangeText = startDate && endDate 
      ? `<p>Date Range: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}</p>`
      : '';

    const subjectColumns = subjects.map(subject => `
      <th colspan="3" class="subject-header">${subject}</th>
    `).join('');

    const subjectSubheaders = subjects.map(() => `
      <th class="sub-header">Att.</th>
      <th class="sub-header">Tot.</th>
      <th class="sub-header">%</th>
    `).join('');

   const studentRows = students.map((student, index) => {
  // Determine overall color
  const overallColor = student.overallPercentage >= 75 ? '#10b981' : 
                      student.overallPercentage >= 50 ? '#f59e0b' : '#ef4444';
  
  const subjectCells = subjects.map(subject => {
    const attendance = student.subjectAttendance[subject] || { present: 0, total: 0, percentage: 0 };
    
    if (attendance.present === '-') {
      return `
        <td colspan="3" class="na-cell">N/A</td>
      `;
    }
    
    const percentageClass = attendance.percentage >= 75 ? 'percentage-good' : 
                            attendance.percentage >= 50 ? 'percentage-average' : 'percentage-poor';
    
    return `
      <td>${attendance.present}</td>
      <td>${attendance.total}</td>
      <td class="${percentageClass}">${attendance.percentage}%</td>
    `;
  }).join('');

  const overallClass = student.overallPercentage >= 75 ? 'percentage-good' : 
                      student.overallPercentage >= 50 ? 'percentage-average' : 'percentage-poor';

  const batchCell = attendanceType === 'lab' 
    ? `<td class="student-batch" style="color: ${overallColor}; font-weight: 600;">${student.batch || 'N/A'}</td>`
    : '';

  return `
    <tr class="data-row">
      <td class="row-number" style="color: ${overallColor}; font-weight: 600;">${index + 1}</td>
      <td class="student-name" style="color: ${overallColor}; font-weight: 600;">${student.name}</td>
      <td class="student-id" style="color: ${overallColor}; font-weight: 600;">${student.studentId}</td>
      <td class="student-prn" style="color: ${overallColor}; font-weight: 600;">${student.prn || 'N/A'}</td>
      ${batchCell}
      ${subjectCells}
      <td class="overall-data">${student.totalPresent}</td>
      <td class="overall-data">${student.totalClasses}</td>
      <td class="${overallClass} overall-percentage">${student.overallPercentage}%</td>
    </tr>
  `;
}).join('');

    const batchHeader = attendanceType === 'lab' 
      ? '<th rowspan="2">Batch</th>'
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${attendanceType === 'theory' ? 'Theory' : 'Lab'} Attendance Record</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 8px;
              background-color: #ffffff;
              margin: 0;
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              border-bottom: 3px solid ${attendanceType === 'lab' ? '#8b5cf6' : '#4f46e5'};
              padding-bottom: 8px;
            }
            .header h1 {
              color: #111827;
              margin: 5px 0;
              font-size: 18px;
            }
            .header p {
              color: #6b7280;
              margin: 3px 0;
              font-size: 11px;
            }
            .info-section {
              margin-bottom: 10px;
              display: flex;
              justify-content: space-around;
              padding: 6px 10px;
              background-color: #f3f4f6;
              border-radius: 4px;
            }
            .info-item {
              font-size: 9px;
              color: #374151;
            }
            .info-item strong {
              color: #111827;
            }
            .table-container {
              width: 100%;
              overflow-x: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              font-size: 8px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 5px 3px;
              text-align: center;
            }
            th {
              background-color: #111827;
              color: white;
              font-weight: 600;
              font-size: 8px;
            }
            .subject-header {
              background-color: ${attendanceType === 'lab' ? '#8b5cf6' : '#4f46e5'};
              color: white;
              padding: 6px 3px;
              font-size: 8px;
              white-space: nowrap;
            }
            .sub-header {
              background-color: ${attendanceType === 'lab' ? '#a78bfa' : '#6366f1'};
              color: white;
              font-size: 7px;
              padding: 4px 2px;
              white-space: nowrap;
            }
            .row-number {
              background-color: #f9fafb;
              font-weight: bold;
              width: 25px;
              min-width: 25px;
            }
            .student-name {
              text-align: left;
              font-weight: 500;
              background-color: #f9fafb;
              min-width: 80px;
              max-width: 120px;
              padding-left: 5px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .student-id {
              background-color: #f9fafb;
              min-width: 50px;
              font-size: 7px;
            }
            .student-prn {
              background-color: #f9fafb;
              min-width: 70px;
              font-size: 7px;
            }
            .student-batch {
              background-color: #fef3c7;
              min-width: 40px;
              font-size: 8px;
              font-weight: 600;
              color: #92400e;
            }
            .data-row:nth-child(even) {
              background-color: #f9fafb;
            }
            .data-row:nth-child(odd) {
              background-color: #ffffff;
            }
            .data-row td {
              font-size: 8px;
            }
            .overall-data {
              font-weight: bold;
              background-color: #d1fae5;
              border-left: 2px solid #059669;
            }
            .overall-percentage {
              font-weight: bold;
              font-size: 9px;
              background-color: #d1fae5;
            }
            .percentage-good {
              color: #10b981;
              font-weight: bold;
            }
            .percentage-average {
              color: #f59e0b;
              font-weight: bold;
            }
            .percentage-poor {
              color: #ef4444;
              font-weight: bold;
            }
            .na-cell {
              background-color: #f3f4f6;
              color: #9ca3af;
              font-style: italic;
            }
            thead tr:first-child th {
              background-color: #111827;
            }
            .overall-header {
              background-color: #059669;
              color: white;
              font-size: 8px;
            }
            .footer {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 7px;
            }
            @media print {
              @page {
                size: landscape;
                margin: 6mm;
              }
              body {
                padding: 5px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${attendanceType === 'theory' ? '📊' : '🧪'} ${attendanceType === 'theory' ? 'Theory' : 'Lab'} Attendance Record</h1>
            <p><strong>${className} - ${sectionName}</strong></p>
            <p>Year ${year} | Division ${division}</p>
            ${dateRangeText}
          </div>

          <div class="info-section">
            <div class="info-item">
              <strong>Total Students:</strong> ${students.length}
            </div>
            <div class="info-item">
              <strong>Date Generated:</strong> ${new Date().toLocaleDateString('en-IN', { 
                day: 'numeric',
                month: 'long', 
                year: 'numeric'
              })}
            </div>
            <div class="info-item">
              <strong>${attendanceType === 'theory' ? 'Subjects' : 'Labs'}:</strong> ${subjects.length}
            </div>
            <div class="info-item">
              <strong>Type:</strong> ${attendanceType === 'theory' ? 'Theory Classes' : 'Lab Sessions'}
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th rowspan="2">No.</th>
                  <th rowspan="2">Student Name</th>
                  <th rowspan="2">Student ID</th>
                  <th rowspan="2">PRN</th>
                  ${batchHeader}
                  ${subjectColumns}
                  <th colspan="3" class="overall-header">Overall Attendance</th>
                </tr>
                <tr>
                  ${subjectSubheaders}
                  <th class="sub-header">Tot. Att.</th>
                  <th class="sub-header">Tot. Lec.</th>
                  <th class="sub-header">%</th>
                </tr>
              </thead>
              <tbody>
                ${studentRows}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
            <p>This is a computer-generated document. Legend: 🟢 ≥75% | 🟡 50-74% | 🔴 <50%</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    if (loading) {
      Alert.alert('Please Wait', 'Attendance data is still loading...');
      return;
    }

    if (students.length === 0) {
      Alert.alert('No Data', 'There is no attendance data to print.');
      return;
    }

    try {
      const html = generateHTMLTable();
      
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        
        Alert.alert(
          'Success',
          'Attendance record generated!',
          [
            {
              text: 'Share',
              onPress: async () => {
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(uri);
                }
              },
            },
            {
              text: 'Print',
              onPress: async () => {
                await Print.printAsync({ uri });
              },
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Error generating print:', error);
      Alert.alert('Error', 'Failed to generate attendance record');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={attendanceType === 'lab' ? '#8b5cf6' : '#4f46e5'} />
          <Text style={styles.loadingText}>
            Loading {attendanceType === 'theory' ? 'theory' : 'lab'} attendance data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {attendanceType === 'theory' ? '📚 Theory' : '🧪 Lab'} Attendance Record
          </Text>
          <Text style={styles.headerSubtitle}>
            {className} - {sectionName} | {students.length} students
          </Text>
          {startDate && endDate && (
            <Text style={styles.dateRangeText}>
              📅 {new Date(startDate).toLocaleDateString('en-IN')} → {new Date(endDate).toLocaleDateString('en-IN')}
            </Text>
          )}
        </View>
        <TouchableOpacity style={[
          styles.printButton,
          attendanceType === 'lab' && styles.printButtonLab
        ]} onPress={handlePrint}>
          <Text style={styles.printButtonText}>🖨️ Print</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>≥75% (Good)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>50-74% (Average)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>&lt;50% (Poor)</Text>
          </View>
        </View>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendance data available</Text>
          <Text style={styles.emptySubtext}>
            Students will appear here once they are added to this class
          </Text>
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.horizontalScroll}
        >
          <ScrollView 
            showsVerticalScrollIndicator={true}
            style={styles.verticalScroll}
          >
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.noCell]}>No.</Text>
                <Text style={[styles.headerCell, styles.nameCell]}>Student Name</Text>
                <Text style={[styles.headerCell, styles.idCell]}>ID</Text>
                <Text style={[styles.headerCell, styles.prnCell]}>PRN</Text>
                {attendanceType === 'lab' && (
                  <Text style={[styles.headerCell, styles.batchCell]}>Batch</Text>
                )}
                
                {subjects.map((subject) => (
                  <View key={subject} style={styles.subjectHeaderGroup}>
                    <Text style={[
                      styles.headerCell, 
                      styles.subjectMainHeader,
                      attendanceType === 'lab' && styles.labSubjectHeader
                    ]}>
                      {subject}
                    </Text>
                    <View style={[
                      styles.subjectSubHeaders,
                      attendanceType === 'lab' && styles.labSubHeadersContainer
                    ]}>
                      <Text style={[
                        styles.subHeaderCell, 
                        styles.attendanceSubCell,
                        attendanceType === 'lab' && styles.labSubHeader
                      ]}>Att.</Text>
                      <Text style={[
                        styles.subHeaderCell, 
                        styles.attendanceSubCell,
                        attendanceType === 'lab' && styles.labSubHeader
                      ]}>Tot.</Text>
                      <Text style={[
                        styles.subHeaderCell, 
                        styles.attendanceSubCell,
                        attendanceType === 'lab' && styles.labSubHeader
                      ]}>%</Text>
                    </View>
                  </View>
                ))}
                
                <View style={styles.overallHeaderGroup}>
                  <Text style={[styles.headerCell, styles.overallMainHeader]}>Overall</Text>
                  <View style={styles.subjectSubHeaders}>
                    <Text style={[styles.subHeaderCell, styles.overallSubCell]}>Att.</Text>
                    <Text style={[styles.subHeaderCell, styles.overallSubCell]}>Tot.</Text>
                    <Text style={[styles.subHeaderCell, styles.overallSubCell]}>%</Text>
                  </View>
                </View>
              </View>

              {/* Table Rows */}
              {students.map((student, index) => {
  // Determine the color based on overall percentage
  const overallColor = 
    student.overallPercentage >= 75 ? '#10b981' : 
    student.overallPercentage >= 50 ? '#f59e0b' : '#ef4444';
  
  return (
    <TouchableOpacity
      key={student.id}
      onPress={() => handleStudentClick(student)}
      activeOpacity={0.7}
    >
      <View 
        style={[
          styles.tableRow, 
          index % 2 === 0 ? styles.evenRow : styles.oddRow
        ]}
      >
        <Text style={[styles.cell, styles.noCell, { color: overallColor, fontWeight: '600' }]}>
          {index + 1}
        </Text>
        <Text style={[styles.cell, styles.nameCell, styles.nameText, { color: overallColor }]}>
          {student.name}
        </Text>
        <Text style={[styles.cell, styles.idCell, { color: overallColor, fontWeight: '600' }]}>
          {student.studentId}
        </Text>
        <Text style={[styles.cell, styles.prnCell, { color: overallColor, fontWeight: '600' }]}>
          {student.prn || 'N/A'}
        </Text>
        {attendanceType === 'lab' && (
          <Text style={[styles.cell, styles.batchCell, styles.batchText, { color: overallColor }]}>
            {student.batch || 'N/A'}
          </Text>
        )}
        
        {subjects.map((subject) => {
          const attendance = student.subjectAttendance[subject] || { 
            present: 0, 
            total: 0, 
            percentage: 0 
          };

          if (attendance.present === '-') {
            return (
              <Text 
                key={subject} 
                style={[styles.cell, styles.naCell, { width: 210 }]}
              >
                N/A
              </Text>
            );
          }
          
          const percentageColor = 
            attendance.percentage >= 75 ? '#10b981' : 
            attendance.percentage >= 50 ? '#f59e0b' : '#ef4444';
          
          return (
            <React.Fragment key={subject}>
              <Text style={[styles.cell, styles.attendanceSubCell]}>{attendance.present}</Text>
              <Text style={[styles.cell, styles.attendanceSubCell]}>{attendance.total}</Text>
              <Text style={[styles.cell, styles.attendanceSubCell, { color: percentageColor, fontWeight: 'bold' }]}>
                {attendance.percentage}%
              </Text>
            </React.Fragment>
          );
        })}
        
        <Text style={[styles.cell, styles.overallSubCell, styles.boldText]}>{student.totalPresent}</Text>
        <Text style={[styles.cell, styles.overallSubCell, styles.boldText]}>{student.totalClasses}</Text>
        <Text style={[
          styles.cell, 
          styles.overallSubCell, 
          styles.boldText,
          { color: overallColor }
        ]}>
          {student.overallPercentage}%
        </Text>
      </View>
    </TouchableOpacity>
  );
})}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ClassAttendanceRecord;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  dateRangeText: {
    fontSize: 13,
    color: '#8b5cf6',
    marginTop: 4,
    fontWeight: '600',
  },
  printButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  printButtonLab: {
    backgroundColor: '#8b5cf6',
  },
  printButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  horizontalScroll: {
    flex: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  tableContainer: {
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    padding: 12,
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  noCell: {
    width: 50,
    minWidth: 50,
  },
  nameCell: {
    width: 150,
    minWidth: 150,
    textAlign: 'left',
  },
  idCell: {
    width: 80,
    minWidth: 80,
  },
  prnCell: {
    width: 120,
    minWidth: 120,
  },
  batchCell: {
    width: 80,
    minWidth: 80,
  },
  batchText: {
    
    fontWeight: '600',
  },
  subjectHeaderGroup: {
    borderLeftWidth: 1,
    borderLeftColor: '#374151',
  },
  subjectMainHeader: {
    backgroundColor: '#4f46e5',
    padding: 8,
    fontSize: 11,
  },
  labSubjectHeader: {
    backgroundColor: '#8b5cf6',
  },
  subjectSubHeaders: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
  },
  labSubHeadersContainer: {
    backgroundColor: '#a78bfa',
  },
  subHeaderCell: {
    padding: 6,
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  labSubHeader: {
    backgroundColor: '#a78bfa',
  },
  attendanceSubCell: {
    width: 70,
    minWidth: 70,
  },
  overallHeaderGroup: {
    borderLeftWidth: 2,
    borderLeftColor: '#059669',
  },
  overallMainHeader: {
    backgroundColor: '#059669',
    padding: 8,
    fontSize: 11,
  },
  overallSubCell: {
    width: 70,
    minWidth: 70,
    backgroundColor: '#d1fae5',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  evenRow: {
    backgroundColor: '#f9fafb',
  },
  oddRow: {
    backgroundColor: '#ffffff',
  },
  cell: {
    padding: 12,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  nameText: {
    textAlign: 'left',
    fontWeight: '500',
  },
  naCell: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  boldText: {
    fontWeight: '700',
  },
});