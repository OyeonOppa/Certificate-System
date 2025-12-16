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
    
    // โหลดรายชื่อนักศึกษาสำหรับหลักสูตรนี้
    loadStudentList(course);
    
    goToStep(2);
}

// โหลดรายชื่อนักศึกษาจาก Google Sheets
function loadStudentList(course) {
    const optionsContainer = document.getElementById('customOptions');
    optionsContainer.innerHTML = '<div class="custom-option" data-value="">กำลังโหลดรายชื่อ...</div>';
    
    const callbackName = 'studentListCallback_' + Date.now();
    window[callbackName] = function(result) {
        if (result.success && result.data.length > 0) {
            optionsContainer.innerHTML = '';
            
            result.data.forEach(student => {
                const option = document.createElement('div');
                option.className = 'custom-option';
                option.dataset.value = JSON.stringify({
                    studentId: student.studentId,
                    fullName: student.fullName
                });
                option.textContent = `${student.studentId} - ${student.fullName}`;
                
                // เมื่อคลิกเลือก
                option.addEventListener('click', function() {
                    selectCustomOption(this);
                });
                
                optionsContainer.appendChild(option);
            });
            
            // เพิ่ม custom dropdown functionality
            initCustomDropdown();
        } else {
            optionsContainer.innerHTML = '<div class="custom-option" data-value="">ไม่พบข้อมูลนักศึกษา</div>';
        }
        
        // Cleanup
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    const params = new URLSearchParams({
        action: 'getStudentList',
        callback: callbackName,
        course: course
    });
    
    const script = document.createElement('script');
    script.src = `${WEB_APP_URL}?${params.toString()}`;
    script.onerror = function() {
        optionsContainer.innerHTML = '<div class="custom-option" data-value="">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
}

// Custom Dropdown Functions
function initCustomDropdown() {
    const customSelect = document.getElementById('customSelect');
    const trigger = customSelect.querySelector('.custom-select-trigger');
    
    // Toggle dropdown
    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        customSelect.classList.toggle('open');
    });
    
    // Close when clicking outside
    document.addEventListener('click', function(e) {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });
}

function selectCustomOption(optionElement) {
    const value = optionElement.dataset.value;
    const text = optionElement.textContent;
    
    if (!value) return;
    
    // Update UI
    document.getElementById('selectedText').textContent = text;
    document.getElementById('studentSelect').value = value;
    
    // Update selected state
    document.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    optionElement.classList.add('selected');
    
    // Close dropdown
    document.getElementById('customSelect').classList.remove('open');
}

// ========================================
// Step 2: Verify Identity
// ========================================

document.getElementById('verifyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const selectedOption = document.getElementById('studentSelect').value;
    const pdpaConsent = document.getElementById('pdpaConsent').checked;
    
    if (!selectedOption) {
        alert('กรุณาเลือกชื่อของท่าน');
        return;
    }
    
    if (!pdpaConsent) {
        alert('กรุณายินยอมให้เก็บรวบรวมข้อมูลส่วนบุคคล');
        return;
    }
    
    const student = JSON.parse(selectedOption);
    const studentId = student.studentId;
    const fullName = student.fullName;
    
    // Show loading
    document.getElementById('verifyLoading').style.display = 'flex';
    
    // ใช้ JSONP
    const callbackName = 'verifyCallback_' + Date.now();
    window[callbackName] = function(result) {
        document.getElementById('verifyLoading').style.display = 'none';
        
        if (result.success) {
            // ตรวจสอบว่าลงทะเบียนแล้วหรือยัง
            if (result.data.alreadyRegistered) {
                // ลงทะเบียนแล้ว - แสดงข้อมูลที่มีอยู่
                showAlreadyRegistered(result.data.data);
            } else {
                // ยังไม่ลงทะเบียน - ดำเนินการต่อ
                studentData = result.data.data;
                populateStep3();
                goToStep(3);
            }
        } else {
            // กรณีลงทะเบียนซ้ำ
            if (result.data && result.data.alreadyRegistered) {
                showAlreadyRegistered(result.data.data);
            } else {
                alert('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
            }
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
                <p style="margin-top: 15px; color: #6b7280;">กรุณาติดต่อเจ้าหน้าที่หลักสูตร<br>เพื่อประสานงานขอรับใบประกาศนียบัตรภายหลัง</p>
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
// ========================================
// Demo Mode - ถูกปิดการใช้งานแล้ว
// ========================================

// *** ระบบนี้ใช้ JSONP ไม่ต้องการ Demo Mode ***
// *** กรุณาใส่ WEB_APP_URL ที่ถูกต้องด้านบน ***