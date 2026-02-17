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
export const getEmployees = async (token) => {
  const response = await fetch(`${BASE_URL}/employees`, {
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
