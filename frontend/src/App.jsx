import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  DollarSign,
  LoaderCircle,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react";
import { createApiClient, signupBusiness } from "./api/client";
import { AppSidebar } from "./components/AppSidebar";
import { Banner } from "./components/Banner";
import { EmptyState } from "./components/EmptyState";
import { IconButton } from "./components/IconButton";
import { Topbar } from "./components/Topbar";
import { AppointmentsPanel } from "./features/appointments/AppointmentsPanel";
import { TimelineDrawer } from "./features/appointments/TimelineDrawer";
import { emptyAppointmentForm } from "./features/appointments/appointmentDefaults";
import { CustomersPanel } from "./features/customers/CustomersPanel";
import {
  loadSavedCredentials,
  removeSavedCredentials,
  saveCredentials,
  toBasicAuth,
} from "./utils/auth";

const DEFAULT_SIGNUP_FORM = {
  business_name: "",
  username: "",
  email: "",
  password: "",
  timezone: "America/New_York",
};

const DEFAULT_THEME = "system";

export default function App() {
  const [credentials, setCredentials] = useState(loadSavedCredentials);
  const [auth, setAuth] = useState("");
  const [profile, setProfile] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [customers, setCustomers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [signupMode, setSignupMode] = useState(false);
  const [signupForm, setSignupForm] = useState(DEFAULT_SIGNUP_FORM);
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointmentForm);
  const [timeline, setTimeline] = useState({ appointment: null, events: [] });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const api = useMemo(() => createApiClient(auth), [auth]);
  const stats = useMemo(
    () => getDeskStats(customers, appointments),
    [customers, appointments],
  );

  function resetSession({ clearCredentials = false } = {}) {
    removeSavedCredentials();
    setAuth("");
    setProfile(null);
    setCustomers([]);
    setAppointments([]);
    setTimeline({ appointment: null, events: [] });
    if (clearCredentials) {
      setCredentials({ username: "", password: "" });
    }
  }

  function hasOwnedBusiness(nextProfile) {
    return (nextProfile?.businesses || []).length > 0;
  }

  async function loadData(client = api) {
    if (!auth && client === api) return;
    setLoading(true);
    setError("");
    try {
      const [customerData, appointmentData] = await Promise.all([
        client.getCustomers(customerSearch),
        client.getAppointments({
          search: appointmentSearch,
          status: statusFilter,
        }),
      ]);
      setCustomers(customerData.results || customerData);
      setAppointments(appointmentData.results || appointmentData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function restoreSavedSession() {
      if (!credentials.username || !credentials.password || auth) return;
      const savedAuth = toBasicAuth(credentials.username, credentials.password);
      const savedApi = createApiClient(savedAuth);
      try {
        const nextProfile = await savedApi.getProfile();
        if (!hasOwnedBusiness(nextProfile)) {
          resetSession({ clearCredentials: true });
          setError(
            "That saved user does not own a business. Sign in with a business owner account.",
          );
          return;
        }
        setProfile(nextProfile);
        setAuth(savedAuth);
      } catch (err) {
        resetSession({ clearCredentials: true });
        setError("Saved sign-in expired or is invalid. Please sign in again.");
      }
    }

    restoreSavedSession();
  }, []);

  useEffect(() => {
    if (auth && profile) loadData();
  }, [auth, statusFilter]);

  async function login(event) {
    event.preventDefault();
    const nextAuth = toBasicAuth(credentials.username, credentials.password);
    const nextApi = createApiClient(nextAuth);
    setError("");
    try {
      const nextProfile = await nextApi.getProfile();
      if (!hasOwnedBusiness(nextProfile)) {
        resetSession({ clearCredentials: true });
        setError(
          "This user does not own a business. Sign in with the business owner username.",
        );
        return;
      }
      setProfile(nextProfile);
      setAuth(nextAuth);
      setSignupMode(false);
      saveCredentials(credentials);
      setNotice("Signed in for this browser.");
      await loadData(nextApi);
    } catch (err) {
      resetSession({ clearCredentials: true });
      setError(err.message);
    }
  }

  function logout() {
    resetSession({ clearCredentials: true });
  }

  async function signup(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await signupBusiness(signupForm);
      const nextCredentials = {
        username: signupForm.username,
        password: signupForm.password,
      };
      const nextProfile = {
        ...result.user,
        businesses: [result.business],
      };
      saveCredentials(nextCredentials);
      setCredentials(nextCredentials);
      setProfile(nextProfile);
      setAuth(toBasicAuth(nextCredentials.username, nextCredentials.password));
      setSignupForm(DEFAULT_SIGNUP_FORM);
      setSignupMode(false);
      setNotice("Business account created.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function createCustomer(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createCustomer(customerForm);
      setCustomerForm({ name: "", email: "", phone: "" });
      setNotice("Customer added.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createAppointment(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createAppointment({
        ...appointmentForm,
        scheduled_at: new Date(appointmentForm.scheduled_at).toISOString(),
        duration_minutes: Number(appointmentForm.duration_minutes),
        service_price: appointmentForm.service_price || "0.00",
      });
      setAppointmentForm(emptyAppointmentForm());
      setNotice("Appointment scheduled.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openTimeline(appointment) {
    setTimeline({ appointment, events: [] });
    setError("");
    try {
      const events = await api.getTimeline(appointment.id);
      setTimeline({ appointment, events });
    } catch (err) {
      setError(err.message);
    }
  }

  async function touchAppointment(appointment) {
    setError("");
    try {
      await api.updateAppointment(appointment.id, {
        duration_minutes: appointment.duration_minutes,
      });
      setNotice("Appointment updated.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className={`app-shell theme-${theme}`}>
      <AppSidebar
        auth={auth}
        credentials={credentials}
        metrics={[
          {
            icon: <UsersRound size={18} />,
            label: "Customers",
            value: stats.customerCount,
          },
          {
            icon: <Clock3 size={18} />,
            label: "Pending",
            value: stats.pendingCount,
          },
          {
            icon: <DollarSign size={18} />,
            label: "Scheduled value",
            value: `$${stats.scheduledValue.toFixed(0)}`,
          },
        ]}
        onCredentialsChange={setCredentials}
        onLogin={login}
        onLogout={logout}
        onSignup={signup}
        onSignupChange={setSignupForm}
        onSignupModeChange={setSignupMode}
        onThemeChange={setTheme}
        profile={profile}
        signupForm={signupForm}
        signupMode={signupMode}
        theme={theme}
      />

      <section className="workspace">
        <Topbar
          title="Daily Desk"
          subtitle="Keep the customer list clean and appointments moving."
          action={
            <IconButton
              disabled={!auth || !profile || loading}
              onClick={loadData}
              title="Refresh"
            >
              {loading ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <RefreshCw size={18} />
              )}
            </IconButton>
          }
        />

        {(notice || error) && (
          <Banner
            tone={error ? "error" : "success"}
            onDismiss={() => (error ? setError("") : setNotice(""))}
          >
            {error || notice}
          </Banner>
        )}

        {!auth || !profile ? (
          <EmptyState
            icon={<UserRound size={42} />}
            title="Sign in with your Django user"
            message="Use a business owner account. Users without a business are signed out automatically."
          />
        ) : (
          <div className="content-grid">
            <CustomersPanel
              customers={customers}
              form={customerForm}
              search={customerSearch}
              onCreate={createCustomer}
              onFormChange={setCustomerForm}
              onSearch={setCustomerSearch}
              onSearchSubmit={loadData}
            />
            <AppointmentsPanel
              appointments={appointments}
              customers={customers}
              form={appointmentForm}
              search={appointmentSearch}
              statusFilter={statusFilter}
              onCreate={createAppointment}
              onFormChange={setAppointmentForm}
              onOpenTimeline={openTimeline}
              onSearch={setAppointmentSearch}
              onSearchSubmit={loadData}
              onStatusFilter={setStatusFilter}
              onTouchAppointment={touchAppointment}
            />
          </div>
        )}
      </section>

      {timeline.appointment && (
        <TimelineDrawer
          appointment={timeline.appointment}
          events={timeline.events}
          onClose={() => setTimeline({ appointment: null, events: [] })}
        />
      )}
    </main>
  );
}

function getDeskStats(customers, appointments) {
  return {
    customerCount: customers.length,
    pendingCount: appointments.filter(
      (appointment) => appointment.status === "pending",
    ).length,
    scheduledValue: appointments.reduce(
      (total, appointment) => total + Number(appointment.service_price || 0),
      0,
    ),
  };
}
