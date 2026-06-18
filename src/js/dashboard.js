import { db, doc, setDoc, getDoc } from './firebase-config.js';

export let studentDataset = [];
let currentSubTab = 'subAttendance';
let pertemuanKe = 1; // Menyimpan status pertemuan ke- secara manual (1, 2, dst)
let tugasKe = 1; // Menyimpan status tugas ke- secara manual (1, 2, dst)
let chartExamsObj, chartProactiveObj, chartTugasObj, chartAttendanceObj, chartLeaderboardObj;

const avatarsMock = [
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
];

// === Subject (Mapel) management ===
export let subjectList = [
    "Pendidikan Agama dan Budi Pekerti",
    "Pendidikan Pancasila",
    "Bahasa Indonesia",
    "Matematika",
    "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    "Seni dan Budaya",
    "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
    "Bahasa Inggris",
    "Muatan Lokal"
];
let subjectData = {}; // placeholder for per-subject datasets if needed later

function getCurrentSubject() {
    const sel = document.getElementById('filterSubjectList');
    return sel ? sel.value : subjectList[0];
}

function ensureSubjectDataset(subject) {
    if (!subject) subject = getCurrentSubject();
    if (!subjectData[subject]) {
        // clone global studentDataset shallowly untuk per-subject editing
        subjectData[subject] = studentDataset.map(s => ({
            nim: s.nim,
            name: s.name,
            avatar: s.avatar, // PENTING: copy avatar dari global dataset
            attendance: { ...s.attendance },
            proactive: { ...s.proactive },
            tasks: { ...s.tasks },
            exams: { ...s.exams },
            finalScore: s.finalScore
        }));
    } else {
        // Sinkronkan avatar dari global dataset jika ada perubahan
        subjectData[subject].forEach((subStudent, idx) => {
            if (studentDataset[idx]) {
                subStudent.avatar = studentDataset[idx].avatar;
            }
        });
    }
    return subjectData[subject];
}

function generateInitialBackupDataset() {
    const firstNames = ["Ahmad", "Budi", "Citra", "Dewi", "Eko", "Farhan", "Gita", "Hendra", "Indah", "Joko"];
    const lastNames = ["Saputra", "Utami", "Wijaya", "Lestari", "Kusuma", "Nugroho", "Pratama", "Sari", "Hidayat"];
    let temp = [];
    for(let i=1; i<=30; i++) {
        let rName = firstNames[Math.floor(Math.random()*firstNames.length)] + " " + lastNames[Math.floor(Math.random()*lastNames.length)];
        
        // Inisialisasi awal data kehadiran secara acak & seimbang
        let attendanceTotal = Math.floor(Math.random() * 4) + 16;
        let sick = Math.floor(Math.random() * 2);
        let permit = Math.floor(Math.random() * 2);
        let absent = Math.floor(Math.random() * 2);
        let meetings = attendanceTotal + sick + permit + absent;
        let attendanceVal = (attendanceTotal / meetings) * 100;

        let ask = Math.floor(Math.random()*15);
        let answer = Math.floor(Math.random()*15);
        let add = Math.floor(Math.random()*15);
        let proTotal = ask + answer + add;
        let proVal = (proTotal > attendanceTotal) ? 100 : (proTotal === attendanceTotal ? 70 : 50);

        let done = Math.floor(Math.random()*6) + 15;
        let totalTasks = 20;
        let taskVal = (done / totalTasks) * 100;

        let uts1 = Math.floor(Math.random()*40) + 60;
        let uas1 = Math.floor(Math.random()*40) + 60;
        let uts2 = Math.floor(Math.random()*40) + 60;
        let uas2 = Math.floor(Math.random()*40) + 60;
        let examAvg = (uts1 + uas1 + uts2 + uas2) / 4;

        let b_att = attendanceVal * 0.10;
        let b_pro = proVal * 0.20;
        let b_tsk = taskVal * 0.30;
        let b_exm = examAvg * 0.40;
        let finalScore = b_att + b_pro + b_tsk + b_exm;

        temp.push({
            nim: 6000 + i, name: rName, avatar: avatarsMock[Math.floor(Math.random() * avatarsMock.length)],
            attendance: { 
                present: attendanceTotal, 
                sick: sick, 
                permit: permit, 
                absent: absent, 
                meetings: meetings, 
                status: 'Hadir', 
                score: attendanceVal, 
                weight: b_att 
            },
            proactive: { ask: ask, answer: answer, add: add, total: proTotal, score: proVal, weight: b_pro },
            tasks: { done: done, total: totalTasks, score: taskVal, weight: b_tsk },
            exams: { uts1: uts1, uas1: uas1, uts2: uts2, uas2: uas2, avg: examAvg, weight: b_exm },
            finalScore: parseFloat(finalScore.toFixed(2))
        });
    }
    return temp;
}

export async function loadDataFromFirestore() {
    try {
        const docRef = doc(db, "academic_core", "kelas6SD");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            studentDataset = data.students || generateInitialBackupDataset();
            subjectList = data.subjectList || subjectList;
            subjectData = data.subjectData || {};
            
            // PENTING: Pastikan avatar di setiap student juga ter-copy ke subjectData
            subjectList.forEach(subject => {
                ensureSubjectDataset(subject);
                if (subjectData[subject]) {
                    subjectData[subject].forEach((subjectStudent, idx) => {
                        const mainStudent = studentDataset[idx];
                        if (mainStudent && mainStudent.avatar) {
                            subjectStudent.avatar = mainStudent.avatar;
                        }
                    });
                }
            });
        } else {
            studentDataset = generateInitialBackupDataset();
            await setDoc(docRef, { students: studentDataset });
        }
    } catch (e) {
        console.error("Cloud error, fallback used.", e);
        studentDataset = generateInitialBackupDataset();
    }
}

async function syncToFirestoreCloud() {
    try {
        const docRef = doc(db, "academic_core", "kelas6SD");
        await setDoc(docRef, { students: studentDataset, subjectList: subjectList, subjectData: subjectData });
        alert("✨ SYSTEM UPDATE: Data berhasil disimpan ke Google Firestore Cloud!");
    } catch (e) {
        alert("🚨 Gagal sinkronisasi data!");
    }
}

export function initDashboardEngine() {
    populateStudentDropdowns();
    populateSubjectSelectors();
    syncSelectedStudentProfile();
}

function populateStudentDropdowns() {
    const dropdown = document.getElementById('filterStudent');
    const currentSelection = dropdown.value;
    dropdown.innerHTML = "";
    
    studentDataset.forEach(student => {
        let opt = document.createElement('option');
        opt.value = student.nim; 
        opt.innerText = `${student.nim} - ${student.name}`;
        dropdown.appendChild(opt);
    });

    if (currentSelection && studentDataset.some(s => s.nim == currentSelection)) {
        dropdown.value = currentSelection;
    }
}

function syncSelectedStudentProfile() {
    const dropdown = document.getElementById('filterStudent');
    if (!dropdown.value) return;
    
    const targetNim = parseInt(dropdown.value);
    const currentSubject = getCurrentSubject();
    const dataset = ensureSubjectDataset(currentSubject);
    
    // Cari student dari global dataset dahulu untuk avatar terbaru
    let student = studentDataset.find(s => s.nim === targetNim);
    if(!student) {
        student = dataset.find(s => s.nim === targetNim);
    }
    if(!student) return;

    document.getElementById('profileName').innerText = student.name;
    document.getElementById('profileNim').innerText = student.nim;
    document.getElementById('profileAvatar').src = student.avatar;
    document.getElementById('profileTotalScore').innerText = (student.finalScore || 0).toFixed(2);

    let sorted = [...dataset].sort((a,b) => b.finalScore - a.finalScore);
    let rank = sorted.findIndex(s => s.nim === student.nim) + 1;
    document.getElementById('profileRank').innerText = "#" + (rank > 0 ? rank : '-');

    const summaryMetrics = calculateSummaryMetrics();
    const overall = summaryMetrics.find(s => s.nim === student.nim);
    document.getElementById('profileOverallRank').innerText = overall ? `#${overall.rank}` : '-';
    document.getElementById('profileOverallScore').innerText = overall ? overall.averageScore.toFixed(2) : '0.00';

    renderDashboardCharts(student);
}

function renderDashboardCharts(student = null) {
    const currentSubject = getCurrentSubject();
    const dataset = ensureSubjectDataset(currentSubject);
    if(!student) {
        const targetNim = parseInt(document.getElementById('filterStudent').value);
        student = dataset.find(s => s.nim === targetNim) || studentDataset.find(s => s.nim === targetNim);
    }
    if(!student) return;

    const examCtx = document.getElementById('chartExams').getContext('2d');
    if(chartExamsObj) chartExamsObj.destroy();
    chartExamsObj = new Chart(examCtx, {
        type: 'bar',
        data: {
            labels: ['UTS 1', 'UAS 1', 'UTS 2', 'UAS 2', 'Rata-Rata Core'],
            datasets: [{
                data: [student.exams.uts1, student.exams.uas1, student.exams.uts2, student.exams.uas2, student.exams.avg],
                backgroundColor: ['rgba(0, 240, 255, 0.4)', 'rgba(157, 78, 221, 0.4)', 'rgba(255, 0, 127, 0.4)', 'rgba(0, 114, 255, 0.4)', 'rgba(16, 185, 129, 0.5)'],
                borderColor: ['#00f0ff', '#9d4edd', '#ff007f', '#0072ff', '#10b981'],
                borderWidth: 2, borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });

    document.getElementById('valTotalProactive').innerText = student.proactive.total;
    const proCtx = document.getElementById('chartProactive').getContext('2d');
    if(chartProactiveObj) chartProactiveObj.destroy();
    chartProactiveObj = new Chart(proCtx, {
        type: 'pie',
        data: { labels: ['Bertanya', 'Menjawab', 'Menambahkan'], datasets: [{ data: [student.proactive.ask, student.proactive.answer, student.proactive.add], backgroundColor: ['#00f0ff', '#9d4edd', '#ff007f'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    let uncompletedTasks = student.tasks.total - student.tasks.done;
    document.getElementById('valTotalTugas').innerText = student.tasks.score.toFixed(0) + "%";
    const taskCtx = document.getElementById('chartTugas').getContext('2d');
    if(chartTugasObj) chartTugasObj.destroy();
    chartTugasObj = new Chart(taskCtx, {
        type: 'doughnut',
        data: { labels: ['Selesai', 'Tidak Selesai'], datasets: [{ data: [student.tasks.done, uncompletedTasks], backgroundColor: ['#10b981', '#ef4444'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const attCtx = document.getElementById('chartAttendance').getContext('2d');
    if(chartAttendanceObj) chartAttendanceObj.destroy();
    chartAttendanceObj = new Chart(attCtx, {
        type: 'bar',
        data: { labels: dataset.map(s => s.name.split(' ')[0]), datasets: [{ data: dataset.map(s => s.attendance.score), backgroundColor: 'rgba(16, 185, 129, 0.4)', borderColor: '#10b981', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { display: false } } }
    });

    const summaryMetrics = calculateSummaryMetrics();
    const sortedLeaderboard = [...summaryMetrics].sort((a, b) => b.averageScore - a.averageScore);
    const leadCtx = document.getElementById('chartLeaderboard').getContext('2d');
    if(chartLeaderboardObj) chartLeaderboardObj.destroy();
    chartLeaderboardObj = new Chart(leadCtx, {
        type: 'bar',
        data: {
            labels: sortedLeaderboard.map(s => s.name.split(' ')[0]),
            datasets: [{
                label: 'Rata-rata',
                data: sortedLeaderboard.map(s => s.averageScore),
                backgroundColor: 'rgba(0, 114, 255, 0.5)',
                borderColor: '#0072ff',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const idx = tooltipItems[0].dataIndex;
                            const student = sortedLeaderboard[idx];
                            return student ? `#${idx + 1} ${student.name}` : '';
                        },
                        label: (tooltipItem) => `Rata-rata: ${tooltipItem.formattedValue}%`
                    }
                }
            },
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' } },
                x: { ticks: { color: '#94a3b8', font: { size: 9 } } }
            }
        }
    });
}

// ================= DATA MANIPULATION CRUD =================
function renderUpdateDataTable() {
    const head = document.getElementById('tableHeaderInject');
    const body = document.getElementById('tableBodyInject');
    const lbl = document.getElementById('lblSubTitle');
    head.innerHTML = ""; body.innerHTML = "";
    const currentSubject = getCurrentSubject();
    const dataset = ensureSubjectDataset(currentSubject);

    // ================= 1. TAB DAFTAR HADIR =================
    if(currentSubTab === 'subAttendance') {
        // Mengganti judul dan menyematkan input manual nomor Pertemuan Ke
        const subjectBadge = `<span class="text-xs text-slate-300 uppercase tracking-wider mr-3">Mapel: ${currentSubject}</span>`;
        lbl.innerHTML = `${subjectBadge} Pertemuan Ke: <input type="number" id="inputPertemuanKe" value="${pertemuanKe}" class="w-16 bg-slate-950 border border-slate-800 text-center p-1 rounded text-cyan-400 font-mono focus:outline-none focus:border-cyan-400 inline-block ml-2">`;
        
        // Memasang listener agar input manual langsung tersimpan di variabel state
        document.getElementById('inputPertemuanKe').addEventListener('input', (e) => {
            pertemuanKe = parseInt(e.target.value) || 1;
        });

        // Struktur header baru dengan kolom akumulasi Sakit, Izin, Mangkir, dan Total Pertemuan
        head.innerHTML = `
            <tr>
                <th class="p-3">Nama</th>
                <th class="p-3">NIM</th>
                <th class="p-3">Status Kehadiran</th>
                <th class="p-3 text-center">Total Hadir</th>
                <th class="p-3 text-center">Total Sakit</th>
                <th class="p-3 text-center">Total Izin</th>
                <th class="p-3 text-center">Total Mangkir</th>
                <th class="p-3 text-center">Total Pertemuan</th>
                <th class="p-3 text-center">Nilai Kehadiran</th>
                <th class="p-3 text-center">Bobot (10%)</th>
            </tr>`;

        dataset.forEach((s, idx) => {
            let scoreAtt = s.attendance.meetings > 0 ? (s.attendance.present / s.attendance.meetings) * 100 : 0;
            let weightAtt = scoreAtt * 0.10;

            let tr = document.createElement('tr');
            tr.className = "hover:bg-slate-900/30 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-white font-bold">${s.name}</td>
                <td class="p-3 text-cyan-400 font-mono">${s.nim}</td>
                <td class="p-3">
                    <select id="selAtt-${idx}" class="bg-slate-950 border border-slate-800 text-xs text-slate-300 p-1.5 rounded focus:border-cyan-400 focus:outline-none">
                        <option value="Hadir" ${s.attendance.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
                        <option value="Sakit" ${s.attendance.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
                        <option value="Izin" ${s.attendance.status === 'Izin' ? 'selected' : ''}>Izin</option>
                        <option value="Mangkir" ${s.attendance.status === 'Mangkir' ? 'selected' : ''}>Mangkir</option>
                    </select>
                </td>
                <td class="p-3 text-center text-emerald-400 font-mono">${s.attendance.present}</td>
                <td class="p-3 text-center text-amber-400 font-mono">${s.attendance.sick || 0}</td>
                <td class="p-3 text-center text-blue-400 font-mono">${s.attendance.permit || 0}</td>
                <td class="p-3 text-center text-red-400 font-mono">${s.attendance.absent || 0}</td>
                <td class="p-3 text-center text-slate-400 font-mono">${s.attendance.meetings}</td>
                <td class="p-3 text-center font-mono">${scoreAtt.toFixed(0)}</td>
                <td class="p-3 text-center text-fuchsia-400 font-bold font-mono">${weightAtt.toFixed(1)}</td>`;
            body.appendChild(tr);

            // Listener dropdown hanya merubah status sementara sebelum klik tombol Submit
                document.getElementById(`selAtt-${idx}`).addEventListener('change', (e) => {
                    s.attendance.status = e.target.value;
                });
        });
    }
    
    // ================= 2. TAB NILAI PROAKTIF =================
    else if(currentSubTab === 'subProactive') {
        const subjectBadge = `<span class="text-xs text-slate-300 uppercase tracking-wider mr-3">Mapel: ${currentSubject}</span>`;
        lbl.innerHTML = `${subjectBadge} Nilai Proaktif Core Matrix`;
        
        // Date dihapus, ditambahkan kolom Jumlah Pertemuan yang sinkron dari tabel daftar hadir
        head.innerHTML = `
            <tr>
                <th class="p-3">Nama</th>
                <th class="p-3">NIM</th>
                <th class="p-3 text-center">Jumlah Pertemuan</th>
                <th class="p-3 text-center">Bertanya</th>
                <th class="p-3 text-center">Menjawab</th>
                <th class="p-3 text-center">Menambahkan</th>
                <th class="p-3 text-center">Jumlah Proaktif</th>
                <th class="p-3 text-center">Nilai Proaktif</th>
                <th class="p-3 text-center">Bobot (20%)</th>
            </tr>`;

        dataset.forEach((s, idx) => {
            let totalProactive = s.proactive.ask + s.proactive.answer + s.proactive.add;
            let scoreProactive = s.proactive.score || 50;
            let weightProactive = scoreProactive * 0.20;

            let tr = document.createElement('tr');
            tr.className = "hover:bg-slate-900/30 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-white font-bold">${s.name}</td>
                <td class="p-3 text-cyan-400 font-mono">${s.nim}</td>
                <td class="p-3 text-center text-slate-400 font-mono">${s.attendance.meetings}</td>
                <td class="p-3 text-center"><input type="number" id="ask-${idx}" value="${s.proactive.ask}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-cyan-400 focus:outline-none focus:border-cyan-400"></td>
                <td class="p-3 text-center"><input type="number" id="ans-${idx}" value="${s.proactive.answer}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-cyan-400 focus:outline-none focus:border-cyan-400"></td>
                <td class="p-3 text-center"><input type="number" id="add-${idx}" value="${s.proactive.add}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-cyan-400 focus:outline-none focus:border-cyan-400"></td>
                <td class="p-3 text-center text-amber-400 font-bold font-mono">${totalProactive}</td>
                <td class="p-3 text-center font-mono">${scoreProactive}</td>
                <td class="p-3 text-center text-pink-500 font-bold font-mono">${weightProactive.toFixed(1)}</td>`;
            body.appendChild(tr);

            ['ask', 'ans', 'add'].forEach(f => {
                document.getElementById(`${f}-${idx}`).addEventListener('change', (e) => {
                    let fieldName = f === 'ans' ? 'answer' : f;
                    s.proactive[fieldName] = parseInt(e.target.value) || 0;
                    recomputeCalculatedMetrics(idx, dataset); 
                    renderUpdateDataTable();
                });
            });
        });
    }
    
    // ================= 3. TAB NILAI TUGAS =================
    else if(currentSubTab === 'subTasks') {
        const subjectBadge = `<span class="text-xs text-slate-300 uppercase tracking-wider mr-3">Mapel: ${currentSubject}</span>`;
        lbl.innerHTML = `${subjectBadge} Nilai Tugas - Tugas Ke: <input type="number" id="inputTugasKe" min="1" value="${tugasKe}" class="w-16 bg-slate-950 border border-cyan-500/50 text-center p-1 rounded text-cyan-400 focus:outline-none focus:border-cyan-400" />`;
        head.innerHTML = `
            <tr>
                <th class="p-3">Nama</th>
                <th class="p-3">NIM</th>
                <th class="p-3 text-center">Selesai</th>
                <th class="p-3 text-center">Tidak Selesai</th>
                <th class="p-3 text-center">Jumlah Selesai</th>
                <th class="p-3 text-center">Jumlah Tugas</th>
                <th class="p-3 text-center">Nilai Tugas</th>
                <th class="p-3 text-center">Bobot (30%)</th>
            </tr>`;

        // Set up event listener untuk input tugasKe
        setTimeout(() => {
            const inputTugasKe = document.getElementById('inputTugasKe');
            if(inputTugasKe) {
                inputTugasKe.addEventListener('change', (e) => {
                    tugasKe = parseInt(e.target.value) || 1;
                    renderUpdateDataTable();
                });
            }
        }, 0);

        dataset.forEach((s, idx) => {
            let taskTotal = tugasKe; // Gunakan tugasKe sebagai total tugas
            let taskDone = s.tasks.done;
            let taskNotDone = Math.max(0, taskTotal - taskDone);
            let scoreTask = taskTotal > 0 ? (taskDone / taskTotal) * 100 : 0;
            let weightTask = scoreTask * 0.30;

            let tr = document.createElement('tr');
            tr.className = "hover:bg-slate-900/30 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-white font-bold">${s.name}</td>
                <td class="p-3 text-cyan-400 font-mono">${s.nim}</td>
                <td class="p-3 text-center"><input type="number" id="done-${idx}" value="${taskDone}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-emerald-400 focus:outline-none focus:border-emerald-400"></td>
                <td class="p-4 text-center text-red-400 font-mono">${taskNotDone}</td>
                <td class="p-3 text-center text-emerald-400 font-mono">${taskDone}</td>
                <td class="p-3 text-center text-slate-400 font-mono">${taskTotal}</td>
                <td class="p-3 text-center font-mono">${scoreTask.toFixed(0)}</td>
                <td class="p-3 text-center text-amber-500 font-bold font-mono">${weightTask.toFixed(1)}</td>`;
            body.appendChild(tr);

            document.getElementById(`done-${idx}`).addEventListener('change', (e) => {
                let inputVal = parseInt(e.target.value) || 0;
                s.tasks.done = Math.min(tugasKe, inputVal);
                recomputeCalculatedMetrics(idx, dataset); 
                renderUpdateDataTable();
            });
        });
    }

    // ================= 4. TAB NILAI UJIAN =================
    else if(currentSubTab === 'subExams') {
        const subjectBadge = `<span class="text-xs text-slate-300 uppercase tracking-wider mr-3">Mapel: ${currentSubject}</span>`;
        lbl.innerHTML = `${subjectBadge} Nilai Ujian Core Matrix`;
        head.innerHTML = `
            <tr>
                <th class="p-3">Nama</th>
                <th class="p-3">NIM</th>
                <th class="p-3 text-center">UTS 1</th>
                <th class="p-3 text-center">UAS 1</th>
                <th class="p-3 text-center">UTS 2</th>
                <th class="p-3 text-center">UAS 2</th>
                <th class="p-3 text-center">Nilai Rata-Rata</th>
                <th class="p-3 text-center">Bobot (40%)</th>
            </tr>`;

        dataset.forEach((s, idx) => {
            let examAvg = (s.exams.uts1 + s.exams.uas1 + s.exams.uts2 + s.exams.uas2) / 4;
            let weightExam = examAvg * 0.40;

            let tr = document.createElement('tr');
            tr.className = "hover:bg-slate-900/30 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-white font-bold">${s.name}</td>
                <td class="p-3 text-cyan-400 font-mono">${s.nim}</td>
                <td class="p-3 text-center"><input type="number" id="uts1-${idx}" value="${s.exams.uts1}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-slate-200 focus:outline-none focus:border-cyan-400"></td>
                <td class="p-3 text-center"><input type="number" id="uas1-${idx}" value="${s.exams.uas1}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-slate-200 focus:outline-none focus:border-cyan-400"></td>
                <td class="p-3 text-center"><input type="number" id="uts2-${idx}" value="${s.exams.uts2}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-slate-200 focus:outline-none focus:border-cyan-400"></td>
                <td class="p-3 text-center"><input type="number" id="uas2-${idx}" value="${s.exams.uas2}" class="w-14 bg-slate-950 border border-slate-800 text-center p-1 rounded text-slate-200 focus:outline-none focus:border-cyan-400"></td>
                <td class="p-3 text-center text-purple-400 font-mono">${examAvg.toFixed(1)}</td>
                <td class="p-3 text-center text-blue-500 font-bold font-mono">${weightExam.toFixed(1)}</td>`;
            body.appendChild(tr);

            ['uts1', 'uas1', 'uts2', 'uas2'].forEach(examType => {
                document.getElementById(`${examType}-${idx}`).addEventListener('change', (e) => {
                    s.exams[examType] = parseInt(e.target.value) || 0;
                    recomputeCalculatedMetrics(idx, dataset); 
                    renderUpdateDataTable();
                });
            });
        });
    }
    
    // ================= 5. TAB TOTAL NILAI SUMMARY =================
    else {
        const subjectBadge = `<span class="text-xs text-slate-300 uppercase tracking-wider mr-3">Mapel: ${currentSubject}</span>`;
        lbl.innerHTML = `${subjectBadge} Total Final Core Summary`;
        head.innerHTML = `
            <tr>
                <th class="p-3 text-center">Rank</th>
                <th class="p-3">Nama</th>
                <th class="p-3">NIM</th>
                <th class="p-3 text-center">Bobot Kehadiran</th>
                <th class="p-3 text-center">Bobot Proaktif</th>
                <th class="p-3 text-center">Bobot Tugas</th>
                <th class="p-3 text-center">Bobot Ujian</th>
                <th class="p-3 text-center">Total Nilai</th>
            </tr>`;

        let sortedSummary = [...dataset].sort((a,b) => b.finalScore - a.finalScore);

        sortedSummary.forEach((s, rankIdx) => {
            let tr = document.createElement('tr');
            tr.className = "hover:bg-slate-900/30 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-center font-bold font-mono text-amber-400">#${rankIdx + 1}</td>
                <td class="p-3 text-white font-bold">${s.name}</td>
                <td class="p-3 text-slate-400 font-mono">${s.nim}</td>
                <td class="p-3 text-center font-mono text-fuchsia-400">${s.attendance.weight.toFixed(1)}</td>
                <td class="p-3 text-center font-mono text-pink-500">${s.proactive.weight.toFixed(1)}</td>
                <td class="p-3 text-center font-mono text-amber-500">${s.tasks.weight.toFixed(1)}</td>
                <td class="p-3 text-center font-mono text-blue-500">${s.exams.weight.toFixed(1)}</td>
                <td class="p-3 text-center text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 font-mono">${s.finalScore.toFixed(2)}</td>`;
            body.appendChild(tr);
        });
    }
}

function renderStudentManagementTable() {
    const tbody = document.getElementById('studentManagementTableBody');
    tbody.innerHTML = "";
    
    studentDataset.forEach((s, idx) => {
        let tr = document.createElement('tr');
        tr.className = "hover:bg-slate-900/30 transition-colors";
        tr.innerHTML = `
            <td class="p-4">
                <div class="w-12 h-12 rounded-full overflow-hidden border border-slate-700 relative group cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                    <img id="avatarImg-${idx}" src="${s.avatar}" class="w-full h-full object-cover transition duration-300 group-hover:scale-110">
                    <label for="fileInput-${idx}" class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                        <span class="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">Upload</span>
                        <span class="text-[8px] text-slate-400 font-mono">PNG/JPG</span>
                    </label>
                    <input type="file" id="fileInput-${idx}" accept="image/*" class="hidden">
                </div>
            </td>
            <td class="p-4 text-white font-bold">
                <input type="text" id="nameIn-${idx}" value="${s.name}" 
                       class="bg-slate-950/40 border border-slate-800/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none w-full max-w-xs font-sans transition">
            </td>
            <td class="p-4 text-cyan-400 font-mono tracking-wider">
                <input type="number" id="nimIn-${idx}" value="${s.nim}" 
                       class="bg-slate-950/40 border border-slate-800/80 rounded px-3 py-1.5 text-xs text-cyan-400 focus:border-cyan-400 focus:outline-none w-28 font-mono transition">
            </td>
            <td class="p-4 text-center">
                <button id="editBtn-${idx}" class="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.05)]">
                    ✏️ Edit Data
                </button>
                <button id="deleteBtn-${idx}" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition active:scale-95 shadow-[0_0_10px_rgba(255,0,0,0.05)] ml-2">
                    🗑️ Hapus
                </button>
            </td>`;
            
        tbody.appendChild(tr);

        document.getElementById(`nameIn-${idx}`).addEventListener('change', (e) => { 
            s.name = e.target.value; 
            // propagate to subject datasets
            Object.keys(subjectData).forEach(key => {
                if (subjectData[key] && subjectData[key][idx]) subjectData[key][idx].name = s.name;
            });
            populateStudentDropdowns();
        });

        document.getElementById(`nimIn-${idx}`).addEventListener('change', (e) => {
            let newNim = parseInt(e.target.value);
            if (isNaN(newNim)) {
                alert("NIM harus berupa angka!");
                e.target.value = s.nim;
                return;
            }
            let isDuplicate = studentDataset.some((student, i) => student.nim === newNim && i !== idx);
            if (isDuplicate) {
                alert(`NIM ${newNim} sudah digunakan murid lain!`);
                e.target.value = s.nim;
                return;
            }
            s.nim = newNim; 
            // propagate to subject datasets by index
            Object.keys(subjectData).forEach(key => {
                if (subjectData[key] && subjectData[key][idx]) subjectData[key][idx].nim = s.nim;
            });
            populateStudentDropdowns();
        });

        document.getElementById(`fileInput-${idx}`).addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 500 * 1024) { // 500KB limit untuk base64
                    alert("🚨 Ukuran file terlalu besar! Maksimal adalah 500KB.\n💡 Kompresi gambar terlebih dahulu.");
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64Image = event.target.result;
                    document.getElementById(`avatarImg-${idx}`).src = base64Image;
                    s.avatar = base64Image;
                    
                    // PENTING: Propagate avatar update ke semua subjectData
                    Object.keys(subjectData).forEach(key => {
                        if (subjectData[key] && subjectData[key][idx]) {
                            subjectData[key][idx].avatar = base64Image;
                        }
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById(`editBtn-${idx}`).addEventListener('click', () => {
            const currentNameInput = document.getElementById(`nameIn-${idx}`);
            currentNameInput.focus();
            currentNameInput.classList.add('border-cyan-400', 'bg-slate-900');
            currentNameInput.addEventListener('blur', () => {
                currentNameInput.classList.remove('border-cyan-400', 'bg-slate-900');
            }, { once: true });
        });

        document.getElementById(`deleteBtn-${idx}`).addEventListener('click', async () => {
            const studentName = s.name;
            const studentNim = s.nim;
            const confirmDelete = confirm(
                `⚠️ KONFIRMASI PENGHAPUSAN\n\nApakah Anda yakin ingin menghapus data murid:\n\n📛 Nama: ${studentName}\n📋 NIM: ${studentNim}\n\nTindakan ini TIDAK DAPAT DIBATALKAN dan akan menghapus data permanen dari Firestore.`
            );

            if (confirmDelete) {
                try {
                    // Hapus dari studentDataset
                    studentDataset.splice(idx, 1);

                    // Hapus dari semua subjectData di index yang sama
                    Object.keys(subjectData).forEach(key => {
                        if (subjectData[key] && subjectData[key][idx] !== undefined) {
                            subjectData[key].splice(idx, 1);
                        }
                    });

                    // Sinkronisasi ke Firestore
                    await syncToFirestoreCloud();
                    alert(`✅ Data murid ${studentName} (NIM: ${studentNim}) berhasil dihapus permanen.`);

                    // Re-render tabel dan dropdown
                    populateStudentDropdowns();
                    renderStudentManagementTable();
                    syncSelectedStudentProfile();
                } catch (e) {
                    alert(`❌ Gagal menghapus data: ${e.message}`);
                }
            }
        });
    });
}

function recomputeCalculatedMetrics(idx, dataset = null) {
    let ds = dataset || studentDataset;
    let s = ds[idx];
    
    s.attendance.score = s.attendance.meetings > 0 ? (s.attendance.present / s.attendance.meetings) * 100 : 0;
    s.attendance.weight = s.attendance.score * 0.10;
    
    s.proactive.total = s.proactive.ask + s.proactive.answer + s.proactive.add;
    let scoreProactive = 50;
    if (s.proactive.total > s.attendance.present) {
        scoreProactive = 100;
    } else if (s.proactive.total === s.attendance.present) {
        scoreProactive = 70;
    }
    s.proactive.score = scoreProactive;
    s.proactive.weight = scoreProactive * 0.20;
    
    s.tasks.score = (s.tasks.done / s.tasks.total) * 100;
    s.tasks.weight = s.tasks.score * 0.30;
    
    s.exams.avg = (s.exams.uts1 + s.exams.uas1 + s.exams.uts2 + s.exams.uas2) / 4;
    s.exams.weight = s.exams.avg * 0.40;
    
    s.finalScore = parseFloat((s.attendance.weight + s.proactive.weight + s.tasks.weight + s.exams.weight).toFixed(2));
}

// ================= SUMMARY TABLE CALCULATION & RENDERING =================
function calculateSummaryMetrics() {
    const metrics = studentDataset.map((student, idx) => {
        let totalScoreBySubject = {};
        let subjectCount = 0;
        let totalScoreSum = 0;

        subjectList.forEach(mapel => {
            ensureSubjectDataset(mapel);
            const mapelData = subjectData[mapel];

            if(mapelData && mapelData[idx]) {
                const s = mapelData[idx];
                const mapelTotal = s.attendance.weight + s.proactive.weight + s.tasks.weight + s.exams.weight;
                totalScoreBySubject[mapel] = parseFloat(mapelTotal.toFixed(2));
                totalScoreSum += mapelTotal;
                subjectCount++;
            } else {
                totalScoreBySubject[mapel] = 0;
            }
        });

        const averageScore = subjectCount > 0 ? parseFloat((totalScoreSum / subjectCount).toFixed(2)) : 0;

        return {
            nim: student.nim,
            name: student.name,
            avatar: student.avatar,
            subjectScores: totalScoreBySubject,
            totalScore: parseFloat(totalScoreSum.toFixed(2)),
            averageScore
        };
    });

    return metrics
        .sort((a, b) => b.averageScore - a.averageScore)
        .map((m, idx) => ({ ...m, rank: idx + 1 }));
}

function renderSummaryTable() {
    const metrics = calculateSummaryMetrics();
    const thead = document.getElementById('summaryTableHead');
    const tbody = document.getElementById('summaryTableBody');

    // Build dynamic header: Rank, Nama, NIM, one column per subject, Total Nilai, Rata-Rata
    thead.innerHTML = `
        <tr>
            <th class="p-3 text-center">Rank</th>
            <th class="p-3">Nama</th>
            <th class="p-3">NIM</th>
            ${subjectList.map(mapel => `<th class="p-3 text-center">${mapel}</th>`).join('')}
            <th class="p-3 text-center">Total Nilai</th>
            <th class="p-3 text-center">Rata-Rata</th>
        </tr>`;

    tbody.innerHTML = metrics.map(m => {
        const perSubjectCells = subjectList.map(mapel => {
            const value = m.subjectScores?.[mapel] ?? 0;
            return `<td class="p-3 text-center text-slate-300 font-mono">${value.toFixed(2)}</td>`;
        }).join('');

        return `
            <tr class="hover:bg-slate-900/30 transition">
                <td class="p-3 text-center font-bold text-cyan-400">#${m.rank}</td>
                <td class="p-3 text-emerald-300 font-semibold">${m.name}</td>
                <td class="p-3 text-slate-400">${m.nim}</td>
                ${perSubjectCells}
                <td class="p-3 text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold">${m.totalScore.toFixed(2)}</td>
                <td class="p-3 text-center text-slate-200">${m.averageScore.toFixed(2)}</td>
            </tr>`;
    }).join('');
}

// ================= ROUTING NAVIGATION EVENT BINDINGS =================
export function switchTab(tabId) {
    ['tabDashboard', 'tabUpdateData', 'tabUpdateStudents', 'tabSummary'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    if(tabId === 'tabDashboard') {
        populateStudentDropdowns();
        syncSelectedStudentProfile();
    }
    if(tabId === 'tabUpdateData') renderUpdateDataTable();
    if(tabId === 'tabUpdateStudents') renderStudentManagementTable();
    if(tabId === 'tabSummary') renderSummaryTable();
}

document.getElementById('btnNavDashboard').addEventListener('click', () => switchTab('tabDashboard'));
document.getElementById('btnNavSummary').addEventListener('click', () => switchTab('tabSummary'));
document.getElementById('btnNavData').addEventListener('click', () => switchTab('tabUpdateData'));
document.getElementById('btnNavStudents').addEventListener('click', () => switchTab('tabUpdateStudents'));
document.getElementById('filterStudent').addEventListener('change', syncSelectedStudentProfile);

['Attendance', 'Proactive', 'Tasks', 'Exams', 'Summary'].forEach(sub => {
    document.getElementById(`subTab${sub}`).addEventListener('click', (e) => {
        currentSubTab = `sub${sub}`;
        document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.className = "sub-tab-btn px-4 py-2 text-xs uppercase tracking-wider font-bold rounded-lg bg-slate-900 text-slate-400 transition");
        e.target.className = "sub-tab-btn px-4 py-2 text-xs uppercase tracking-wider font-bold rounded-lg bg-cyan-500 text-slate-950 transition";
        renderUpdateDataTable();
    });
});

// Pembaruan Aksi Submit Data: Mengakumulasi data absensi secara cerdas saat tombol Submit diklik
document.getElementById('btnActionSubmitData').addEventListener('click', async () => {
    const currentSubject = getCurrentSubject();
    const dataset = ensureSubjectDataset(currentSubject);
    if (currentSubTab === 'subAttendance') {
        dataset.forEach((s, idx) => {
            const selectEl = document.getElementById(`selAtt-${idx}`);
            if (selectEl) {
                const statusTerpilih = selectEl.value;
                if (statusTerpilih === 'Hadir') s.attendance.present = (s.attendance.present || 0) + 1;
                else if (statusTerpilih === 'Sakit') s.attendance.sick = (s.attendance.sick || 0) + 1;
                else if (statusTerpilih === 'Izin') s.attendance.permit = (s.attendance.permit || 0) + 1;
                else if (statusTerpilih === 'Mangkir') s.attendance.absent = (s.attendance.absent || 0) + 1;
                s.attendance.meetings = pertemuanKe;
                recomputeCalculatedMetrics(idx, dataset);
            }
        });
        renderUpdateDataTable();
    }
    await syncToFirestoreCloud(); // Jalankan proses upload cloud database
});

document.getElementById('btnActionSubmitStud').addEventListener('click', syncToFirestoreCloud);

document.getElementById('btnAddStudent').addEventListener('click', () => {
    let namePrompt = prompt("Nama Murid Baru:");
    if(!namePrompt) return;
    
    let nimPrompt = prompt("Masukkan NIM Murid Baru (Harus Angka & Unik):");
    if(!nimPrompt) return;
    let targetNim = parseInt(nimPrompt);

    if (isNaN(targetNim)) {
        alert("🚨 Gagal! NIM harus berupa angka.");
        return;
    }

    let isDuplicate = studentDataset.some(s => s.nim === targetNim);
    if (isDuplicate) {
        alert(`🚨 Gagal! NIM ${targetNim} sudah digunakan.`);
        return;
    }

    studentDataset.push({
        nim: targetNim, 
        name: namePrompt,
        avatar: avatarsMock[0], 
        attendance: { present: 20, sick: 0, permit: 0, absent: 0, meetings: 20, status: 'Hadir', score: 100, weight: 10 },
        proactive: { ask: 0, answer: 0, add: 0, total: 0, score: 50, weight: 10 }, 
        tasks: { done: 20, total: 20, score: 100, weight: 30 },
        exams: { uts1: 80, uas1: 80, uts2: 80, uas2: 80, avg: 80, weight: 32 }, 
        finalScore: 82.0
    });
    // also add to each subject dataset to keep indexes aligned
    Object.keys(subjectData).forEach(key => {
        subjectData[key].push({
            nim: targetNim,
            name: namePrompt,
            avatar: avatarsMock[0],
            attendance: { present: 20, sick: 0, permit: 0, absent: 0, meetings: 20, status: 'Hadir', score: 100, weight: 10 },
            proactive: { ask: 0, answer: 0, add: 0, total: 0, score: 50, weight: 10 },
            tasks: { done: 20, total: 20, score: 100, weight: 30 },
            exams: { uts1: 80, uas1: 80, uts2: 80, uas2: 80, avg: 80, weight: 32 },
            finalScore: 82.0
        });
    });
    populateStudentDropdowns();
    renderStudentManagementTable();
});

// ---------------- Subject UI & CRUD (Add / Edit / Delete) ----------------
function subjectSelectionChanged() {
    const selected = this.value;
    ['filterSubject', 'filterSubjectList'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = selected;
    });
    ensureSubjectDataset(selected);
    renderUpdateDataTable();
    syncSelectedStudentProfile();
}

function populateSubjectSelectors() {
    ['filterSubject', 'filterSubjectList'].forEach(id => {
        const sel = document.getElementById(id);
        if(!sel) return;
        const prev = sel.value;
        sel.innerHTML = '';
        subjectList.forEach(s => {
            let opt = document.createElement('option');
            opt.value = s;
            opt.innerText = s;
            sel.appendChild(opt);
        });
        sel.value = (prev && subjectList.includes(prev)) ? prev : subjectList[0];
        sel.onchange = subjectSelectionChanged;
    });
}

document.getElementById('btnEditSubject')?.addEventListener('click', () => {
    const sel = document.getElementById('filterSubjectList');
    if(!sel) return alert('Filter mapel tidak tersedia.');
    const current = sel.value;
    const newName = prompt('Ubah nama mapel:', current);
    if(!newName) return;
    const idx = subjectList.indexOf(current);
    if(idx >= 0) {
        subjectList[idx] = newName.trim();
            populateSubjectSelectors();
    }
});

document.getElementById('btnAddSubject')?.addEventListener('click', () => {
    const name = prompt('Nama mapel baru:');
    if(!name) return;
    if(subjectList.includes(name.trim())) return alert('Mapel sudah ada.');
    subjectList.push(name.trim());
    subjectData[name.trim()] = {};
    populateSubjectSelectors();
    const sel = document.getElementById('filterSubjectList');
    if(sel) sel.value = name.trim();
    renderUpdateDataTable();
    syncToFirestoreCloud();
});

document.getElementById('btnDeleteSubject')?.addEventListener('click', () => {
    const sel = document.getElementById('filterSubjectList');
    if(!sel) return alert('Filter mapel tidak tersedia.');
    const current = sel.value;
    if(!confirm(`Hapus mapel "${current}" ? Tindakan ini tidak mempengaruhi data murid.`)) return;
    if(subjectList.length <= 1) return alert('Tidak dapat menghapus semua mapel.');
    const idx = subjectList.indexOf(current);
    if(idx >= 0) subjectList.splice(idx, 1);
    delete subjectData[current];
    populateSubjectSelectors();
    renderUpdateDataTable();
    syncToFirestoreCloud();
});

// Ensure subject filter exists for initial render
populateSubjectSelectors();