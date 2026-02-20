const BASE_URL = "http://localhost:5000/api";

// =========================
// AUTH
// =========================
export const login = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
};

// =========================
// EMPLOYEES
// =========================
export const getEmployees = async (token, search = "") => {
  const url = `${BASE_URL}/employees${search ? `?search=${encodeURIComponent(search)}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

export const addEmployee = async (data, token) => {
  const response = await fetch(`${BASE_URL}/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return response.json();
};

export const updateEmployee = async (id, data, token) => {
  const response = await fetch(`${BASE_URL}/employees/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return response.json();
};

export const deleteEmployee = async (id, token) => {
  const response = await fetch(`${BASE_URL}/employees/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

// =========================
// DEPARTMENTS
// =========================
export const getDepartments = async (token) => {
  const response = await fetch("http://localhost:5000/api/departments", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

// =========================
// DESIGNATIONS
// =========================
export const getDesignations = async (token) => {
  const response = await fetch("http://localhost:5000/api/designations", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

// =========================
// ATTENDANCE
// =========================
export const getAttendance = async (token, month = "") => {
  const url = `${BASE_URL}/attendance${month ? `?month=${encodeURIComponent(month)}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

// =========================
// PAYROLL
// =========================
export const getPayrolls = async (token) => {
  const response = await fetch(`${BASE_URL}/payroll`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

export const generatePayroll = async (payload, token) => {
  const response = await fetch(`${BASE_URL}/payroll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return response.json();
};

// =========================
// LEAVE
// =========================
export const getLeaveTypes = async (token) => {
  const response = await fetch(`${BASE_URL}/leaves/types`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

export const applyLeave = async (data, token) => {
  const response = await fetch(`${BASE_URL}/leaves/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return response.json();
};

export const getLeaveRequests = async (token) => {
  const response = await fetch(`${BASE_URL}/leaves`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

export const updateLeaveStatus = async (id, status, token) => {
  const response = await fetch(`${BASE_URL}/leaves/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  return response.json();
};

export const adjustLeaveBalance = async (employeeId, body, token) => {
  const response = await fetch(`${BASE_URL}/employees/${employeeId}/leave-balance`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return response.json();
};

// Lightweight JWT decode to read role from token payload (no verification)
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (err) {
    return null;
  }
};

// =========================
// EMPLOYEE SELF-SERVICE API
// =========================
export const loginEmployee = async (data) => {
  const response = await fetch(`${BASE_URL}/employee-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return response.json();
};

export const getMyLeaves = async (token, month = '') => {
  const url = `${BASE_URL.replace('/api', '/api/employee')}/leaves${month ? `?month=${encodeURIComponent(month)}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return response.json();
};

export const getMyPayrolls = async (token, month = '') => {
  const url = `${BASE_URL.replace('/api', '/api/employee')}/payrolls${month ? `?month=${encodeURIComponent(month)}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return response.json();
};

export const getMyAttendance = async (token, month = '') => {
  const url = `${BASE_URL.replace('/api', '/api/employee')}/attendance${month ? `?month=${encodeURIComponent(month)}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return response.json();
};
