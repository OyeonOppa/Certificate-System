const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwHj4M8CBdfQNb4so1IKhyWJAqvTSU03qvXt88Bl55j6Lds-UnS8ULre8OG1n3uK05m/exec';
let allStudentsData = [];
let currentCourse = 'all';

// Login
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    showLoading('กำลังตรวจสอบรหัสผ่าน...');
    
    // ใช้ JSONP แทน fetch
    const callbackName = 'authCallback_' + Date.now();
    window[callbackName] = function(result) {
        hideLoading();
        
        if (result.success && result.data.authenticated) {
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('adminDashboard').classList.add('active');
            loadAllData();
        } else {
            alert('รหัสผ่านไม่ถูกต้อง');
        }
        
        // Cleanup
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    const params = new URLSearchParams({
        action: 'authenticateAdmin',
        callback: callbackName,
        password: password
    });
    
    const script = document.createElement('script');
    script.src = `${WEB_APP_URL}?${params.toString()}`;
    script.onerror = function() {
        hideLoading();
        alert('เกิดข้อผิดพลาด');
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
});

function logout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        document.getElementById('adminDashboard').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('loginForm').reset();
    }
}

// Load Data
async function loadAllData() {
    showLoading('กำลังโหลดข้อมูล...');
    
    const callbackName = 'dataCallback_' + Date.now();
    window[callbackName] = function(result) {
        if (result.success) {
            allStudentsData = result.data;
            updateDashboard();
            updateTable();
        }
        hideLoading();
        
        // Cleanup
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    const params = new URLSearchParams({
        action: 'getAdminData',
        callback: callbackName
    });
    
    const script = document.createElement('script');
    script.src = `${WEB_APP_URL}?${params.toString()}`;
    script.onerror = function() {
        hideLoading();
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
}

function refreshData() { loadAllData(); }

function updateDashboard() {
    const total = allStudentsData.length;
    const registered = allStudentsData.filter(s => s.status).length;
    const attending = allStudentsData.filter(s => s.status === 'เข้าร่วม').length;
    const notAttending = allStudentsData.filter(s => s.status === 'ไม่เข้าร่วม').length;
    const pending = total - registered;
    
    document.getElementById('totalStudents').textContent = total;
    document.getElementById('totalRegistered').textContent = registered;
    document.getElementById('totalAttending').textContent = attending;
    document.getElementById('totalNotAttending').textContent = notAttending;
    document.getElementById('totalPending').textContent = pending;
    
    updateCourseStats();
}

function updateCourseStats() {
    let filtered = currentCourse === 'all' ? allStudentsData : allStudentsData.filter(s => s.course === currentCourse);
    const total = filtered.length;
    const registered = filtered.filter(s => s.status).length;
    const attending = filtered.filter(s => s.status === 'เข้าร่วม').length;
    const notAttending = filtered.filter(s => s.status === 'ไม่เข้าร่วม').length;
    const pending = total - registered;
    
    document.getElementById('courseTotal').textContent = total;
    document.getElementById('courseRegistered').textContent = registered;
    document.getElementById('courseAttending').textContent = attending;
    document.getElementById('courseNotAttending').textContent = notAttending;
    document.getElementById('coursePending').textContent = pending;
}

function switchCourse(course) {
    currentCourse = course;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[data-course="${course}"]`).classList.add('active');
    updateCourseStats();
    updateTable();
}

function updateTable() {
    let filtered = currentCourse === 'all' ? allStudentsData : allStudentsData.filter(s => s.course === currentCourse);
    
    const search = document.getElementById('searchInput').value.toLowerCase();
    if (search) {
        filtered = filtered.filter(s =>
            s.studentId.toLowerCase().includes(search) ||
            s.fullName.toLowerCase().includes(search) ||
            (s.email && s.email.toLowerCase().includes(search))
        );
    }
    
    const statusFilter = document.getElementById('statusFilter').value;
    if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
            filtered = filtered.filter(s => !s.status);
        } else {
            filtered = filtered.filter(s => s.status === statusFilter);
        }
    }
    
    document.getElementById('displayCount').textContent = filtered.length;
    document.getElementById('totalCount').textContent = currentCourse === 'all' ? allStudentsData.length : allStudentsData.filter(s => s.course === currentCourse).length;
    
    const tbody = document.getElementById('tableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">ไม่พบข้อมูล</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map((s, i) => {
        let badge = '';
        if (s.status === 'เข้าร่วม') badge = '<span class="status-badge attending">เข้าร่วม</span>';
        else if (s.status === 'ไม่เข้าร่วม') badge = '<span class="status-badge not-attending">ไม่เข้าร่วม</span>';
        else badge = '<span class="status-badge pending">รอลงทะเบียน</span>';
        
        return `
            <tr>
                <td>${i + 1}</td>
                <td>${s.course}</td>
                <td>${s.studentId}</td>
                <td>${s.fullName}</td>
                <td>${s.email || '-'}</td>
                <td>${s.phone || '-'}</td>
                <td>${badge}</td>
                <td>${s.registeredDate || '-'}</td>
                <td>${s.registeredTime || '-'}</td>
            </tr>
        `;
    }).join('');
}

function filterTable() { updateTable(); }

function exportData() {
    let data = currentCourse === 'all' ? allStudentsData : allStudentsData.filter(s => s.course === currentCourse);
    if (data.length === 0) { alert('ไม่มีข้อมูลให้ Export'); return; }
    
    let csv = '\uFEFF';
    csv += 'หลักสูตร,รหัสนักศึกษา,ชื่อ-นามสกุล,อีเมล,เบอร์โทร,สถานะ,วันที่ตอบรับ,เวลาที่ตอบรับ\n';
    data.forEach(s => {
        csv += `${s.course},${s.studentId},"${s.fullName}",${s.email||''},${s.phone||''},${s.status||'รอลงทะเบียน'},${s.registeredDate||''},${s.registeredTime||''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ข้อมูลลงทะเบียน_${currentCourse}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function showLoading(msg) {
    document.getElementById('loadingText').textContent = msg;
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// ========================================
// Demo Mode - ถูกปิดการใช้งานแล้ว
// ========================================

// *** ระบบนี้ใช้ JSONP ไม่ต้องการ Demo Mode ***
// *** กรุณาใส่ WEB_APP_URL ที่ถูกต้องด้านบน ***