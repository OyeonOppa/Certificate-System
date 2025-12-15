// ========================================
// Configuration
// ========================================

// *** ใส่ URL ของ Google Apps Script Web App ที่นี่ ***
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwHj4M8CBdfQNb4so1IKhyWJAqvTSU03qvXt88Bl55j6Lds-UnS8ULre8OG1n3uK05m/exec';

// ========================================
// Global Variables
// ========================================

let selectedCourse = '';
let studentData = {};

// ========================================
// Step Navigation
// ========================================

function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all progress steps
    document.querySelectorAll('.progress-step').forEach(progressStep => {
        progressStep.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Add active class to current progress step
    document.querySelectorAll(`.progress-step[data-step="${step}"]`).forEach(progressStep => {
        progressStep.classList.add('active');
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// Step 1: Course Selection
// ========================================

function selectCourse(course) {
    selectedCourse = course;
    document.getElementById('selectedCourseDisplay').textContent = course;
    goToStep(2);
}

// ========================================
// Step 2: Verify Identity
// ========================================

document.getElementById('verifyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('studentId').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    
    if (!studentId || !fullName) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    // Show loading
    document.getElementById('verifyLoading').style.display = 'flex';
    
    // ใช้ JSONP แทน fetch
    const callbackName = 'verifyCallback_' + Date.now();
    window[callbackName] = function(result) {
        document.getElementById('verifyLoading').style.display = 'none';
        
        if (result.success) {
            if (result.data.alreadyRegistered) {
                showAlreadyRegistered(result.data.data);
            } else {
                studentData = result.data.data;
                populateStep3();
                goToStep(3);
            }
        } else {
            alert('ไม่พบข้อมูลของท่านในระบบ\nกรุณาตรวจสอบรหัสนักศึกษาและชื่อ-นามสกุลให้ถูกต้อง');
        }
        
        // Cleanup
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    const params = new URLSearchParams({
        action: 'verifyStudent',
        callback: callbackName,
        course: selectedCourse,
        studentId: studentId,
        fullName: fullName
    });
    
    const script = document.createElement('script');
    script.src = `${WEB_APP_URL}?${params.toString()}`;
    script.onerror = function() {
        document.getElementById('verifyLoading').style.display = 'none';
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
});

function populateStep3() {
    document.getElementById('confirmCourse').textContent = selectedCourse;
    document.getElementById('confirmStudentId').textContent = studentData.studentId;
    document.getElementById('confirmFullName').textContent = studentData.fullName;
}

// ========================================
// Step 3: Confirm Attendance
// ========================================

document.getElementById('confirmForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const attendance = document.querySelector('input[name="attendance"]:checked');
    
    if (!email || !phone || !attendance) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('รูปแบบอีเมลไม่ถูกต้อง');
        return;
    }
    
    // Validate phone format (10 digits)
    const phoneClean = phone.replace(/[^0-9]/g, '');
    if (phoneClean.length !== 10) {
        alert('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก');
        return;
    }
    
    // Show loading
    document.getElementById('confirmLoading').style.display = 'flex';
    
    // ใช้ JSONP
    const callbackName = 'registerCallback_' + Date.now();
    window[callbackName] = function(result) {
        document.getElementById('confirmLoading').style.display = 'none';
        
        if (result.success) {
            showSuccess(attendance.value, email, phoneClean);
        } else {
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        }
        
        // Cleanup
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    const params = new URLSearchParams({
        action: 'registerAttendance',
        callback: callbackName,
        course: selectedCourse,
        studentId: studentData.studentId,
        fullName: studentData.fullName,
        email: email,
        phone: phoneClean,
        attendance: attendance.value
    });
    
    const script = document.createElement('script');
    script.src = `${WEB_APP_URL}?${params.toString()}`;
    script.onerror = function() {
        document.getElementById('confirmLoading').style.display = 'none';
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
});

// ========================================
// Success & Already Registered
// ========================================

function showSuccess(attendance, email, phone) {
    const detailsDiv = document.getElementById('successDetails');
    
    let message = '';
    if (attendance === 'เข้าร่วม') {
        message = `
            <div class="success-info">
                <p><strong>หลักสูตร:</strong> ${selectedCourse}</p>
                <p><strong>ชื่อ-นามสกุล:</strong> ${studentData.fullName}</p>
                <p><strong>อีเมล:</strong> ${email}</p>
                <p><strong>เบอร์โทรศัพท์:</strong> ${formatPhone(phone)}</p>
                <p><strong>สถานะ:</strong> <span style="color: #10b981; font-weight: bold;">✓ ยืนยันเข้าร่วม</span></p>
                <p style="margin-top: 15px; color: #6b7280;">กรุณาตรวจสอบอีเมลเพื่อดูรายละเอียดเพิ่มเติม<br>กรุณามาถึงสถานที่จัดงานล่วงหน้า 30 นาที</p>
            </div>
        `;
    } else {
        message = `
            <div class="success-info">
                <p><strong>หลักสูตร:</strong> ${selectedCourse}</p>
                <p><strong>ชื่อ-นามสกุล:</strong> ${studentData.fullName}</p>
                <p><strong>อีเมล:</strong> ${email}</p>
                <p><strong>เบอร์โทรศัพท์:</strong> ${formatPhone(phone)}</p>
                <p><strong>สถานะ:</strong> <span style="color: #f59e0b; font-weight: bold;">ไม่เข้าร่วม</span></p>
                <p style="margin-top: 15px; color: #6b7280;">สถาบันจะจัดส่งใบประกาศนียบัตรให้ท่านทางไปรษณีย์ลงทะเบียน<br>และจะติดต่อกลับเพื่อยืนยันที่อยู่ในการจัดส่ง</p>
            </div>
        `;
    }
    
    detailsDiv.innerHTML = message;
    
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show success message
    document.getElementById('successMessage').classList.add('active');
}

function formatPhone(phone) {
    // Format: 081-234-5678
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
}

function showAlreadyRegistered(data) {
    const detailsDiv = document.getElementById('registeredDetails');
    
    let statusText = '';
    let statusColor = '';
    
    if (data.status === 'เข้าร่วม') {
        statusText = '✓ ยืนยันเข้าร่วม';
        statusColor = '#10b981';
    } else if (data.status === 'ไม่เข้าร่วม') {
        statusText = 'ไม่เข้าร่วม';
        statusColor = '#f59e0b';
    }
    
    const message = `
        <div class="registered-info">
            <p><strong>หลักสูตร:</strong> ${selectedCourse}</p>
            <p><strong>รหัสนักศึกษา:</strong> ${data.studentId}</p>
            <p><strong>ชื่อ-นามสกุล:</strong> ${data.fullName}</p>
            <p><strong>สถานะ:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
            <p><strong>วันที่ลงทะเบียน:</strong> ${data.registeredDate} ${data.registeredTime}</p>
        </div>
    `;
    
    detailsDiv.innerHTML = message;
    
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show already registered message
    document.getElementById('alreadyRegistered').classList.add('active');
}

// ========================================
// Demo Mode (สำหรับทดสอบ - ลบออกตอน Deploy จริง)
// ========================================

// *** ลบโค้ดนี้ออกเมื่อเชื่อมต่อกับ Google Apps Script จริง ***

// ถ้า WEB_APP_URL ยังไม่ได้ตั้ง ให้ใช้ Demo Mode
if (WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
    console.log('🔴 Demo Mode Active - ใช้ข้อมูลจำลอง');
    
    // Override fetch function for demo
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
        if (url.includes('verifyStudent')) {
            const body = JSON.parse(options.body);
            
            // จำลองการหาข้อมูล
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // ตัวอย่างข้อมูลนักศึกษา
            const mockStudents = {
                'ปปร.': [
                    { studentId: '001', fullName: 'นายสมชาย ใจดี' },
                    { studentId: '002', fullName: 'นางสาวสมหญิง สวยงาม' },
                ],
                'ปรม.': [
                    { studentId: '101', fullName: 'นายสมศักดิ์ ดีมาก' },
                ],
                'ปศส.': [
                    { studentId: '201', fullName: 'นางสาวสมใจ รักเรียน' },
                ],
                'สสสส.': [
                    { studentId: '301', fullName: 'นายสมบูรณ์ มีชัย' },
                ],
                'ปบถ.': [
                    { studentId: '401', fullName: 'นางสาวสมทรง แข็งแรง' },
                ]
            };
            
            const students = mockStudents[body.course] || [];
            const found = students.find(s => 
                s.studentId === body.studentId && 
                s.fullName.toLowerCase() === body.fullName.toLowerCase()
            );
            
            if (found) {
                return {
                    json: async () => ({
                        success: true,
                        data: {
                            alreadyRegistered: false,
                            data: found
                        }
                    })
                };
            } else {
                return {
                    json: async () => ({
                        success: false,
                        message: 'Student not found'
                    })
                };
            }
        }
        
        if (url.includes('registerAttendance')) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                json: async () => ({
                    success: true,
                    message: 'Registration successful'
                })
            };
        }
        
        return originalFetch(url, options);
    };
}