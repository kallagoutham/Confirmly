# Confirmly — Product & Technical Requirements

**Version:** 1.0  
**Status:** MVP specification  
**Primary backend:** Django + Django REST Framework  
**Goal:** Build an appointment-management platform that reduces missed appointments through reminders, secure one-click actions, explainable no-show risk scoring, and action-oriented business dashboards.

---

## 1. Problem Statement

Small businesses such as salons, trainers, tutors, clinics, and service providers lose time and revenue when customers forget, cancel late, or do not attend appointments.

Most calendar tools can create appointments and send generic reminders, but they do not help a business answer:

- Which upcoming appointments are most likely to become no-shows?
- Why are those appointments risky?
- What action should the business take now?
- Has this customer shown a pattern of cancellations or no-shows?
- What revenue is currently at risk?

Confirmly solves this with an **explainable rule-based risk engine**. It does not claim to make medical, credit, employment, insurance, or other high-impact decisions. It helps a business prioritize appointment follow-up.

---

## 2. Target Users

### 2.1 Business Owner / Staff User
Can:
- Create and manage customers.
- Create, update, cancel, and mark appointment outcomes.
- View upcoming appointment risk.
- View customer attendance history.
- Send or retry reminders.
- Review event history and risk explanations.

### 2.2 Customer
Can:
- Receive appointment reminders.
- Open a secure one-click confirmation or cancellation link.
- Confirm or cancel an appointment without creating an account.

### 2.3 System Administrator (future / optional)
Can:
- Manage platform-level settings.
- Review audit logs.
- Configure global rule templates.
- Handle tenant onboarding.

---

## 3. MVP Scope

### In Scope
1. Multi-tenant businesses.
2. Customer and appointment CRUD.
3. Appointment statuses: pending, confirmed, cancelled, completed, no_show.
4. Email reminders at 24 hours and 2 hours before the appointment.
5. Signed, expiring confirmation and cancellation links.
6. Idempotent reminder delivery.
7. Event timeline for appointments.
8. Explainable no-show risk score (0–100).
9. Dashboard for risk, attendance, and revenue-at-risk metrics.
10. Background processing with Celery and Redis.
11. Audit-friendly storage of risk assessments and rule versions.

### Future Scope
- [ ] Real machine-learning model.
- [ ] Payments or deposits.
- [ ] SMS / WhatsApp integration.
- [ ] Google Calendar / Outlook sync.
- [ ] Full role-based staff permissions beyond business owner.
- [ ] Customer self-service rescheduling calendar.
- [ ] Automated phone calls.
- [ ] Predictive analytics across multiple unrelated businesses.

---

## 4. Recommended Technology Stack

| Area | Choice |
|---|---|
| Backend | Django |
| REST API | Django REST Framework |
| Database | PostgreSQL |
| Background jobs | Celery |
| Scheduler | Celery Beat |
| Message broker / cache | Redis |
| Email provider | Resend, SendGrid, or AWS SES |
| Auth | Django auth + JWT or session auth |
| API docs | drf-spectacular / OpenAPI |
| Deployment | Docker Compose initially |
| Monitoring | Structured logs + Sentry (optional) |

### Why This Stack
- Django provides fast model, admin, auth, and migration development.
- PostgreSQL supports transactional behavior, JSON fields, indexes, and reliable reporting.
- Celery and Redis support asynchronous reminder delivery, retries, and scheduled jobs.
- Docker Compose makes the local environment reproducible.

---

## 5. Core Domain Model

### 5.1 Business

```python
class Business(models.Model):
    name = models.CharField(max_length=150)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    timezone = models.CharField(max_length=64, default="America/New_York")
    reminder_email_from_name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 5.2 Customer

```python
class Customer(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="customers")
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)

    no_show_count = models.PositiveIntegerField(default=0)
    cancel_count = models.PositiveIntegerField(default=0)
    completed_count = models.PositiveIntegerField(default=0)

    last_no_show_at = models.DateTimeField(null=True, blank=True)
    last_cancelled_at = models.DateTimeField(null=True, blank=True)
    last_appointment_at = models.DateTimeField(null=True, blank=True)
    preferred_hour = models.PositiveSmallIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["business", "email"],
                name="unique_customer_email_per_business",
            )
        ]
```

### 5.3 Appointment

```python
class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"
        NO_SHOW = "no_show", "No Show"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="appointments")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="appointments")

    title = models.CharField(max_length=150)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    service_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["business", "scheduled_at"]),
            models.Index(fields=["business", "status", "scheduled_at"]),
        ]
```

### 5.4 Appointment Event

Store immutable business events. Do not rely only on the current appointment status.

```python
class AppointmentEvent(models.Model):
    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        REMINDER_24H_SENT = "reminder_24h_sent", "24h Reminder Sent"
        REMINDER_2H_SENT = "reminder_2h_sent", "2h Reminder Sent"
        REMINDER_FAILED = "reminder_failed", "Reminder Failed"
        REMINDER_OPENED = "reminder_opened", "Reminder Opened"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"
        NO_SHOW = "no_show", "No Show"
        RISK_CALCULATED = "risk_calculated", "Risk Calculated"

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="events",
    )
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    metadata = models.JSONField(default=dict)
    actor_type = models.CharField(max_length=30, default="system")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["appointment", "created_at"]),
            models.Index(fields=["event_type", "created_at"]),
        ]
```

### 5.5 Reminder Log

This is the idempotency boundary for sending reminders.

```python
class ReminderLog(models.Model):
    class ReminderType(models.TextChoices):
        HOURS_24 = "24h", "24 Hours"
        HOURS_2 = "2h", "2 Hours"

    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="reminder_logs")
    reminder_type = models.CharField(max_length=10, choices=ReminderType.choices)
    provider_message_id = models.CharField(max_length=255, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["appointment", "reminder_type"],
                name="unique_reminder_per_appointment_type",
            )
        ]
```

### 5.6 Risk Assessment

Every calculation must be stored for auditability and debugging.

```python
class RiskAssessment(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="risk_assessments")
    score = models.PositiveSmallIntegerField()
    level = models.CharField(max_length=20)
    reasons = models.JSONField(default=list)
    recommended_action = models.CharField(max_length=255)
    rules_version = models.CharField(max_length=30)
    inputs_snapshot = models.JSONField(default=dict)
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["appointment", "-calculated_at"]),
            models.Index(fields=["level", "-calculated_at"]),
        ]
```

---

## 6. Data and Tenant Isolation Requirements

1. Every business-owned object must include a `business` relationship directly or be reachable through an object that does.
2. Every authenticated API query must be filtered by the requesting user’s business.
3. Never trust a client-provided `business_id` for authorization.
4. A user must not be able to retrieve, modify, or infer another business’s customers, appointments, events, reminders, or risk data.
5. Use serializer validation and queryset scoping together; do not depend on only one layer.
6. Add tests that attempt cross-tenant reads and writes.

Example safe query pattern:

```python
Appointment.objects.filter(
    business=request.user.business,
    id=appointment_id,
)
```

---

## 7. Appointment Lifecycle

```text
pending
  ├── customer confirms ──> confirmed
  ├── customer/staff cancels ──> cancelled
  └── appointment time passes
         ├── staff marks attended ──> completed
         └── staff marks absent ──> no_show
```

### Lifecycle Rules
- A cancelled appointment cannot be confirmed without an explicit staff-created replacement appointment.
- A completed or no-show appointment is terminal for the MVP.
- A no-show can only be marked by authenticated business staff.
- Status changes must append an `AppointmentEvent`.
- Status changes that affect customer history must update the customer counters transactionally.
- Risk should be recalculated after creation, status changes, reminder outcomes, and customer-history changes.

---

## 8. Functional Requirements

### FR-1: Create Customer
The business user can create a customer with name, email, and optional phone number.

### FR-2: Create Appointment
The business user can create an appointment for a customer with title, date/time, duration, and service price.

Validation:
- `scheduled_at` must be in the future at creation time.
- Appointment customer must belong to the same business.
- Service price must be non-negative.
- Duration must be greater than zero.

### FR-3: Update Appointment
The business user can update eligible appointments.

Rules:
- Recalculate risk after changing time, customer, price, or status.
- If an appointment time changes materially, invalidate old action links and generate new ones.
- Consider sending a fresh reminder after rescheduling.

### FR-4: Cancel Appointment
An appointment may be cancelled by a customer through a valid signed URL or by staff through an authenticated endpoint.

### FR-5: Confirm Appointment
A customer may confirm through a valid signed URL.

### FR-6: Mark Outcome
Staff can mark an elapsed appointment as `completed` or `no_show`.

### FR-7: Send Reminders
The system sends reminders:
- 24 hours before start time.
- 2 hours before start time.

### FR-8: Dashboard
The business user can view:
- Upcoming appointments.
- High-risk appointments.
- Confirmed/pending/cancelled/no-show counts.
- Confirmation rate.
- Cancellation rate.
- No-show rate.
- Revenue at risk.
- Repeat no-show customers.

### FR-9: Appointment Timeline
The business user can view the ordered event history of an appointment.

### FR-10: Risk Explanation
For every displayed risk score, show:
- Score.
- Risk level.
- Human-readable reasons.
- Recommended action.
- Timestamp and rule version.

---

## 9. API Requirements

### Authenticated Business APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/customers/` | Create customer |
| GET | `/api/customers/` | List/search customers |
| GET | `/api/customers/{id}/` | Customer detail with history |
| POST | `/api/appointments/` | Create appointment |
| GET | `/api/appointments/` | List/filter appointments |
| GET | `/api/appointments/{id}/` | Appointment detail |
| PATCH | `/api/appointments/{id}/` | Update appointment |
| POST | `/api/appointments/{id}/mark-completed/` | Mark attended |
| POST | `/api/appointments/{id}/mark-no-show/` | Mark no-show |
| POST | `/api/appointments/{id}/send-reminder/` | Manual reminder retry |
| GET | `/api/appointments/{id}/timeline/` | View events |
| GET | `/api/appointments/{id}/risk/` | Latest assessment |
| GET | `/api/dashboard/` | Dashboard metrics |

### Public Customer Action APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/action/confirm/{token}/` | Validate token and display confirmation |
| POST | `/action/confirm/{token}/` | Confirm appointment |
| GET | `/action/cancel/{token}/` | Validate token and display cancellation |
| POST | `/action/cancel/{token}/` | Cancel appointment |

### Example Risk Response

```json
{
  "appointment_id": 42,
  "risk_score": 74,
  "risk_level": "high",
  "reasons": [
    "Customer has 2 previous no-shows",
    "Customer had a no-show within the last 30 days",
    "Appointment remains unconfirmed within 24 hours",
    "Customer opened reminder but has not confirmed"
  ],
  "recommended_action": "Call the customer, require confirmation, and consider a deposit.",
  "rules_version": "v1.0",
  "calculated_at": "2026-06-22T15:00:00Z"
}
```

---

## 10. Background Processing Requirements

### 10.1 Scheduled Jobs

Celery Beat runs every 5 minutes.

It should:
1. Find appointments within the 24-hour reminder window that have not received a 24-hour reminder.
2. Find appointments within the 2-hour reminder window that have not received a 2-hour reminder.
3. Attempt to create a `ReminderLog` inside a transaction.
4. Queue a dedicated email task only after the reminder log is created.
5. Recalculate risk after reminder state changes.

### 10.2 Idempotency Rules

1. A reminder type must be sent at most once per appointment unless a future explicit override feature is implemented.
2. The unique constraint on `(appointment, reminder_type)` is the source of truth.
3. A retry must not generate duplicate customer emails.
4. If a Celery task is retried after provider timeout, record the uncertain outcome and use provider message IDs when available.
5. The system must handle two scheduler processes racing for the same appointment.

Recommended pattern:

```python
with transaction.atomic():
    reminder_log, created = ReminderLog.objects.get_or_create(
        appointment=appointment,
        reminder_type="24h",
    )

if created:
    send_reminder_email.delay(reminder_log.id)
```

### 10.3 Retry Policy

- Retry transient email-provider failures with exponential backoff.
- Do not retry permanent failures such as invalid email format.
- Record failures in `AppointmentEvent`.
- Surface failed reminders to staff in the dashboard or appointment timeline.

---

## 11. Secure Action Link Requirements

Use Django signing with an expiration time.

### Required Token Payload

```json
{
  "appointment_id": 42,
  "business_id": 7,
  "action": "confirm",
  "appointment_updated_at": "2026-06-22T15:00:00Z",
  "nonce": "random-value"
}
```

### Token Rules

1. Token must be signed.
2. Token must expire.
3. Token must be action-specific; a confirmation token cannot be used for cancellation.
4. Token must be invalidated when the appointment is materially changed or cancelled.
5. Token use must be logged as an appointment event.
6. Public endpoints must not expose customer information beyond what is needed to complete the action.
7. Apply rate limiting to public action endpoints.
8. Use POST for state-changing confirmation/cancellation actions.

Example:

```python
from django.core import signing

token = signing.dumps(payload, salt="appointment-action-v1")
payload = signing.loads(
    token,
    salt="appointment-action-v1",
    max_age=60 * 60 * 24 * 7,
)
```

---

# 12. Rule-Based No-Show Risk Engine

## 12.1 Purpose

The risk engine estimates the likelihood that an upcoming appointment will become a no-show. It is a prioritization tool, not a definitive prediction.

It must always provide:
- A bounded numeric score from 0 to 100.
- A risk level.
- Transparent reasons.
- A recommended business action.
- The exact rule version used.

## 12.2 Inputs

### Customer History
- Previous no-show count.
- Previous cancellation count.
- Completed appointment count.
- Date of most recent no-show.
- Date of most recent cancellation.
- Date of most recent appointment.
- Customer’s usual appointment hour (derived from historical completed bookings).

### Appointment State
- Current status.
- Appointment scheduled time.
- Appointment creation time.
- Price.
- Reminder state.
- Reminder-opened signal, if available.
- Confirmation timestamp, if available.

### Operational Context
- Time until appointment.
- Booking lead time.
- Day of week.
- Appointment hour.
- Tenant/business timezone.

## 12.3 Score Formula

```text
raw_score =
    customer_history_points
  + confirmation_behavior_points
  + booking_behavior_points
  + timing_points
  + business_impact_points
  + positive_reliability_adjustments

final_score = clamp(raw_score, 0, 100)
```

The system must retain the individual rule contributions in the assessment input snapshot or reasons list.

## 12.4 Risk Levels

| Score | Level | Default Action |
|---:|---|---|
| 0–19 | very_low | Normal workflow |
| 20–39 | low | Normal reminder workflow |
| 40–69 | medium | Send additional reminder / prominently surface to staff |
| 70–100 | high | Staff follow-up, explicit confirmation, consider deposit policy |

The app must never automatically cancel an appointment based only on risk score.

---

## 13. Rule Catalog — Version v1.0

### 13.1 Customer History Rules

| Rule ID | Condition | Points | Reason |
|---|---|---:|---|
| CH-001 | `no_show_count >= 3` | +35 | Customer has 3+ previous no-shows |
| CH-002 | `no_show_count == 2` | +28 | Customer has 2 previous no-shows |
| CH-003 | `no_show_count == 1` | +15 | Customer has a previous no-show |
| CH-004 | `cancel_count >= 4` | +14 | Customer frequently cancels appointments |
| CH-005 | `cancel_count in [2, 3]` | +8 | Customer has multiple past cancellations |
| CH-006 | most recent no-show within 30 days | +15 | Customer had a no-show within the last 30 days |
| CH-007 | most recent no-show within 31–90 days | +8 | Customer had a no-show within the last 90 days |
| CH-008 | most recent cancellation within 14 days | +8 | Customer cancelled another appointment recently |
| CH-009 | `completed_count >= 10` and `no_show_count == 0` | -15 | Customer has strong reliable attendance history |
| CH-010 | `completed_count in [5, 9]` and `no_show_count == 0` | -8 | Customer has completed several appointments reliably |

### 13.2 Confirmation and Reminder Rules

| Rule ID | Condition | Points | Reason |
|---|---|---:|---|
| CR-001 | status is pending and appointment starts within 6 hours | +25 | Appointment is still unconfirmed and starts soon |
| CR-002 | status is pending and appointment starts within 24 hours | +18 | Appointment remains unconfirmed within 24 hours |
| CR-003 | status is pending and appointment starts within 72 hours | +10 | Appointment is unconfirmed within 3 days |
| CR-004 | status is pending and appointment starts after 72 hours | +5 | Appointment is not yet confirmed |
| CR-005 | status is confirmed | -22 | Customer explicitly confirmed the appointment |
| CR-006 | reminder opened, status pending, starts within 24 hours | +12 | Customer opened reminder but has not confirmed |
| CR-007 | 24-hour reminder not sent and appointment starts within 24 hours | +10 | 24-hour reminder was not sent |
| CR-008 | 2-hour reminder not sent and appointment starts within 2 hours | +12 | 2-hour reminder was not sent |

### 13.3 Booking Behavior Rules

| Rule ID | Condition | Points | Reason |
|---|---|---:|---|
| BB-001 | booking lead time >= 14 days | +12 | Appointment was booked more than 14 days ahead |
| BB-002 | booking lead time is 7–13 days | +7 | Appointment was booked more than 7 days ahead |
| BB-003 | booking lead time <= 2 hours | +8 | Appointment was booked at the last minute |
| BB-004 | booking lead time is 2–24 hours | +3 | Appointment was booked close to the start time |

### 13.4 Timing and Pattern Rules

| Rule ID | Condition | Points | Reason |
|---|---|---:|---|
| TP-001 | Appointment hour before 08:00 | +9 | Very early appointment time |
| TP-002 | Appointment hour at or after 20:00 | +7 | Late evening appointment time |
| TP-003 | Appointment occurs Saturday or Sunday | +4 | Weekend appointment |
| TP-004 | Difference between appointment hour and preferred hour >= 4 | +6 | Appointment is far from customer's usual booking time |
| TP-005 | Appointment falls within 20–45 days after the last appointment | -5 | Appointment matches customer's regular visit cadence |

### 13.5 Revenue Exposure Rules

These rules represent operational urgency, not a claim that price causes no-shows.

| Rule ID | Condition | Points | Reason |
|---|---|---:|---|
| RE-001 | service price >= 300 | +6 | High-value appointment increases revenue exposure |
| RE-002 | service price is 150–299.99 | +3 | Moderate-value appointment increases revenue exposure |

### 13.6 Rule Interaction Constraints

1. Apply only the highest matching rule from mutually exclusive ranges:
   - CH-001 / CH-002 / CH-003.
   - CH-004 / CH-005.
   - CH-006 / CH-007.
   - CH-009 / CH-010.
   - CR-001 / CR-002 / CR-003 / CR-004.
   - BB-001 / BB-002.
   - RE-001 / RE-002.
2. A confirmation adjustment should apply once.
3. Positive reliability adjustments must not drive a score below zero.
4. Final score must be clamped to `[0, 100]`.
5. Do not include protected characteristics or sensitive personal data as inputs.
6. Do not use price as a likelihood proxy in reports; label it as business impact or revenue exposure.
7. Do not use inferred demographic data, location history, health information, race, religion, disability, age, gender, or other sensitive information.
8. Rule descriptions must match actual executed logic exactly.

---

## 14. Rule Engine Governance and “Regulations”

This section defines product-level operating rules for the engine. It is not legal advice; applicable privacy, anti-discrimination, consumer communication, and data-protection requirements depend on the business’s jurisdiction and industry.

### 14.1 Explainability Requirement
- Every score must return human-readable reasons.
- Reasons must correspond to actual triggered rules.
- Do not show generic explanations that hide the true cause.
- Store `rules_version` and `calculated_at` with each assessment.

### 14.2 Non-Discrimination Requirement
The risk engine must not accept, infer, or use:
- Race or ethnicity.
- Nationality or immigration status.
- Religion.
- Gender identity or sexual orientation.
- Disability or health information.
- Age, except where legally necessary for appointment eligibility and never for risk scoring.
- Financial information.
- Political beliefs.
- Neighborhood-level or proxy demographic signals.

### 14.3 Human-in-the-Loop Requirement
- The score is advisory only.
- The business decides whether to contact the customer, request confirmation, or apply an established deposit policy.
- The system must not auto-cancel, deny service, blacklist, or penalize a customer based only on the score.
- Staff must be able to see the reasons before acting.

### 14.4 Data Minimization Requirement
- Collect only data needed for appointment communication and attendance analysis.
- Do not retain email open information longer than necessary.
- Do not create behavioral profiles unrelated to appointment attendance.
- Store only the minimum personal data required to operate the service.

### 14.5 Accuracy and Correction Requirement
- Staff must be able to correct an incorrectly marked no-show or cancellation.
- Corrections must trigger a recalculation of customer counters and future risk scores.
- Preserve an audit event for the correction.
- Provide a mechanism to invalidate or supersede old risk assessments.

### 14.6 Rule Change Management
Every rule change must:
1. Have a rule version.
2. Document the changed conditions, points, reason text, and expected effect.
3. Include unit tests.
4. Be tested against historical/synthetic scenarios before release.
5. Avoid retroactively overwriting prior assessments.
6. Be deployable behind a feature flag if possible.

Example version records:

```text
v1.0 — Initial weighted rules.
v1.1 — Reduce weekend weight from +4 to +2 after observed false positives.
v1.2 — Add cap to customer-history category to avoid excessive score concentration.
```

### 14.7 Monitoring and Drift Checks
Track:
- Average risk score by week.
- Percentage of appointments in each risk tier.
- Actual no-show rate by risk tier.
- False-positive rate: high-risk appointments that were completed.
- False-negative rate: low-risk appointments that became no-shows.
- Rule-trigger frequency.
- Confirmation conversion after reminders.

Do not claim predictive accuracy until enough real outcome data exists.

### 14.8 Customer Communication Requirement
- Reminder content must clearly identify the business and appointment.
- Provide a simple confirmation/cancellation action.
- Avoid threatening or discriminatory wording.
- Avoid stating that a customer has been “flagged,” “scored,” or “predicted to no-show.”
- Follow applicable opt-in, opt-out, and communication rules for the channel used.

### 14.9 Audit Requirement
Log:
- Appointment lifecycle changes.
- Reminder sends and failures.
- Public action-link usage.
- Risk calculations.
- Rule version.
- Staff actions that override or correct outcomes.

Do not log secrets, raw tokens, passwords, or full sensitive provider payloads.

---

## 15. Risk Engine Pseudocode

```python
def calculate_no_show_risk(appointment) -> RiskResult:
    now = timezone.now()
    customer = appointment.customer
    score = 0
    reasons = []

    # Customer history
    if customer.no_show_count >= 3:
        score += 35
        reasons.append("Customer has 3+ previous no-shows")
    elif customer.no_show_count == 2:
        score += 28
        reasons.append("Customer has 2 previous no-shows")
    elif customer.no_show_count == 1:
        score += 15
        reasons.append("Customer has a previous no-show")

    if customer.cancel_count >= 4:
        score += 14
        reasons.append("Customer frequently cancels appointments")
    elif customer.cancel_count >= 2:
        score += 8
        reasons.append("Customer has multiple past cancellations")

    if customer.last_no_show_at:
        days_since_no_show = (now - customer.last_no_show_at).days
        if days_since_no_show <= 30:
            score += 15
            reasons.append("Customer had a no-show within the last 30 days")
        elif days_since_no_show <= 90:
            score += 8
            reasons.append("Customer had a no-show within the last 90 days")

    if customer.completed_count >= 10 and customer.no_show_count == 0:
        score -= 15
        reasons.append("Customer has strong reliable attendance history")
    elif customer.completed_count >= 5 and customer.no_show_count == 0:
        score -= 8
        reasons.append("Customer has completed several appointments reliably")

    # Confirmation behavior
    hours_until = (appointment.scheduled_at - now).total_seconds() / 3600

    if appointment.status == "pending":
        if hours_until <= 6:
            score += 25
            reasons.append("Appointment is still unconfirmed and starts soon")
        elif hours_until <= 24:
            score += 18
            reasons.append("Appointment remains unconfirmed within 24 hours")
        elif hours_until <= 72:
            score += 10
            reasons.append("Appointment is unconfirmed within 3 days")
        else:
            score += 5
            reasons.append("Appointment is not yet confirmed")
    elif appointment.status == "confirmed":
        score -= 22
        reasons.append("Customer explicitly confirmed the appointment")

    if appointment.last_reminder_opened_at and appointment.status == "pending" and hours_until <= 24:
        score += 12
        reasons.append("Customer opened reminder but has not confirmed")

    if not appointment.reminder_24h_sent and hours_until <= 24:
        score += 10
        reasons.append("24-hour reminder was not sent")

    if not appointment.reminder_2h_sent and hours_until <= 2:
        score += 12
        reasons.append("2-hour reminder was not sent")

    # Booking behavior
    booking_lead_hours = (
        appointment.scheduled_at - appointment.created_at
    ).total_seconds() / 3600

    if booking_lead_hours >= 24 * 14:
        score += 12
        reasons.append("Appointment was booked more than 14 days ahead")
    elif booking_lead_hours >= 24 * 7:
        score += 7
        reasons.append("Appointment was booked more than 7 days ahead")

    if booking_lead_hours <= 2:
        score += 8
        reasons.append("Appointment was booked at the last minute")
    elif booking_lead_hours <= 24:
        score += 3
        reasons.append("Appointment was booked close to the start time")

    # Timing patterns
    hour = appointment.scheduled_at.hour
    weekday = appointment.scheduled_at.weekday()

    if hour < 8:
        score += 9
        reasons.append("Very early appointment time")
    elif hour >= 20:
        score += 7
        reasons.append("Late evening appointment time")

    if weekday in {5, 6}:
        score += 4
        reasons.append("Weekend appointment")

    if customer.preferred_hour is not None and abs(hour - customer.preferred_hour) >= 4:
        score += 6
        reasons.append("Appointment is far from customer's usual booking time")

    # Revenue exposure
    if appointment.service_price >= 300:
        score += 6
        reasons.append("High-value appointment increases revenue exposure")
    elif appointment.service_price >= 150:
        score += 3
        reasons.append("Moderate-value appointment increases revenue exposure")

    # Regular cadence adjustment
    if customer.last_appointment_at:
        days_since_last_visit = (
            appointment.scheduled_at - customer.last_appointment_at
        ).days
        if 20 <= days_since_last_visit <= 45:
            score -= 5
            reasons.append("Appointment matches customer's regular visit cadence")

    score = max(0, min(score, 100))

    if score >= 70:
        level = "high"
        action = "Call the customer, require confirmation, and consider a deposit."
    elif score >= 40:
        level = "medium"
        action = "Send an additional reminder with a one-click confirmation link."
    elif score >= 20:
        level = "low"
        action = "Use the normal reminder workflow."
    else:
        level = "very_low"
        action = "Use the normal reminder workflow."

    return RiskResult(
        score=score,
        level=level,
        reasons=reasons,
        recommended_action=action,
    )
```

---

## 16. Dashboard Metric Definitions

| Metric | Definition |
|---|---|
| Total appointments | Number of appointments in selected period |
| Confirmation rate | confirmed / (confirmed + pending + completed + no_show) where applicable |
| Cancellation rate | cancelled / total appointments |
| No-show rate | no_show / (completed + no_show) |
| High-risk appointments | Upcoming appointments with latest score >= 70 |
| Revenue at risk | Sum of service_price for upcoming pending appointments with score >= 70 |
| Repeat no-show customers | Customers with no_show_count >= 2 |

Metric calculations must:
- Filter by business.
- Use the business timezone for date boundaries.
- Clearly state the selected date range.
- Exclude cancelled appointments from no-show denominator.

---

## 17. Non-Functional Requirements

### Security
- Enforce tenant isolation.
- Use HTTPS in production.
- Use environment variables for credentials.
- Do not store raw provider secrets in the database.
- Validate and rate-limit public token endpoints.
- Use CSRF protections for server-rendered forms.
- Validate all serializer inputs.

### Reliability
- Reminder sends must be idempotent.
- Background tasks must support retry.
- All business-state changes that update counters must be atomic.
- Store enough event data to diagnose failures.

### Performance
- Appointment list endpoint should support pagination.
- Use indexes for business + scheduled_at, status + scheduled_at, and risk assessment lookup.
- Avoid recalculating risk repeatedly in a list loop; calculate once after relevant events and store latest assessment.
- Dashboard queries should be bounded by date range.

### Observability
- Log correlation IDs for request/task flow where feasible.
- Log task failures with appointment and business IDs, but not personal email contents.
- Track email provider outcomes.
- Add health endpoints for Django, PostgreSQL connection, Redis connection, and Celery worker status.

---

## 18. Testing Requirements

### Unit Tests
- Each rule triggers only under its intended condition.
- Mutually exclusive rules do not double count.
- Score clamps to 0–100.
- Correct risk tier and recommended action are returned.
- Rule reasons match triggered rules.
- Customer reliability adjustments work.

### Integration Tests
- Appointment creation creates an event and risk assessment.
- Confirmation updates status and appends event.
- Cancellation updates history counters correctly.
- Marking no-show updates counters and last-no-show timestamp atomically.
- Reminder scheduler avoids duplicate sends.
- A Celery retry does not send duplicate reminders.
- Action links expire correctly.
- Action link for one business cannot affect another business’s appointment.

### Tenant Isolation Tests
- User from Business A cannot fetch Business B’s appointment.
- User from Business A cannot create appointment for Business B customer.
- Dashboard only includes current business data.

### Example Risk Test Cases

| Scenario | Expected Direction |
|---|---|
| Reliable customer, confirmed appointment, regular cadence | Very low / low |
| Two previous no-shows, no confirmation within 24h | High |
| New customer, weekend booking, confirmed | Low / medium |
| One no-show within 30 days and opened reminder without confirming | Medium / high |
| High price but reliable confirmed customer | Low to medium; exposure must not dominate probability |

---

## 19. Suggested Django App Layout

```text
confirmly/
├── confirmlybe/
│   ├── settings/
│   ├── urls.py
│   └── celery.py
├── apps/
│   ├── businesses/
│   ├── customers/
│   ├── appointments/
│   ├── reminders/
│   ├── risk_engine/
│   └── dashboard/
├── templates/
├── docker-compose.yml
├── requirements.txt
└── README.md
```

### Suggested Responsibilities

- `businesses`: tenant model and ownership.
- `customers`: customer model, history, and customer APIs.
- `appointments`: lifecycle, APIs, events, public actions.
- `reminders`: Celery tasks, email integration, reminder logs.
- `risk_engine`: scoring service, rule catalog, assessments, tests.
- `dashboard`: aggregated metrics and dashboard APIs.

---

## 20. Suggested Implementation Order

### First 90 Minutes
1. Create Django project and apps.
2. Configure PostgreSQL or SQLite for fast local development.
3. Create Business, Customer, Appointment, AppointmentEvent models.
4. Add DRF serializers and CRUD endpoints.

### Next 90 Minutes
5. Add appointment status transitions.
6. Add customer history updates.
7. Add risk engine service and unit tests.
8. Store `RiskAssessment` on appointment creation/update.

### Next 90 Minutes
9. Add Celery, Redis, and Celery Beat.
10. Add idempotent reminder log.
11. Send a basic email with signed action links.

### Final 90 Minutes
12. Build confirmation/cancellation public pages or endpoints.
13. Build dashboard endpoint.
14. Add Docker Compose, seed data, and a demo flow.
15. Record a short demo:
    - Create appointment.
    - Show high-risk score and reasons.
    - Send reminder.
    - Confirm via signed link.
    - Show dashboard and updated risk.

---

## 21. Demo Script

1. Log in as a salon owner.
2. Create a customer with two prior no-shows.
3. Create a $200 appointment scheduled for tomorrow morning.
4. Show the risk result:
   - previous no-shows,
   - recent no-show,
   - unconfirmed within 24 hours,
   - high value revenue exposure.
5. Show the appointment on the high-risk dashboard.
6. Trigger/send reminder.
7. Open confirmation link.
8. Confirm appointment.
9. Show new lower risk score, updated timeline, and dashboard confirmation count.

---

## 22. Future Enhancements

- Per-business configurable rule weights.
- A/B testing of reminder copy and timing.
- SMS / WhatsApp reminders with consent handling.
- Calendar synchronization.
- Deposit / payment links for high-value appointments.
- Customer rescheduling flow.
- ML model trained only after enough clean outcome data is available.
- Explainability comparison between rule engine and ML model.
- Role-based permissions for receptionist, manager, and owner.
- Webhooks for email delivery/open/click events.
- Reporting exports.

---

## 23. Acceptance Criteria for MVP

The MVP is complete when:

1. A business user can create customers and appointments.
2. The system stores appointment events.
3. The system calculates and stores an explainable risk assessment.
4. The dashboard lists upcoming high-risk appointments and revenue at risk.
5. A scheduled job can identify reminders due for sending.
6. The unique reminder constraint prevents duplicate reminders.
7. A customer can confirm or cancel through a signed, expiring link.
8. Confirmation/cancellation updates status, event history, and risk assessment.
9. Business data remains isolated from other businesses.
10. Automated tests cover core risk rules, action tokens, lifecycle transitions, and idempotency.

---

## 24. Key Design Decisions

- **Why rules instead of ML?** Low initial data volume, clear explainability, fast iteration, and easy auditing.
- **Why event history?** Debugging, auditability, analytics, and a trustworthy timeline beyond a single mutable status field.
- **Why store risk assessments?** Stable audit trail, faster dashboard reads, historical comparison across rule versions.
- **Why unique reminder log?** Idempotency despite scheduler overlap and task retries.
- **Why signed links?** Customers can act without accounts while avoiding exposed raw identifiers.
- **Why multi-tenancy early?** The business model is SaaS; authorization and data isolation are foundational rather than a later patch.
