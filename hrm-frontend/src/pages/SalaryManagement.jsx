import { useEffect, useMemo, useState } from "react";
import {
  assignSalariesBulk,
  getCompensationPolicy,
  getEmployees,
  reviseSalariesBulk,
  updateCompensationPolicy,
} from "../services/api";
import { decodeToken } from "../services/api";

function emptyDeduction() {
  return { label: "", type: "percent", value: 0 };
}

export default function SalaryManagement({ token }) {
  const effectiveToken = token ?? localStorage.getItem("token");
  const role = decodeToken(effectiveToken)?.role || null;
  const canManage = role === "superadmin" || role === "hr";

  const [employees, setEmployees] = useState([]);
  const [salaryDraft, setSalaryDraft] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [policy, setPolicy] = useState({ taxRatePercent: 0, deductions: [] });
  const [newDeduction, setNewDeduction] = useState(emptyDeduction());
  const [revisionMode, setRevisionMode] = useState("percent");
  const [revisionValue, setRevisionValue] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    const [empRes, policyRes] = await Promise.all([
      getEmployees(effectiveToken, "", 1000),
      getCompensationPolicy(effectiveToken),
    ]);
    const list = Array.isArray(empRes?.employees) ? empRes.employees : [];
    setEmployees(list);
    const draft = {};
    list.forEach((e) => {
      draft[e._id] = Number(e.salary || 0);
    });
    setSalaryDraft(draft);
    setPolicy({
      taxRatePercent: Number(policyRes?.taxRatePercent || 0),
      deductions: Array.isArray(policyRes?.deductions) ? policyRes.deductions : [],
    });
  };

  useEffect(() => {
    if (effectiveToken && canManage) loadAll();
  }, [effectiveToken, canManage]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(employees.map((e) => e._id)));
  };

  const clearSelected = () => setSelected(new Set());

  const saveSalaryAssignments = async () => {
    try {
      setSaving(true);
      const targetIds = selectedIds.length > 0 ? selectedIds : employees.map((e) => e._id);
      const assignments = targetIds.map((id) => ({
        employeeId: id,
        salary: Number(salaryDraft[id] || 0),
      }));
      const res = await assignSalariesBulk(assignments, effectiveToken);
      if (res?.message) {
        alert(`${res.message} (${res.modifiedCount || 0} updated)`);
        await loadAll();
      } else {
        alert(res?.message || "Could not save salaries");
      }
    } finally {
      setSaving(false);
    }
  };

  const applyRevision = async () => {
    if (revisionValue === "" || Number.isNaN(Number(revisionValue))) {
      alert("Enter a revision value");
      return;
    }
    try {
      setSaving(true);
      const res = await reviseSalariesBulk(
        {
          mode: revisionMode,
          value: Number(revisionValue),
          employeeIds: selectedIds,
        },
        effectiveToken
      );
      if (res?.message) {
        alert(`${res.message} (${res.modifiedCount || 0} updated)`);
        await loadAll();
      } else {
        alert(res?.message || "Could not apply revision");
      }
    } finally {
      setSaving(false);
    }
  };

  const addDeduction = () => {
    const label = String(newDeduction.label || "").trim();
    const value = Number(newDeduction.value || 0);
    if (!label || value < 0) return;
    setPolicy((prev) => ({
      ...prev,
      deductions: [...prev.deductions, { label, type: newDeduction.type === "fixed" ? "fixed" : "percent", value }],
    }));
    setNewDeduction(emptyDeduction());
  };

  const savePolicy = async () => {
    try {
      setSaving(true);
      const res = await updateCompensationPolicy(
        {
          taxRatePercent: Number(policy.taxRatePercent || 0),
          deductions: policy.deductions,
        },
        effectiveToken
      );
      if (res?._id || res?.key === "global") {
        alert("Tax and deduction policy updated");
        await loadAll();
      } else {
        alert(res?.message || "Could not update policy");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return <div style={styles.page}>Only superadmin/HR can access Salary Management.</div>;
  }

  return (
    <div style={styles.page}>
      <h2 style={{ margin: 0 }}>Salary Management</h2>
      <p style={{ margin: "4px 0 10px 0", color: "#6b7280" }}>
        Set, edit and assign salaries. Configure mass deductions and taxes. Apply bulk salary upgrades when needed.
      </p>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Mass Deductions & Taxes</h3>
          <div style={styles.row}>
            <label style={styles.label}>Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              value={policy.taxRatePercent}
              onChange={(e) => setPolicy((p) => ({ ...p, taxRatePercent: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13 }}>Deductions</div>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {policy.deductions.map((d, idx) => (
              <div key={`${d.label}-${idx}`} style={styles.listRow}>
                <div>{d.label} ({d.type === "fixed" ? `INR ${d.value}` : `${d.value}%`})</div>
                <button
                  style={styles.smallBtn}
                  onClick={() =>
                    setPolicy((p) => ({ ...p, deductions: p.deductions.filter((_, i) => i !== idx) }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            {policy.deductions.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No deductions configured.</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr .9fr .8fr auto", gap: 6, marginTop: 8 }}>
            <input
              placeholder="Deduction label"
              value={newDeduction.label}
              onChange={(e) => setNewDeduction((d) => ({ ...d, label: e.target.value }))}
              style={styles.input}
            />
            <select
              value={newDeduction.type}
              onChange={(e) => setNewDeduction((d) => ({ ...d, type: e.target.value }))}
              style={styles.input}
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="Value"
              value={newDeduction.value}
              onChange={(e) => setNewDeduction((d) => ({ ...d, value: e.target.value }))}
              style={styles.input}
            />
            <button style={styles.smallBtn} onClick={addDeduction}>Add</button>
          </div>

          <button style={styles.primaryBtn} onClick={savePolicy} disabled={saving}>
            {saving ? "Saving..." : "Save Policy"}
          </button>
        </section>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Salary Upgrade / Revision</h3>
          <div style={styles.row}>
            <label style={styles.label}>Revision Type</label>
            <select value={revisionMode} onChange={(e) => setRevisionMode(e.target.value)} style={styles.input}>
              <option value="percent">Percent Increase/Decrease</option>
              <option value="fixed">Fixed Amount (+/-)</option>
            </select>
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Value</label>
            <input
              type="number"
              value={revisionValue}
              onChange={(e) => setRevisionValue(e.target.value)}
              style={styles.input}
              placeholder={revisionMode === "percent" ? "e.g. 10 or -5" : "e.g. 2500 or -1000"}
            />
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Applies to selected employees. If none selected, applies to all active employees.
          </div>
          <button style={styles.primaryBtn} onClick={applyRevision} disabled={saving}>
            {saving ? "Applying..." : "Apply Revision"}
          </button>
        </section>
      </div>

      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Assign Salaries</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button style={styles.smallBtn} onClick={selectAll}>Select All</button>
          <button style={styles.smallBtn} onClick={clearSelected}>Clear Selection</button>
          <button style={styles.primaryBtn} onClick={saveSalaryAssignments} disabled={saving}>
            {saving ? "Saving..." : "Save Salaries"}
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Select</th>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Designation</th>
                <th style={styles.th}>Salary (INR)</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e._id}>
                  <td style={styles.td}>
                    <input type="checkbox" checked={selected.has(e._id)} onChange={() => toggleSelected(e._id)} />
                  </td>
                  <td style={styles.td}>{e.name}</td>
                  <td style={styles.td}>{e.department?.name || "-"}</td>
                  <td style={styles.td}>{e.designation?.title || "-"}</td>
                  <td style={styles.td}>
                    <input
                      type="number"
                      min="0"
                      value={salaryDraft[e._id] ?? 0}
                      onChange={(ev) =>
                        setSalaryDraft((d) => ({
                          ...d,
                          [e._id]: ev.target.value,
                        }))
                      }
                      style={styles.input}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: { background: "#e1d7ee", minHeight: "100vh", padding: 24, display: "flex", flexDirection: "column", gap: 12 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: { background: "#f4eefb", border: "1px solid #ececec", borderRadius: 12, padding: 12 },
  cardTitle: { margin: "0 0 10px 0", fontSize: 16 },
  row: { display: "grid", gap: 6, marginBottom: 8 },
  label: { fontSize: 13, color: "#374151", fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" },
  primaryBtn: { padding: "8px 12px", borderRadius: 8, border: "1px solid #d9c8f6", background: "#f3ecff", color: "#3f2a5f", cursor: "pointer", fontWeight: 700 },
  smallBtn: { padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" },
  listRow: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: 12 },
  td: { padding: 8, borderBottom: "1px solid #f3f4f6", fontSize: 13, color: "#374151" },
};

