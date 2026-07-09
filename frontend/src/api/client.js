const API_BASE = "/api";

export function createApiClient(auth) {
  async function request(path, options = {}) {
    return parseResponse(
      await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
          ...options.headers,
        },
      }),
    );
  }

  return {
    getCustomers: (search = "") => request(`/customers/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    createCustomer: (payload) => request("/customers/", { method: "POST", body: JSON.stringify(payload) }),
    getAppointments: ({ search = "", status = "" } = {}) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("ordering", "scheduled_at");
      return request(`/appointments/${params.toString() ? `?${params.toString()}` : ""}`);
    },
    createAppointment: (payload) => request("/appointments/", { method: "POST", body: JSON.stringify(payload) }),
    updateAppointment: (id, payload) => request(`/appointments/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
    getTimeline: (id) => request(`/appointments/${id}/timeline/`),
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const message =
      data?.detail ||
      Object.entries(data || {})
        .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join(" ");
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return data;
}
