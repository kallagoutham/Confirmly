# Workflows

## Implemented: business signup

```mermaid
sequenceDiagram
    actor Owner
    participant UI as React Signup Form
    participant API as POST /api/businesses/signup/
    participant DB as Database

    Owner->>UI: Enter business and owner credentials
    UI->>API: Submit signup request
    API->>DB: Create Django user
    API->>DB: Create Business owned by user
    API-->>UI: 201 Created
    UI->>UI: Save credentials and set Basic auth
    UI-->>Owner: Show Daily Desk
```

## Implemented: authenticated staff data flow

```mermaid
sequenceDiagram
    actor Staff
    participant UI as React Daily Desk
    participant API as Django REST API
    participant Auth as DRF Auth/Permissions
    participant DB as Database

    Staff->>UI: Enter Django username/password
    UI->>UI: Store credentials and create Basic auth header
    UI->>API: GET /api/customers/ and /api/appointments/
    API->>Auth: Check authenticated user has business
    Auth-->>API: Allowed
    API->>DB: Query records for request.user.business
    DB-->>API: Tenant-scoped records
    API-->>UI: Paginated JSON
    UI-->>Staff: Render desk
```

## Implemented: reject signed-in users without a business

```mermaid
sequenceDiagram
    actor Owner
    participant UI as React app
    participant API as GET /api/businesses/me/

    Owner->>UI: Signs in with existing Django user
    UI->>API: Validate current profile
    API-->>UI: User profile with businesses array
    alt user owns at least one business
        UI-->>Owner: Show dashboard and profile sidebar
    else user owns no businesses
        UI->>UI: Clear saved credentials
        UI-->>Owner: Show sign-in form and error
    end
```

## Implemented: customer creation

```mermaid
sequenceDiagram
    actor Staff
    participant UI
    participant API
    participant Serializer as CustomerSerializer
    participant DB

    Staff->>UI: Submit customer form
    UI->>API: POST /api/customers/
    API->>Serializer: Validate name/email/phone
    Serializer->>DB: Check duplicate email in same business
    Serializer-->>API: Lowercased email
    API->>DB: Create customer using request.user.business
    DB-->>API: Customer
    API-->>UI: 201 Created
    UI->>API: Reload customers and appointments
```

## Implemented: appointment creation and timeline

```mermaid
sequenceDiagram
    actor Staff
    participant UI
    participant API
    participant Serializer as AppointmentSerializer
    participant DB

    Staff->>UI: Submit appointment form
    UI->>API: POST /api/appointments/
    API->>Serializer: Validate customer, time, duration, price
    Serializer->>DB: Create appointment with tenant business
    Serializer->>DB: Insert AppointmentEvent(created)
    DB-->>API: Appointment with customer_detail
    API-->>UI: 201 Created
    UI->>API: GET /api/appointments/{id}/timeline/
    API->>DB: Load events for tenant-scoped appointment
    API-->>UI: Event list
```

## Implemented: appointment update event

```mermaid
flowchart TD
    A[PATCH /api/appointments/:id/] --> B{Appointment belongs to user's business?}
    B -- No --> C[404 Not Found]
    B -- Yes --> D[Validate editable fields]
    D --> E{Any changed fields?}
    E -- No --> F[Save no event]
    E -- Yes --> G[Save appointment]
    G --> H[Create updated event with changed field names]
```

## Planned: lifecycle transition workflow

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> confirmed: staff/customer confirms
    pending --> cancelled: staff/customer cancels
    confirmed --> cancelled: staff/customer cancels
    confirmed --> completed: staff marks completed
    confirmed --> no_show: staff marks no-show
    pending --> no_show: staff marks no-show
    pending --> completed: staff marks completed

    cancelled --> [*]
    completed --> [*]
    no_show --> [*]
```

Implementation notes:

- Use explicit endpoints such as `POST /api/appointments/{id}/confirm/`.
- Wrap status update, event creation, and customer counter updates in one transaction.
- Make repeated transitions idempotent where appropriate, especially public customer actions.

## Planned: reminder workflow

```mermaid
sequenceDiagram
    participant Beat as Celery Beat
    participant Task as Reminder Task
    participant DB
    participant Email as Email Provider
    participant Events as AppointmentEvent

    Beat->>Task: Run every few minutes
    Task->>DB: Find pending/confirmed appointments near 24h or 2h window
    Task->>DB: Insert ReminderLog with unique appointment+type
    alt Insert succeeds
        Task->>Email: Send reminder email
        Email-->>Task: Provider message id
        Task->>DB: Save provider_message_id
        Task->>Events: Create reminder sent event
    else Duplicate reminder log exists
        Task-->>Task: Skip as already sent
    end
```

## Planned: signed public action link workflow

```mermaid
sequenceDiagram
    actor Customer
    participant Link as Signed Link
    participant PublicAPI as Public Endpoint
    participant DB
    participant Events

    Customer->>Link: Click confirm or cancel
    Link->>PublicAPI: GET/POST tokenized action URL
    PublicAPI->>PublicAPI: Verify signature, appointment id, action, expiry
    alt Token valid
        PublicAPI->>DB: Transition appointment idempotently
        PublicAPI->>Events: Create confirmed/cancelled event
        PublicAPI-->>Customer: Show success page
    else Invalid or expired
        PublicAPI-->>Customer: Show invalid/expired link page
    end
```

## Planned: risk scoring workflow

```mermaid
flowchart TD
    A[Appointment created or updated] --> B[Collect customer history and appointment inputs]
    B --> C[Run rule-based scorer]
    C --> D[Calculate score, level, reasons, recommendation]
    D --> E[Persist RiskAssessment]
    E --> F[Create risk_calculated event]
    F --> G[Expose latest risk in API and dashboard]
```
