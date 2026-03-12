// --- 1. STATE & AUTH ---
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let allVacancies = [];
let studentApps = [];
let companyApplicants = [];
let activeView = 'overview';
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showDashboard();
    } else {
        showAuth();
    }

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // Close modals when clicking on backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
            }
        });
    });

    // Close modals with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
            });
        }
    });
});

function showAuth() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
}

function showDashboard() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';

    const sItems = document.querySelectorAll('.role-student');
    const cItems = document.querySelectorAll('.role-company');

    if (currentUser.role === 'student') {
        sItems.forEach(el => el.style.display = 'block');
        cItems.forEach(el => el.style.display = 'none');
        switchView('overview');
    } else {
        sItems.forEach(el => el.style.display = 'none');
        cItems.forEach(el => el.style.display = 'block');
        switchView('overview');
    }

    document.getElementById('user-display-name').innerText = currentUser.email.split('@')[0];
    document.getElementById('user-display-role').innerText = currentUser.role.toUpperCase();
    document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${currentUser.email}&background=6366f1&color=fff`;

    updateGlobalMetrics();
    if (currentUser.role === 'company') {
        loadCompanyStats();
    }
}

function toggleRegFields() {
    const role = document.getElementById('reg-role').value;
    document.getElementById('company-reg-fields').style.display = role === 'company' ? 'block' : 'none';
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        currentUser = data;
        localStorage.setItem('user', JSON.stringify(data));
        showDashboard();
    } catch (err) { alert(err.message); }
}

async function autoLogin(role) {
    const email = role === 'student' ? 'student@jobhub.com' : 'company@jobhub.com';
    const password = role === 'student' ? 'student123' : 'company123';

    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');

    if (emailInput && passInput) {
        emailInput.value = email;
        passInput.value = password;

        // Add a slight delay for aesthetic flow
        setTimeout(async () => {
            await handleLogin();
        }, 300);
    }
}

async function handleRegister() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const role = document.getElementById('reg-role').value;

    const payload = { email, password, role };
    if (role === 'company') {
        payload.companyName = document.getElementById('reg-company-name').value;
        payload.location = document.getElementById('reg-location').value;
        payload.industry = document.getElementById('reg-industry').value;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        alert('Registered! Please login.');
        toggleAuth();
    } catch (err) { alert(err.message); }
}

function handleLogout() {
    localStorage.removeItem('user');
    location.reload();
}

function toggleAuth() {
    const l = document.getElementById('login-form');
    const r = document.getElementById('register-form');
    l.style.display = l.style.display === 'none' ? 'block' : 'none';
    r.style.display = r.style.display === 'none' ? 'block' : 'none';
}

// --- 2. NAVIGATION & SEARCH ---
function switchView(viewId, targetAppId = null) {
    document.querySelectorAll('.dashboard-view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.style.display = 'block';
        activeView = viewId;
    }

    const targetNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (targetNav) targetNav.classList.add('active');

    if (viewId === 'job-board') loadVacancies();
    if (viewId === 'my-apps') loadMyApplications();
    if (viewId === 'overview') {
        if (currentUser.role === 'company') loadCompanyStats();
        else updateGlobalMetrics();
    }
    if (viewId === 'applicants') loadCompanyApplicants();
    if (viewId === 'tools' && currentUser.role === 'student') {
        loadRoleChecklist();
        populatePrioritySelector();
        populateJDSelector();

        if (targetAppId) {
            const prioritySel = document.getElementById('tool-app-selector');
            const jdSel = document.getElementById('tool-jd-selector');
            if (prioritySel) {
                prioritySel.value = targetAppId;
                loadPriorityFromSelector();
            }
            if (jdSel) {
                jdSel.value = targetAppId;
                loadJDFromSelector();
            }
        }
    }
}

async function loadStudentSkills() {
    const list = document.getElementById('student-skills-list');
    if (!list) return;

    try {
        const studentId = currentUser.profileId || 1;
        const res = await fetch(`/api/studentskills/${studentId}`);
        const skills = await res.json();

        if (skills.length === 0) {
            list.innerHTML = '<p class="empty-hint" style="font-size: 0.7rem;">No skills added yet.</p>';
            return;
        }

        list.innerHTML = skills.map(s => `
            <span class="skill-tag match" style="cursor: pointer;" onclick="deleteSkill(${s.id})">
                ${s.skill_name.toUpperCase()} <i class="fas fa-times" style="font-size: 0.6rem; margin-left: 5px; opacity: 0.7;"></i>
            </span>
        `).join('');
    } catch (err) { console.error("Error loading skills:", err); }
}

async function addSkill() {
    const input = document.getElementById('new-skill-input');
    const skillName = input.value.trim();
    if (!skillName) return;

    try {
        const res = await fetch('/api/studentskills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentUser.profileId || 1,
                skill_name: skillName
            })
        });

        if (res.status === 409) return showToast('info', 'Already added', 'You already have this skill.');

        input.value = "";

        showToast('success', 'Skill Added', 'Profile updated.');
    } catch (err) { showToast('error', 'Error', 'Failed to add skill.'); }
}

async function deleteSkill(skillId) {
    if (!confirm("Remove this skill from your profile?")) return;
    try {
        const studentId = currentUser.profileId || 1;
        await fetch(`/api/studentskills/${studentId}/${skillId}`, { method: 'DELETE' });

    } catch (err) { showToast('error', 'Error', 'Failed to delete skill.'); }
}

function populateJDSelector() {
    const sel = document.getElementById('tool-jd-selector');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Manual Extraction --</option>' +
        studentApps.map(a => `<option value="${a.id}">${a.company_name || a.company} - ${a.job_role || a.role}</option>`).join('');
}

function populatePrioritySelector() {
    const sel = document.getElementById('tool-app-selector');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Generic Calculation --</option>' +
        studentApps.map(a => `<option value="${a.id}">${a.company_name || a.company} - ${a.job_role || a.role}</option>`).join('');
}

function loadPriorityFromSelector() {
    const appId = document.getElementById('tool-app-selector').value;
    const saveBtn = document.getElementById('btn-save-priority');

    if (!appId) {
        if (saveBtn) saveBtn.style.display = 'none';
        return;
    }

    const app = studentApps.find(a => a.id == appId);
    if (!app) return;

    document.getElementById('tool-skill').value = app.skill_match || 5;
    document.getElementById('tool-interest').value = app.interest_level || 5;
    document.getElementById('tool-location').value = app.location_fit || 5;

    if (saveBtn) saveBtn.style.display = 'block';
    calcPriorityResult(); // Auto trigger calculation
}

function loadJDFromSelector() {
    const appId = document.getElementById('tool-jd-selector').value;
    const textarea = document.getElementById('jd-input');
    const resDiv = document.getElementById('keywords-result');
    const saveBtn = document.getElementById('btn-save-jd');

    if (!appId) {
        textarea.value = "";
        resDiv.innerHTML = "";
        if (saveBtn) saveBtn.style.display = 'none';
        return;
    }

    const app = studentApps.find(a => a.id == appId);
    if (app) {
        textarea.value = app.jd_text || "";
        if (saveBtn) saveBtn.style.display = 'inline-block';

        if (app.jd_keywords) {
            resDiv.innerHTML = `
                <div style="margin-top:10px;">
                    <label style="font-size:0.75rem; color:var(--primary); font-weight:800; letter-spacing:1px;">SAVED BRIEFING NOTES</label>
                    <div class="skill-tag-container" style="margin-top:5px;">
                        ${app.jd_keywords.split(',').map(s => `<span class="skill-tag match" style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2);">✔ ${s.trim()}</span>`).join('')}
                    </div>
                </div>
            `;
        } else {
            resDiv.innerHTML = '<p class="empty-hint" style="font-size:0.8rem;">No keywords extracted yet. Click "Extract Now" to analyze.</p>';
        }
    }
}

/** 4. Search Filter Logic */
function handleSearch() {
    const term = document.getElementById('global-search').value;

    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    // Filter UI immediately for responsiveness
    // Filter Vacancies Grid
    const vCards = document.querySelectorAll('.vacancy-card');
    vCards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term.toLowerCase()) ? 'block' : 'none';
    });

    // Filter Tables
    const rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term.toLowerCase()) ? '' : 'none';
    });

    // Debounce backend integration
    searchTimeout = setTimeout(() => {
        if (activeView === 'job-board') loadVacancies(term);
        if (activeView === 'my-apps') loadMyApplications(term);
        if (activeView === 'applicants') loadCompanyApplicants(term);
    }, 400);
}

// --- 3. STUDENT MODULE LOGIC ---

async function loadVacancies(searchTerm = '') {
    const grid = document.getElementById('vacancies-grid');
    if (!searchTerm) grid.innerHTML = '<p>Loading marketplace vacancies...</p>';
    try {
        const res = await fetch(`/api/vacancies?q=${encodeURIComponent(searchTerm)}`);
        allVacancies = await res.json();
        grid.innerHTML = allVacancies.map(v => `
            <div class="vacancy-card glass-card">
                <span class="tag">${v.industry}</span>
                <span class="view-badge" style="float:right; font-size:0.6rem;">${v.job_type}</span>
                <h3 style="margin-top:10px;">${v.title}</h3>
                <p><strong>${v.company_name}</strong> • ${v.location}</p>
                
                <div class="vacancy-details" style="margin: 10px 0; font-size: 0.85rem; color: var(--text-dim);">
                    <div><i class="fas fa-money-bill-wave"></i> ${v.salary || 'Competitive'}</div>
                    <div><i class="fas fa-calendar-alt"></i> Deadline: ${v.deadline || 'Flexible'}</div>
                    <div style="margin-top:5px;"><i class="fas fa-brain"></i> Skills: ${v.skills_required}</div>
                </div>

                <p class="desc-short">${v.description.substring(0, 100)}...</p>
                <div style="display: flex; gap: 8px; margin-top: 20px;">
                    <button onclick="applyToJob(${v.id})" class="btn-action-primary" style="flex: 3; padding: 10px;">Apply Now</button>
                    ${v.portal_url ? `<a href="${v.portal_url}" target="_blank" class="btn-quick" style="flex: 1; text-decoration: none; font-size: 0.8rem; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2);"><i class="fas fa-external-link-alt"></i></a>` : ''}
                    <button onclick="magicallyAnalyzeVacancy(${v.id})" title="AI Skill Analysis" class="btn-sec wand-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 0;">
                        <i class="fas fa-magic wand-active"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p>No vacancies found.</p>';
    } catch (err) { grid.innerHTML = '<p>Error loading jobs.</p>'; }
}

async function loadMyApplications(searchTerm = '') {
    const table = document.getElementById('my-apps-table');
    if (!searchTerm) table.innerHTML = '<tr><td colspan="10">Loading history...</td></tr>';
    try {
        const studentId = currentUser.profileId || 1;
        const res = await fetch(`/api/applications/student/${studentId}?q=${encodeURIComponent(searchTerm)}`);
        studentApps = await res.json();

        const today = new Date().toISOString().split('T')[0];

        table.innerHTML = (studentApps || []).map(app => {
            const dateStr = app.applied_date || app.date_applied || 'N/A';
            const fDate = app.follow_up_date;

            // Priority formatting
            const priorityStr = app.priority_score ? `${app.priority_score}/10` : '—';
            let priorityBadge = '<span style="color:var(--text-dim); font-size:0.75rem;">—</span>';
            if (app.priority_score) {
                const isHigh = app.priority_score >= 7.5;
                const isMed = app.priority_score >= 5 && app.priority_score < 7.5;
                const pColor = isHigh ? '#ef4444' : (isMed ? '#f59e0b' : 'var(--primary)');
                priorityBadge = `<span style="color:${pColor}; font-weight:800; font-size:0.8rem; background:${pColor}20; padding:2px 6px; border-radius:4px;">${isHigh ? '🔥 ' : ''}${priorityStr}</span>`;
            }

            // Success Probability formatting
            const prob = app.success_probability || 0;
            const probColor = prob > 75 ? '#4ade80' : (prob > 45 ? '#facc15' : '#f87171');
            const probLabel = prob > 75 ? 'EXCELLENT' : (prob > 45 ? 'GOOD' : 'LOW');
            const probIndicator = `
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <div style="font-size:0.8rem; font-weight:800; color:${probColor}">${prob}%</div>
                    <div style="font-size:0.55rem; color:var(--text-dim); letter-spacing:0.5px;">${probLabel}</div>
                </div>
            `;

            let followUpCell = '<span style="color:var(--text-dim); font-size:0.7rem;">—</span>';
            if (fDate) {
                const isOverdue = fDate < today;
                const isToday = fDate === today;
                const fColor = isOverdue ? '#ef4444' : (isToday ? '#f59e0b' : 'var(--primary)');
                const fLabel = isOverdue ? 'OVERDUE' : (isToday ? 'TODAY' : fDate);
                followUpCell = `<span style="font-size:0.7rem; font-weight:700; color:${fColor}; display:flex; align-items:center; gap:4px;">
                    <i class="fas ${isOverdue ? 'fa-exclamation-circle' : (isToday ? 'fa-bell' : 'fa-clock')}"></i> ${fLabel}
                </span>`;
            }
            const intDate = app.interview_date ? new Date(app.interview_date).toLocaleDateString() : '-';
            const intTime = app.interview_date ? new Date(app.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const interviewBadge = app.interview_date ? `<div class="status-pill" style="background:rgba(139,92,246,0.1); color:#8b5cf6; border:1px solid rgba(139,92,246,0.2); font-size:0.7rem;"><i class="fas fa-calendar-alt"></i> ${intDate}<br><span style="font-size:0.6rem; opacity:0.8;">${intTime}</span></div>` : '<span style="color:var(--text-dim); font-size:0.7rem;">—</span>';

            return `
            <tr id="app-row-${app.id}">
                <td><div class="company-logo-mini">${(app.company_name || app.company || "?")[0]}</div> ${app.company_name || app.company}</td>
                <td>${app.job_role || app.role}</td>
                <td><span class="status-pill ${app.status.toLowerCase()}">${app.status}</span></td>
                <td>
                    <div class="match-score-cell" onclick="openMatchDetails(${app.id})">
                        <span class="percentage" id="perc-${app.id}">--%</span>
                        <div class="mini-bar"><div class="fill" id="fill-${app.id}" style="width: 0%"></div></div>
                    </div>
                </td>
                <td>${probIndicator}</td>
                <td>${priorityBadge}</td>
                <td>${dateStr}</td>
                <td><span class="resume-pill" style="cursor:pointer;" onclick="switchView('overview'); document.getElementById('resume-insights-full').scrollIntoView({behavior: 'smooth'});" title="View Performance"><i class="fas fa-file-pdf"></i> ${app.resume_version || 'Default'}</span></td>
                <td>${interviewBadge}</td>
                <td>${followUpCell}</td>
                <td class="action-btns">
                    <button class="btn-sec btn-small" title="Follow-up Email" onclick="openFollowUpModal(${app.id}, 'manual')"><i class="fas fa-paper-plane"></i></button>
                    <button class="btn-sec btn-small" title="Edit" onclick="openEditModal(${app.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-sec btn-small text-danger" title="Discard" onclick="deleteApp(${app.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `}).join('') || '<tr><td colspan="11">No applications tracked yet.</td></tr>';

        // Fetch scores for each
        studentApps.forEach(async app => {
            try {
                const res = await fetch(`/api/match/${app.id}`);
                if (res.ok) {
                    const data = await res.json();
                    const percEl = document.getElementById(`perc-${app.id}`);
                    const fillEl = document.getElementById(`fill-${app.id}`);
                    if (percEl) percEl.innerText = data.match_percentage + '%';
                    if (fillEl) {
                        fillEl.style.width = data.match_percentage + '%';
                        fillEl.style.backgroundColor = data.match_percentage > 70 ? '#4ade80' : (data.match_percentage > 40 ? '#facc15' : '#f87171');
                    }
                }
            } catch (e) { }
        });

        updatePortfolioStats();
    } catch (err) { table.innerHTML = '<tr><td colspan="8">Error loading your records.</td></tr>'; }
}

async function openMatchDetails(appId) {
    try {
        const res = await fetch(`/api/match/${appId}`);
        if (!res.ok) return showToast('info', 'No Data', 'Extract JD keywords first to see match.');
        const data = await res.json();

        const matched = data.matched_skills || [];
        const missing = data.missing_skills || [];

        const msg = `Match Score: ${data.match_percentage}%\n\n✅ Matched: ${matched.join(', ') || 'None'}\n\n❌ Missing: ${missing.join(', ') || 'None'}`;
        alert(msg);
    } catch (err) { showToast('error', 'Error', 'Failed to load match details.'); }
}

function updatePortfolioStats() {
    const total = studentApps.length;
    const active = studentApps.filter(a => a.status === 'Applied' || a.status === 'Shortlisted').length;
    const short = studentApps.filter(a => a.status === 'Shortlisted').length;
    const offers = studentApps.filter(a => a.status === 'Selected').length;

    document.getElementById('stat-total-apps').innerText = total;
    document.getElementById('stat-active-apps').innerText = active;
    document.getElementById('stat-short-apps').innerText = short;
    document.getElementById('stat-offer-apps').innerText = offers;
}

function closeApplyModal() {
    const modal = document.getElementById('apply-modal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    // Reset cover note
    const note = document.getElementById('apply-cover-note');
    if (note) note.value = '';
    // Reset resume radio to first option
    const firstRadio = document.querySelector('input[name="resume-pick"]');
    if (firstRadio) firstRadio.checked = true;
}

async function applyToJob(vId) {
    const vacancy = allVacancies.find(v => v.id === vId);
    if (!vacancy) return;

    // Populate modal with job details
    const titleEl = document.getElementById('apply-job-title');
    const metaEl = document.getElementById('apply-job-meta');
    if (titleEl) titleEl.textContent = vacancy.title;
    if (metaEl) metaEl.textContent = `${vacancy.company_name} • ${vacancy.location || 'Remote'}`;

    // Fetch and Suggest Best Resume
    try {
        const statsRes = await fetch('/api/dashboard/resume-stats', { headers: { 'x-student-id': currentUser.profileId || 1 } });
        const stats = await statsRes.json();
        const best = stats[0];

        // Clear previous badges
        document.querySelectorAll('.rec-badge').forEach(b => b.remove());

        if (best && best.success_rate > 5) {
            document.querySelectorAll('.resume-option').forEach(opt => {
                const val = opt.querySelector('input').value;
                if (val === best._id) {
                    const label = opt.querySelector('.resume-option-label');
                    const badge = document.createElement('span');
                    badge.className = 'rec-badge';
                    badge.innerHTML = 'RECOMMENDED';
                    badge.style = 'font-size: 0.55rem; background: #10b981; color: white; padding: 2px 5px; border-radius: 4px; margin-left: 8px; font-weight: 900; vertical-align: middle;';
                    label.appendChild(badge);
                    opt.querySelector('input').checked = true;
                }
            });
        }
    } catch (e) { console.error('Suggestion fail', e); }

    // Show the modal
    const modal = document.getElementById('apply-modal');
    modal.style.display = 'flex';
    confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);

    freshBtn.addEventListener('click', async () => {
        // Read radio button selection
        const selectedRadio = document.querySelector('input[name="resume-pick"]:checked');
        const resume = selectedRadio ? selectedRadio.value : 'Master CV';
        const coverNote = (document.getElementById('apply-cover-note').value || '').trim();

        try {
            freshBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Submitting...';
            freshBtn.disabled = true;

            // 1. Register application in portal DB (send student_id as header)
            const portalRes = await fetch('/api/portal-apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-student-id': currentUser.profileId || 1
                },
                body: JSON.stringify({
                    vacancy_id: vId,
                    resume_version: resume,
                    cover_note: coverNote
                })
            });

            const portalData = await portalRes.json();
            if (!portalRes.ok) {
                // Handle 409 duplicate or other errors
                showToast('warn', 'Already Applied', portalData.error || 'You already applied for this job.');
                return;
            }

            // 2. Create personal tracker record automatically
            await fetch('/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-student-id': currentUser.profileId || 1
                },
                body: JSON.stringify({
                    company: vacancy.company_name,
                    role: vacancy.title,
                    status: 'Applied',
                    resume_version: resume,
                    date_applied: new Date().toISOString().split('T')[0],
                    follow_up_days: 7, // Default follow-up in 7 days
                    skill_match: 7,
                    interest_level: 8,
                    location_fit: 9,
                    jd_keywords: vacancy.skills_required,
                    jd_text: vacancy.description
                })
            });

            closeApplyModal();
            addActivity(`Applied to ${vacancy.company_name} as ${vacancy.title}`, 'success');
            showToast('success', 'Application Submitted! 🎉', `Your "${resume}" was sent to ${vacancy.company_name}.`);
            switchView('my-apps');
            loadMyApplications();
        } catch (err) {
            showToast('error', 'Submission Failed', 'A network error occurred. Please try again.');
        } finally {
            freshBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Confirm & Submit';
            freshBtn.disabled = false;
        }
    });
}

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
const toastIcons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warn: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
};

function showToast(type = 'info', title = '', subtitle = '', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${toastIcons[type] || 'fa-info-circle'}"></i></div>
        <div class="toast-text">
            <strong>${title}</strong>
            ${subtitle ? `<span>${subtitle}</span>` : ''}
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// --- 4. ADVANCED FEATURES LOGIC ---

/** 🔵 2. Priority Score Calculator */
function calcPriorityResult() {
    const skill = parseInt(document.getElementById('tool-skill').value) || 0;
    const interest = parseInt(document.getElementById('tool-interest').value) || 0;
    const location = parseInt(document.getElementById('tool-location').value) || 0;

    // Formula: (Skill Match * 0.5) + (Interest * 0.3) + (Location Fit * 0.2)
    const score = ((skill * 0.5) + (interest * 0.3) + (location * 0.2)).toFixed(1);

    const res = document.getElementById('priority-result');
    res.innerHTML = `Priority Score: ${score}/10 ${score > 7 ? '🔥 High Priority' : '⏳ Normal'}`;

    const appId = document.getElementById('tool-app-selector').value;
    const saveBtn = document.getElementById('btn-save-priority');
    if (appId && saveBtn) saveBtn.style.display = 'block';

    // Update Readiness Checklist based on score/role
    updateReadinessList(score > 7 ? 'Developer' : 'General');
}

async function savePriorityToDB() {
    const appId = document.getElementById('tool-app-selector').value;
    if (!appId) return;

    const skill = parseInt(document.getElementById('tool-skill').value) || 0;
    const interest = parseInt(document.getElementById('tool-interest').value) || 0;
    const location = parseInt(document.getElementById('tool-location').value) || 0;

    const app = studentApps.find(a => a.id == appId);
    if (!app) return;

    try {
        const res = await fetch(`/api/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...app,
                skill_match: skill,
                interest_level: interest,
                location_fit: location
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showToast('success', 'Score Saved', `Priority updated to ${data.priority_score}`);
        loadMyApplications(); // refresh local state
    } catch (err) {
        showToast('error', 'Update Failed', err.message);
    }
}

/** 🔵 1. Auto Email Generator */
function generateFollowUp(company) {
    const template = `Subject: Follow-up on Application - Professional Candidate\n\nDear HR Team at ${company},\n\nI hope you are doing well. I am writing to follow up on my application for the role. I am very enthusiastic about the opportunity to contribute to ${company} and would appreciate any update on the status of my application.\n\nThank you for your time,\nProfessional Candidate`;
    alert("Generated Template for " + company + ":\n\n" + template);
    // In a real app: window.location.href = `mailto:hr@${company}.com?subject=Follow-up&body=${encodeURIComponent(template)}`;
}

/** 🔵 6. Role-Based Interview Readiness Checklist */
async function updateReadinessList(role) {
    const list = document.getElementById('readiness-list');
    const dbRole = role.toLowerCase().includes('dev') ? 'backend' : 'hr'; // Simple mapping for demo
    try {
        const res = await fetch(`/api/checklist/${dbRole}`);
        const tasks = await res.json();
        list.innerHTML = tasks.map(t => `<label><input type="checkbox"> ☐ ${t.task}</label>`).join('');
    } catch (err) {
        list.innerHTML = '<p>Checklist unavailable.</p>';
    }
}

/** 🔵 3. Job Description Keyword Extractor */
async function extractKeywords() {
    const jdInput = document.getElementById('jd-input');
    const jd = jdInput.value;
    const res = document.getElementById('keywords-result');
    const saveBtn = document.getElementById('btn-save-jd');

    if (!jd) return showToast('error', 'Missing Content', "Please paste a Job Description first.");

    // Loading State
    res.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <i class="fas fa-circle-notch fa-spin" style="font-size:2rem; color:var(--primary); margin-bottom:10px;"></i>
            <p style="color:var(--text-dim); font-size:0.9rem;">Running deep analysis on description...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/tools/extract-keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jd })
        });
        const data = await response.json();

        let techHtml = data.technical_skills.length > 0
            ? data.technical_skills.map(s => `<span class="skill-tag match">💻 ${s}</span>`).join('')
            : '<span style="color:var(--text-dim); font-size:0.8rem;">None detected</span>';

        let softHtml = data.soft_skills.length > 0
            ? data.soft_skills.map(s => `<span class="skill-tag soft">🤝 ${s}</span>`).join('')
            : '<span style="color:var(--text-dim); font-size:0.8rem;">None detected</span>';

        const responsibilities = data.responsibilities || [];

        // Associate with app check
        const appId = document.getElementById('tool-jd-selector').value;
        if (appId && saveBtn) saveBtn.style.display = 'block';

        // Highlight extraction
        res.innerHTML = `
            <div style="text-align:left; margin-top:20px; border-top:1px solid var(--border-glass); padding-top:15px; animation: fadeIn 0.4s ease-out;">
                <p style="font-size:0.65rem; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Estimated Role</p>
                <h3 style="margin-bottom:15px; color:#fff;">${data.title}</h3>
                
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px;">
                    <div>
                        <span style="font-size:0.6rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:4px;">Experience Required</span>
                        <strong style="color:var(--primary); font-size:0.9rem;">${data.experience}</strong>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom:20px;">
                    <div>
                        <p style="font-size:0.65rem; color:#10b981; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;"><i class="fas fa-microchip"></i> Technical Skills</p>
                        <div class="skill-tag-container">${techHtml}</div>
                    </div>
                    <div>
                        <p style="font-size:0.65rem; color:#f59e0b; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;"><i class="fas fa-users"></i> Soft Skills</p>
                        <div class="skill-tag-container">${softHtml}</div>
                    </div>
                </div>

                ${responsibilities.length > 0 ? `
                    <div style="background:rgba(255,255,255,0.02); padding:15px; border-radius:8px; margin-bottom:20px; border: 1px solid var(--border-glass);">
                        <p style="font-size:0.65rem; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;"><i class="fas fa-tasks"></i> Key Responsibilities</p>
                        <ul style="padding-left:18px; color:var(--text-dim); font-size:0.85rem; line-height:1.6; margin:0;">
                            ${responsibilities.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div style="background:linear-gradient(45deg, rgba(64,196,255,0.1), rgba(16,185,129,0.1)); padding:15px; border-radius:8px; border-left:4px solid var(--primary);">
                    <p style="font-size:0.8rem; color:#fff; margin:0; display:flex; align-items:flex-start; gap:10px;">
                        <i class="fas fa-lightbulb" style="color:#f59e0b; font-size:1.2rem; margin-top:2px;"></i>
                        <span><strong>ATS Optimization Tip:</strong> Ensure that the Technical Skills listed above appear exactly as written inside your Resume's "Skills" section to bypass initial automated screening.</span>
                    </p>
                </div>
            </div>
        `;

        // Smooth scroll to the result
        res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
        console.error(err);
        res.innerHTML = `<p style="color:#ef4444; font-size:0.85rem; margin-top:10px; background:rgba(239,68,68,0.1); padding:10px; border-radius:8px;"><i class="fas fa-exclamation-triangle"></i> Extraction Failed. Please check server connection.</p>`;
    }
}

function magicallyAnalyzeVacancy(id) {
    const vacancy = allVacancies.find(v => v.id == id);
    if (!vacancy) return;

    // Switch to tools view
    switchView('tools');

    // Populate JD Input
    const jdInput = document.getElementById('jd-input');
    if (jdInput) {
        jdInput.value = vacancy.description;
    }

    // Auto-trigger extraction
    extractKeywords();
    showToast('info', 'Magic Wand Active', `Analyzing: ${vacancy.title}`);
}


async function saveKeywordsToDB() {
    const appId = document.getElementById('tool-jd-selector').value;
    const resDiv = document.getElementById('keywords-result');
    const jdInput = document.getElementById('jd-input');
    if (!appId) return;

    // Get skills text from the result
    const skillTags = Array.from(resDiv.querySelectorAll('.skill-tag.match')).map(tag => tag.innerText.replace('✔', '').trim());
    const keywordsText = skillTags.join(', ');
    const jdText = jdInput.value;

    const app = studentApps.find(a => a.id == appId);
    if (!app) return;

    try {
        await fetch(`/api/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...app,
                jd_keywords: keywordsText,
                jd_text: jdText
            })
        });

        // Trigger Skill Match Calculation
        const matchRes = await fetch('/api/match/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                application_id: appId,
                student_id: currentUser.profileId || 1,
                jd_keywords: keywordsText
            })
        });
        const matchData = await matchRes.json();

        // Show result in the tool output too
        resDiv.innerHTML += `
            <div style="margin-top:20px; padding:15px; background:rgba(64,196,255,0.1); border-radius:12px; border:1px solid var(--primary);">
                <h4 style="color:var(--primary); margin-bottom:10px;"><i class="fas fa-bullseye"></i> Resume Match Score: ${matchData.match_percentage}%</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <div>
                        <span style="font-size:0.6rem; color:#4ade80;">MATCHED:</span>
                        <span style="font-size:0.7rem;">${matchData.matched_skills.join(', ') || 'None'}</span>
                    </div>
                    <div>
                        <span style="font-size:0.6rem; color:#f87171;">MISSING:</span>
                        <span style="font-size:0.7rem;">${matchData.missing_skills.join(', ') || 'None'}</span>
                    </div>
                </div>
            </div>
        `;

        showToast('success', 'Keywords & Match Saved', `Match Score: ${matchData.match_percentage}%`);
        loadMyApplications();
    } catch (err) {
        showToast('error', 'Error', 'Failed to save keywords.');
    }
}

/** 🔵 1. Follow-up Timer & Success Probability logic */
async function updateGlobalMetrics() {
    if (!currentUser) return;
    const headers = { 'x-student-id': currentUser.profileId || 1 };

    try {
        // 1. Dashboard stats (success rate)
        const dashRes = await fetch('/api/dashboard', { headers });
        const stats = await dashRes.json();
        const bar = document.getElementById('success-progress');
        const text = document.getElementById('success-text');
        if (bar) bar.style.width = (stats.successRate || 0) + '%';
        if (text) text.innerText = (stats.successRate || 0) + '%';

        // 2. Follow-up hint card
        const followRes = await fetch('/api/dashboard/followups', { headers });
        const followData = await followRes.json();
        const followUps = followData.followUps || [];
        const overdue = followUps.filter(f => f.overdue);
        const hint = document.getElementById('follow-up-hint');
        if (hint) {
            if (overdue.length > 0) {
                hint.innerHTML = `<span class="live-blink" style="color:#ef4444; font-weight:900;">⚠ ${overdue.length} OVERDUE</span>`;
            } else if (followUps.length > 0) {
                const next = followUps[0];
                const urgencyColor = next.remaining_days <= 1 ? '#f59e0b' : 'var(--primary)';
                hint.innerHTML = `<span style="color:${urgencyColor}; font-weight:700;">${next.remaining_days}d Left — ${next.name}</span>`;
            } else {
                hint.innerHTML = '<span style="color:#10b981; font-weight:700;"><i class="fas fa-check-circle"></i> All Caught Up</span>';
            }
        }

        // 3. Interview countdown
        try {
            const intRes = await fetch('/api/dashboard/interviews', { headers });
            if (intRes.ok) {
                const intData = await intRes.json();
                const nextInt = intData.nextInterview;
                const countdownEl = document.getElementById('prep-countdown');
                if (countdownEl) {
                    if (nextInt) {
                        if (typeof startInterviewCountdown === 'function') {
                            startInterviewCountdown(nextInt.date, nextInt.name, nextInt.role, nextInt.id);
                        }
                    } else {
                        countdownEl.innerHTML = '<span style="color:var(--text-dim);">No Upcoming</span>';
                    }
                }
            }
        } catch (e) { console.warn('Interviews API not available', e); }

        // 4. Load follow-up cards and checklist
        loadFollowUps(followUps);
        loadResumeInsights();
        loadRoleChecklist();

    } catch (err) { console.error('Global metrics failed:', err); }
}

async function loadFollowUps(preloadedData = null) {
    const grid = document.getElementById('followups-grid');
    const badge = document.getElementById('followup-count-badge');
    if (!grid) return;

    try {
        let followUps;
        if (preloadedData) {
            followUps = preloadedData;
        } else {
            const res = await fetch('/api/dashboard/followups', { headers: { 'x-student-id': currentUser.profileId || 1 } });
            const data = await res.json();
            followUps = data.followUps || [];
        }

        const overdue = followUps.filter(f => f.overdue);
        if (badge) {
            badge.innerText = overdue.length > 0 ? `${overdue.length} ACTION REQUIRED` : `${followUps.length} Pending`;
            badge.style.background = overdue.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)';
            badge.style.color = overdue.length > 0 ? '#ef4444' : '#10b981';
        }

        if (followUps.length === 0) {
            grid.innerHTML = `
                <div style="padding:30px; text-align:center; color:var(--text-dim);">
                    <i class="fas fa-check-circle" style="font-size:2rem; color:#10b981; margin-bottom:10px; display:block;"></i>
                    <p>No pending follow-ups. You're all caught up!</p>
                </div>`;
            return;
        }

        grid.innerHTML = followUps.map(a => {
            const isOverdue = a.overdue;
            const isDueToday = a.due_today;
            const borderColor = isOverdue ? '#ef4444' : (isDueToday ? '#f59e0b' : 'rgba(255,255,255,0.05)');
            const tagColor = isOverdue ? '#ef4444' : (isDueToday ? '#f59e0b' : 'var(--primary)');
            const dayLabel = isOverdue ? 'OVERDUE'
                : isDueToday ? 'TODAY'
                    : `${a.remaining_days}d left`;

            return `
                <div class="followup-card" style="border-color: ${borderColor};">
                    <div class="followup-card-header">
                        <div>
                            <h4>${a.name}</h4>
                            <p class="followup-role">${a.role}</p>
                        </div>
                        <div class="followup-timer" style="color:${tagColor}; background:${tagColor}18; border-color:${tagColor}40;">
                            <i class="fas ${isOverdue ? 'fa-exclamation-triangle' : 'fa-hourglass-half'}"></i>
                            ${dayLabel}
                        </div>
                    </div>
                    <div class="followup-meta">
                        Applied ${a.daysSinceApplied} day${a.daysSinceApplied !== 1 ? 's' : ''} ago · Due ${a.follow_up_date}
                    </div>
                    <div class="followup-actions">
                        <button class="followup-btn-primary" onclick="openFollowUpModal(${a.id}, '${a.type}')">
                            <i class="fas fa-paper-plane"></i> Generate Email
                        </button>
                        <button class="followup-btn-done" onclick="completeFollowUp(${a.id})" title="Mark Done">
                            <i class="fas fa-check"></i> Done
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) { console.error('Follow-ups load failed', err); }
}

let currentFollowUpData = null;

async function openFollowUpModal(id, type) {
    console.log(`Opening Follow-up: id=${id}, type=${type}`);
    try {
        const res = await fetch(`/api/dashboard/followup/template/${id}?type=${type}`);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Server error");
        }

        currentFollowUpData = await res.json();
        const modal = document.getElementById('followup-modal');
        const title = document.getElementById('followup-modal-title');

        if (title && currentFollowUpData.app) {
            title.innerText = `Follow-up: ${currentFollowUpData.app.company}`;
        }

        switchFollowUpTemplate('standard');

        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    } catch (err) {
        console.error("Follow-up load error:", err);
        alert(`Failed to load template: ${err.message}`);
    }
}

function switchFollowUpTemplate(tplKey) {
    if (!currentFollowUpData) return;
    document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-tpl-${tplKey}`).classList.add('active');

    const content = currentFollowUpData.templates[tplKey];
    document.getElementById('email-template-content').innerText = content;
}

function copyFollowUpEmail() {
    const text = document.getElementById('email-template-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast('success', 'Copied!', 'Email template copied to clipboard.');
    }).catch(() => {
        showToast('error', 'Copy Failed', 'Please copy the text manually.');
    });
}

function closeFollowUpModal() {
    const modal = document.getElementById('followup-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

async function loadRoleChecklist() {
    const roleSelector = document.getElementById('checklist-role-selector');
    const role = roleSelector?.value || 'Frontend Developer';
    const list = document.getElementById('readiness-list');
    const progContainer = document.getElementById('checklist-progress-container');
    const progBar = document.getElementById('checklist-progress-bar');
    const progPercent = document.getElementById('checklist-progress-percent');

    if (!list) return;

    try {
        const studentId = currentUser.profileId || 1;
        const res = await fetch(`/api/dashboard/checklist/${encodeURIComponent(role)}`, {
            headers: { 'x-student-id': studentId }
        });
        const tasks = await res.json();

        if (tasks.length > 0) {
            progContainer.style.display = 'block';
            const completedCount = tasks.filter(t => t.completed).length;
            const percentage = Math.round((completedCount / tasks.length) * 100);

            progBar.style.width = `${percentage}%`;
            progPercent.innerText = `${percentage}%`;

            list.innerHTML = tasks.map((t, idx) => `
                <div class="checklist-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding: 12px; border-radius: 14px; background: ${t.completed ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${t.completed ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)'}; opacity: ${t.completed ? '0.7' : '1'}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); animation: slideUp 0.3s ease-out ${idx * 0.05}s both;">
                    <label style="display:flex; align-items:center; gap:12px; cursor: pointer; width: 100%;">
                        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                            <input type="checkbox" ${t.completed ? 'checked' : ''} 
                                   onchange="toggleTaskStatus(${t.id}, this.checked, '${role}')"
                                   style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer; z-index: 2; opacity: 0.8;">
                        </div>
                        <span style="font-size: 0.88rem; color: ${t.completed ? 'var(--text-dim)' : '#fff'}; ${t.completed ? 'text-decoration: line-through;' : ''}; font-weight: 500;">${t.task}</span>
                    </label>
                    ${t.completed ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 0.9rem;"></i>' : ''}
                </div>
            `).join('');
        } else {
            progContainer.style.display = 'none';
            list.innerHTML = '<p class="empty-hint">No tasks found for this role.</p>';
        }
    } catch (err) {
        console.error('Checklist failed', err);
        list.innerHTML = '<p class="empty-hint">Failed to load preparation steps.</p>';
    }
}

async function toggleTaskStatus(taskId, isCompleted, role) {
    try {
        const studentId = currentUser.profileId || 1;
        const res = await fetch('/api/dashboard/checklist/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-student-id': studentId
            },
            body: JSON.stringify({ taskId, completed: isCompleted, role })
        });
        if (!res.ok) throw new Error();

        // Progress was saved successfully
        showToast('success', 'Progress Sync', `Refining ${role} prep...`);

        // Reload to update progress bar and visual styles
        loadRoleChecklist();
    } catch (err) {
        showToast('error', 'Sync Failed', 'Check list progress could not be saved.');
    }
}

let interviewInterval = null;

function startInterviewCountdown(dateStr, company, role, nextId) {
    if (interviewInterval) clearInterval(interviewInterval);
    const target = new Date(dateStr).getTime();
    const countdownEl = document.getElementById('prep-countdown');
    const briefBtn = document.getElementById('btn-pre-brief');

    // Intelligent Role Mapping for Checklist
    const roleSelector = document.getElementById('checklist-role-selector');
    if (roleSelector && role) {
        const lowerRole = role.toLowerCase();
        if (lowerRole.includes('front')) roleSelector.value = "Frontend Developer";
        else if (lowerRole.includes('back')) roleSelector.value = "Backend Developer";
        else if (lowerRole.includes('full') || lowerRole.includes('stack')) roleSelector.value = "Full Stack Developer";
        else if (lowerRole.includes('data') || lowerRole.includes('analyst')) roleSelector.value = "Data Analyst";
        else if (lowerRole.includes('dev') || lowerRole.includes('engineer')) roleSelector.value = "Full Stack Developer"; // Default to Full Stack
        loadRoleChecklist(); // Update the checklist behind the scenes
    }

    const nextIntId_val = nextId;

    function update() {
        const now = new Date().getTime();
        const diff = target - now;

        if (diff < 0) {
            countdownEl.innerHTML = '<span class="live-blink" style="color:#ef4444; font-weight:900;">LIVE NOW!</span>';
            if (briefBtn) briefBtn.style.display = 'inline-block';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        let display = "";
        if (days > 0) display = `${days}d ${hours}h`;
        else if (hours > 0) display = `${hours}h ${mins}m`;
        else display = `${mins}m Remaining`;

        countdownEl.innerText = display;

        // Show briefing button if within 7 days
        if (diff < (86400000 * 7) && briefBtn) {
            const nextIntId = nextIntId_val; // scope capture
            briefBtn.style.display = 'block';
            briefBtn.innerHTML = `<i class="fas fa-file-invoice"></i> Prep for ${company}`;
            briefBtn.onclick = () => {
                switchView('tools', nextIntId);
            };
        } else if (briefBtn) {
            briefBtn.style.display = 'none';
        }
    }

    update();
    interviewInterval = setInterval(update, 60000);
}

async function loadResumeInsights() {
    const previewContainer = document.getElementById('resume-insights-preview');
    const fullContainer = document.getElementById('resume-insights-full');

    try {
        const res = await fetch('/api/dashboard/resume-stats', { headers: { 'x-student-id': currentUser.profileId || 1 } });
        const data = await res.json();

        // 1. POPULATE OVERVIEW PREVIEW (The Long Box)
        if (previewContainer) {
            if (data.length > 0) {
                previewContainer.innerHTML = data.slice(0, 3).map(item => {
                    const rate = item.success_rate || 0;
                    const color = rate > 70 ? '#4ade80' : (rate > 40 ? '#facc15' : '#f87171');
                    return `
                        <div style="background: rgba(255,255,255,0.03); padding: 5px 12px; border-radius: 8px; border: 1px solid var(--border-glass); display: flex; align-items: center; gap: 8px;">
                            <span style="font-weight: 800; color: ${color}; font-size: 0.8rem;">${rate}%</span>
                            <span style="font-size: 0.7rem; color: var(--text-dim); white-space: nowrap;">${item._id}</span>
                        </div>
                    `;
                }).join('');
            } else {
                previewContainer.innerHTML = `<p class="empty-hint" style="font-size: 0.75rem;">No stats yet.</p>`;
            }
        }

        // 2. POPULATE FULL ANALYTICS PAGE
        if (fullContainer) {
            if (data.length > 0) {
                fullContainer.innerHTML = data.map(item => {
                    const count = item.total_apps || 0;
                    const rate = item.success_rate || 0;
                    const label = item.label || 'Average';
                    const companies = item.companies || 'Various Recruiters';
                    const color = rate > 70 ? '#10b981' : (rate > 40 ? '#facc15' : '#ef4444');

                    return `
                    <div class="resume-stat-card" style="border-top: 5px solid ${color}">
                        <div class="card-glow-orb" style="background: ${color}"></div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                            <div class="card-icon-box">
                                <i class="fas fa-file-contract"></i>
                            </div>
                            <div style="text-align: right;">
                                <div class="card-win-rate">${rate}%</div>
                                <div class="card-win-label">Win Rate</div>
                            </div>
                        </div>

                        <h4 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin: 0 0 8px 0;">${item._id}</h4>
                        <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
                            <i class="fas fa-briefcase" style="font-size: 0.75rem; color: var(--primary);"></i> ${companies.split(', ').slice(0, 3).join(', ')}${companies.split(', ').length > 3 ? '...' : ''}
                        </div>
                        
                        <p style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 30px; line-height: 1.6; flex-grow: 1; opacity: 0.9;">
                            Utilized in <strong>${count}</strong> applications. Current tracking patterns indicate this version performs at an <strong>${label}</strong> level.
                        </p>
                        
                        <div class="card-metric-grid">
                            <div class="card-metric-tile">
                                <div class="card-mini-label">Shortlisted</div>
                                <div class="card-mini-value" style="color: var(--primary);">${item.shortlists || 0}</div>
                            </div>
                            <div class="card-metric-tile">
                                <div class="card-mini-label">Final Offers</div>
                                <div class="card-mini-value" style="color: #10b981;">${item.offers || 0}</div>
                            </div>
                        </div>

                        <div class="card-footer-badge" style="background: ${color}10; color: ${color}; border-color: ${color}25;">
                            ${label} Performance
                        </div>
                    </div>
                    `;
                }).join('');
            } else {
                fullContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 100px 20px;">
                    <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.03); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 1px solid var(--border-glass);">
                        <i class="fas fa-chart-line" style="font-size: 2rem; color: var(--text-dim); opacity: 0.5;"></i>
                    </div>
                    <h3 style="color: #fff; margin-bottom: 10px; font-family: 'Outfit', sans-serif;">Analytical Engine Idle</h3>
                    <p class="empty-hint" style="max-width: 440px; margin: 0 auto; line-height: 1.6;">Your tracking system is waiting for more data. Submit applications with different resume versions to unlock success rate insights.</p>
                </div>`;
            }
        }
    } catch (err) { console.error('Insights failed'); }
}

function addActivity(msg, type = 'info') {
    const log = document.getElementById('activity-log');
    if (!log) return;

    const hint = log.querySelector('.empty-hint');
    if (hint) hint.remove();

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement('div');
    item.className = `activity-item activity-${type}`;
    item.innerHTML = `
        <div class="activity-dot"></div>
        <div class="activity-body">
            <p>${msg}</p>
            <small>${time}</small>
        </div>
    `;
    log.prepend(item);
}

// --- 5. COMPANY MODULE LOGIC ---

async function postJob() {
    const title = document.getElementById('job-title').value;
    const job_type = document.getElementById('job-type').value;
    const location_type = document.getElementById('job-loc-type').value;
    const location = document.getElementById('job-location').value;
    const salary = document.getElementById('job-salary').value;
    const deadline = document.getElementById('job-deadline').value;
    const min_cgpa = document.getElementById('job-cgpa').value;
    const skills = document.getElementById('job-skills').value;
    const portal_url = document.getElementById('job-portal-url').value;
    const description = document.getElementById('job-desc').value;

    try {
        const res = await fetch('/api/vacancies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_name: currentUser.name, // Important: use name since controller expects it
                title, job_type, location_type, location, salary, deadline, min_cgpa, skills_required: skills, description, portal_url
            })
        });

        if (res.ok) {
            showToast('success', 'Vacancy Broadcasted! 🚀', `Your role "${title}" is now live in the marketplace.`);
            // Reset fields
            ['job-title', 'job-location', 'job-salary', 'job-deadline', 'job-cgpa', 'job-skills', 'job-portal-url', 'job-desc'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            switchView('overview');
            loadCompanyStats();
        }
    } catch (err) { showToast('error', 'Post Failed', 'A network error occurred.'); }
}

async function loadCompanyStats() {
    try {
        const res = await fetch(`/api/company/stats/${currentUser.profileId}`);
        const stats = await res.json();
        
        // Update counters
        const jobEl = document.getElementById('stat-jobs');
        const appEl = document.getElementById('stat-apps');
        const shortEl = document.getElementById('stat-shortlisted');
        const selectEl = document.getElementById('stat-selected');
        
        if (jobEl) jobEl.innerText = stats.totalJobs || 0;
        if (appEl) appEl.innerText = stats.totalApps || 0;
        if (shortEl) shortEl.innerText = stats.shortlisted || 0;
        if (selectEl) selectEl.innerText = stats.selected || 0;

        // Load mini pipeline for Overview
        const miniPipe = document.getElementById('company-mini-pipeline');
        if (miniPipe) {
            const applicantsRes = await fetch(`/api/company/applicants/${currentUser.profileId}?limit=5`);
            const applicants = await applicantsRes.json();
            
            if (applicants.length === 0) {
                miniPipe.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-dim);">No recent applications found.</td></tr>';
                return;
            }

            miniPipe.innerHTML = applicants.slice(0, 5).map(a => {
                const match = typeof a.match_percentage === 'number' ? a.match_percentage : 0;
                const statusClass = a.status.toLowerCase();
                const date = a.date_applied || a.applied_date || 'Recent';
                
                return `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:28px; height:28px; background:var(--primary-glow); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; color:var(--primary);">
                                    ${a.student_name[0]}
                                </div>
                                <div>
                                    <div style="font-weight:700;">${a.student_name}</div>
                                    <div style="font-size:0.6rem; color:var(--text-dim);">${a.role}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="match-badge" style="background: hsla(${match}, 70%, 50%, 0.1); color: hsl(${match}, 70%, 40%); font-size:0.75rem; padding:2px 8px;">
                                ${match}%
                            </div>
                        </td>
                        <td><span class="status-pill ${statusClass}" style="font-size:0.6rem; padding:2px 8px;">${a.status}</span></td>
                        <td style="font-size:0.75rem; color:var(--text-dim);">${date}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) { console.error('Stats load failed', err); }
}

function calculateMatch(studentSkills, requiredSkills) {
    if (!studentSkills || !requiredSkills) return 0;
    const sArr = studentSkills.toLowerCase().split(',').map(s => s.trim());
    const rArr = requiredSkills.toLowerCase().split(',').map(s => s.trim());
    const matches = rArr.filter(r => sArr.includes(r));
    return Math.round((matches.length / rArr.length) * 100);
}

async function loadCompanyApplicants(searchTerm = '') {
    const table = document.getElementById('company-applicants-table');
    if (!searchTerm) table.innerHTML = '<tr><td colspan="5">Fetching talent pipeline...</td></tr>';
    try {
        const res = await fetch(`/api/company/applicants/${currentUser.profileId}?q=${encodeURIComponent(searchTerm)}`);
        companyApplicants = await res.json();
        table.innerHTML = companyApplicants.map(a => {
            const studentSkills = Array.isArray(a.student_skills) ? a.student_skills : (a.student_skills || '').split(',').map(s => s.trim());
            const jobSkills = Array.isArray(a.job_skills) ? a.job_skills : (a.job_skills || '').split(',').map(s => s.trim());
            
            const matching = jobSkills.filter(s => s && studentSkills.some(ss => ss.toLowerCase() === s.toLowerCase()));
            const missing = jobSkills.filter(s => s && !studentSkills.some(ss => ss.toLowerCase() === s.toLowerCase()));
            const match = jobSkills.length > 0 ? Math.round((matching.length / jobSkills.length) * 100) : 0;
            return `
                <tr>
                    <td>
                        <strong>${a.student_name}</strong><br>
                            <small style="color:var(--primary)">${a.university}</small><br>
                                <span class="view-badge" style="font-size:0.6rem; margin-top:5px;">RESUME: ${a.resume_version || 'Not Spec'}</span>
                            </td>
                            <td>
                                <div class="skill-tag-container">
                                    ${matching.map(s => `<span class="skill-tag match">✔ ${s}</span>`).join('')}
                                    ${missing.map(s => `<span class="skill-tag miss">✘ ${s}</span>`).join('')}
                                </div>
                            </td>
                            <td>
                                <div class="match-badge" style="background: hsla(${match}, 70%, 50%, 0.1); color: hsl(${match}, 70%, 40%);">
                                    ${match}%
                                </div>
                            </td>
                            <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
                            <td class="recruiter-actions">
                                <button class="btn-sec btn-small" title="View JD" onclick="viewFullJD(${a.id}, 'recruiter')"><i class="fas fa-eye"></i> JD</button>
                                <button class="btn-primary-glow btn-small shortlist" onclick="updatePortalAppStatus(${a.id}, 'Shortlisted')">Shortlist</button>
                                <button class="btn-primary-glow btn-small selected" onclick="updatePortalAppStatus(${a.id}, 'Selected')">Hire</button>
                                <button class="btn-sec btn-small" onclick="deletePortalApp(${a.id}, '${a.student_name}')"><i class="fas fa-user-minus"></i> Remove</button>
                            </td>
                        </tr>
                        `;
        }).join('') || '<tr><td colspan="5">No applicants found for your vacancies.</td></tr>';
    } catch (err) { table.innerHTML = '<tr><td colspan="5">Error loading pipeline.</td></tr>'; }
}

async function updatePortalAppStatus(appId, newStatus) {
    try {
        await fetch(`/api/portal-apply/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        addActivity(`Updated applicant status to ${newStatus}`, 'info');
        loadCompanyApplicants();
        loadCompanyStats();
    } catch (err) { alert('Update failed'); }
}

async function deletePortalApp(id, name) {
    if (!confirm(`Dismiss application from ${name}?`)) return;
    try {
        await fetch(`/api/portal-apply/${id}`, { method: 'DELETE' });
        addActivity(`Removed applicant ${name} from pipeline`, 'warn');
        loadCompanyApplicants();
        loadCompanyStats();
    } catch (err) { alert('Failed to remove applicant'); }
}

// --- 6. MISC UTILITIES (CRUD HELPERS) ---

let activeEditId = null;

function openAddModal() {
    activeEditId = null;
    document.getElementById('modal-title').innerText = "Add New Application";
    document.getElementById('modal-company').value = "";
    document.getElementById('modal-role').value = "";
    document.getElementById('modal-status').value = "Applied";
    document.getElementById('modal-resume').value = "";
    document.getElementById('modal-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-interview-date').value = "";
    document.getElementById('modal-followup-days').value = "7";
    document.getElementById('modal-followup-date').value = "";
    document.getElementById('app-modal').style.display = 'flex';
}

async function completeFollowUp(appId) {
    try {
        const res = await fetch(`/api/dashboard/followups/complete/${appId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-student-id': currentUser.profileId || 1
            }
        });
        if (!res.ok) throw new Error('Server error');
        showToast('success', 'Follow-up Successful 🎉', 'Marked as completed in your tracker.');

        // Refresh EVERYTHING to reflect the change
        updateGlobalMetrics();
        if (document.getElementById('view-my-apps').style.display === 'block') {
            loadMyApplications();
        }
    } catch (err) {
        showToast('error', 'Update Failed', 'Could not sync with the database.');
    }
}


function openEditModal(id) {
    const app = studentApps.find(a => a.id === id);
    if (!app) return;

    activeEditId = id;
    document.getElementById('modal-title').innerText = "Edit Application Record";
    document.getElementById('modal-company').value = app.company_name || app.company;
    document.getElementById('modal-role').value = app.job_role || app.role;
    document.getElementById('modal-status').value = app.status;
    document.getElementById('modal-resume').value = app.resume_version || "";
    document.getElementById('modal-date').value = app.applied_date || app.date_applied || "";
    document.getElementById('modal-interview-date').value = app.interview_date || "";
    document.getElementById('modal-followup-days').value = app.follow_up_days || "";
    document.getElementById('modal-followup-date').value = app.follow_up_date || "";
    document.getElementById('app-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('app-modal').style.display = 'none';
}

async function saveApplicationRecord() {
    const company = document.getElementById('modal-company').value;
    const role = document.getElementById('modal-role').value;
    if (!company || !role) return showToast('error', 'Missing Fields', 'Company and Role are required.');

    const status = document.getElementById('modal-status').value;
    const appliedDate = document.getElementById('modal-date').value || new Date().toISOString().split('T')[0];
    const followDays = parseInt(document.getElementById('modal-followup-days').value) || 7;
    let followDate = document.getElementById('modal-followup-date').value;

    // Auto-calculate follow_up_date if not manually set
    if (!followDate) {
        const d = new Date(appliedDate);
        d.setDate(d.getDate() + followDays);
        followDate = d.toISOString().split('T')[0];
    }

    const payload = {
        student_id: currentUser.profileId || 1,
        company_name: company,
        company: company,
        role: role,
        status: status,
        resume_version: document.getElementById('modal-resume').value,
        applied_date: appliedDate,
        date_applied: appliedDate,
        interview_date: document.getElementById('modal-interview-date').value || null,
        follow_up_date: followDate,
        notes: "",
        link: ""
    };

    try {
        const url = activeEditId ? `/api/applications/${activeEditId}` : '/api/applications';
        const method = activeEditId ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-student-id': currentUser.profileId || 1
            },
            body: JSON.stringify(payload)
        });

        showToast('success', 'Success', activeEditId ? 'Application updated.' : `Application added. Follow-up set for ${followDate}`);
        closeModal();
        loadMyApplications();
        updateGlobalMetrics();
    } catch (err) { showToast('error', 'Error', 'Failed to save record.'); }
}


async function deleteApp(id) {
    const app = studentApps.find(a => a.id === id);
    if (!confirm(`Discard record for ${app ? app.company : 'this company'}?`)) return;
    try {
        await fetch(`/api/applications/${id}`, { method: 'DELETE' });
        addActivity(`Deleted record: ${app ? app.company : 'Application'}`, 'warn');
        loadMyApplications();
    } catch (err) { alert('Delete failed'); }
}

async function saveQuickEntry() {
    const company = document.getElementById('quick-company').value;
    const role = document.getElementById('quick-role').value;
    const resume = document.getElementById('quick-resume').value;

    if (!company || !role) return alert("Enter Company and Role");

    const payload = {
        company,
        role,
        resume_version: resume || "Master",
        status: "Applied",
        date_applied: new Date().toISOString().split('T')[0],
        follow_up_days: 7,
        notes: "Quick entry trace",
        link: ""
    };

    try {
        await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Reset fields
        document.getElementById('quick-company').value = "";
        document.getElementById('quick-role').value = "";
        document.getElementById('quick-resume').value = "";

        addActivity(`Manually tracked application for ${company}`, 'info');
        loadMyApplications();
    } catch (err) { alert('Quick add failed'); }
}

async function viewVacancyJD(id) {
    const vacancy = allVacancies.find(v => v.id == id);
    if (!vacancy) return;

    document.getElementById('jd-viewer-title').innerText = vacancy.title;
    document.getElementById('jd-viewer-body').innerText = vacancy.description || "No description provided.";
    const modal = document.getElementById('jd-viewer-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

async function viewFullJD(id, context = 'student') {
    let jdText = "";
    let name = "";

    if (context === 'student') {
        const app = studentApps.find(a => a.id == id);
        if (!app) return;
        jdText = app.jd_text || "No full job description saved for this manual entry.";
        name = `${app.company_name || app.company} - ${app.job_role || app.role}`;
    } else {
        const applicant = companyApplicants.find(a => a.id == id);
        if (!applicant) return;
        jdText = applicant.jd_text || "No description provided.";
        name = `${applicant.student_name} applied for: ${applicant.role}`;
    }

    document.getElementById('jd-viewer-title').innerText = name;
    document.getElementById('jd-viewer-body').innerText = jdText;
    const modal = document.getElementById('jd-viewer-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeJDModal() {
    const modal = document.getElementById('jd-viewer-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

