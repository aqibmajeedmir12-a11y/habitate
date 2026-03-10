/* ══════════════════════════════════════
   REPORTS.JS — Renders Data & Exports PDF
══════════════════════════════════════ */

let currentReportData = null;

// Hook onto the page routing system in common.js
const originalGoTo = window.goTo;
window.goTo = function (pageId) {
    originalGoTo(pageId);
    if (pageId === "reports") {
        loadReportData();
    }
};

async function loadReportData() {
    const loading = document.getElementById("report-loading");
    const content = document.getElementById("report-content");
    const btn = document.getElementById("btn-download-pdf");

    if (!loading || !content) return;

    loading.style.display = "block";
    content.style.display = "none";
    btn.style.display = "none";

    try {
        const res = await fetchAuth(`${API_BASE}/api/features/report`);
        if (!res.ok) throw new Error("Could not load report");
        const data = await res.json();
        currentReportData = data;

        // Fill top generic details
        const user = window.currentUser || { name: "User" };
        document.getElementById("report-date").innerText = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById("report-user-name").innerText = user.name;

        // Fill AI stats
        document.getElementById("report-ai-summary").innerText = data.aiSummary || "Your habit data reveals strong structural consistency. Keep going.";
        document.getElementById("report-stat-total").innerText = data.totalHabits;
        document.getElementById("report-stat-pct").innerText = data.completionRate + "%";
        document.getElementById("report-stat-streak").innerText = data.avgStreak;

        // Populate Habit Table rows
        const tbody = document.getElementById("report-table-body");
        if (data.habits && data.habits.length > 0) {
            tbody.innerHTML = data.habits.map((h, i) => `
        <tr style="border-bottom:1px solid #f1f5f9; background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
          <td style="padding:10px; font-weight:600; display:flex; align-items:center; gap:8px;">
            <div style="font-size:16px">${h.emoji || '✅'}</div> ${h.name}
          </td>
          <td style="padding:10px;">${h.category || 'General'}</td>
          <td style="padding:10px; text-align:center; font-weight:700;">${h.streak || 0} 🔥</td>
          <td style="padding:10px; text-align:right;">
             <span style="padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; ${h.done ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#991b1b;'}">
               ${h.done ? 'COMPLETED' : 'PENDING'}
             </span>
          </td>
        </tr>
      `).join("");
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:#94a3b8;">No habits tracked yet.</td></tr>`;
        }

        loading.style.display = "none";
        content.style.display = "flex";
        btn.style.display = "inline-flex";

    } catch (err) {
        console.error("Report load error:", err);
        loading.innerHTML = `<i class="fa fa-triangle-exclamation" style="font-size:32px; color:var(--red); margin-bottom:14px;"></i><br><span style="color:var(--red)">Failed to generate AI report.</span>`;
    }
}

function downloadReportPDF() {
    const element = document.getElementById('report-content');
    const btn = document.getElementById("btn-download-pdf");

    if (!element || !window.html2pdf) {
        showToast("❌ PDF generator not loaded properly");
        return;
    }

    const originalDisplay = element.style.display;
    btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Generating...`;
    btn.disabled = true;

    const opt = {
        margin: 10,
        filename: `HabitAI_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Give the canvas a clean white background wrapper so transparency isn't blackened
    window.html2pdf().set(opt).from(element).save().then(() => {
        btn.innerHTML = `<i class="fa fa-download"></i> Download PDF`;
        btn.disabled = false;
        showToast("✅ PDF generated successfully!");
    }).catch(err => {
        console.error("PDF generation failed:", err);
        btn.innerHTML = `<i class="fa fa-download"></i> Download PDF`;
        btn.disabled = false;
        showToast("❌ Failed to generate PDF");
    });
}
