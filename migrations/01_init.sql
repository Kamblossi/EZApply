-- Enable useful PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1️⃣  Enumerations
CREATE TYPE user_role_enum          AS ENUM ('user','admin');
CREATE TYPE portal_enum             AS ENUM ('nhs_trac','nhs_jobs','workday','greenhouse','linkedin','indeed','custom');
CREATE TYPE job_status_enum         AS ENUM ('saved','applied','interviewing','rejected','offer','hired');
CREATE TYPE application_event_enum  AS ENUM ('application_submitted','resume_sent','phone_interview',
                                             'onsite_interview','follow_up','offer_received','rejection_received','other');
CREATE TYPE template_category_enum  AS ENUM ('cover_letter','response','ai_prompt','email','other');
CREATE TYPE notification_type_enum  AS ENUM ('FollowUpReminder','InterviewReminder','DeadlineAlert','NewJobMatch','Other');
CREATE TYPE proficiency_level_enum  AS ENUM ('Beginner','Intermediate','Advanced','Expert','Native');

-- 2️⃣  Core auth & profile tables
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          CITEXT UNIQUE NOT NULL,
    password_hash  TEXT   NOT NULL,
    role           user_role_enum NOT NULL DEFAULT 'user',
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    forename       TEXT,
    surname        TEXT,
    middle_names   TEXT,
    title          TEXT,
    ni_number      TEXT,
    available_date DATE,
    mobile_phone   TEXT,
    home_phone     TEXT,
    work_phone     TEXT,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city           TEXT,
    county         TEXT,
    country        TEXT,
    postcode       TEXT,
    employment_status_with_target_org TEXT,
    immigration_status TEXT,
    read_job_desc_ack          BOOLEAN DEFAULT FALSE,
    nvq_level3_healthcare_ack   BOOLEAN DEFAULT FALSE,
    privacy_notice_consent_ack  BOOLEAN DEFAULT FALSE,
    professional_registration_details TEXT,
    disclosure_relationship_org_members TEXT,
    disclosure_previous_dismissal TEXT,
    disclosure_criminal_convictions TEXT,
    disclosure_health TEXT,
    personal_statement          TEXT,
    person_specification_response TEXT,
    additional_information      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employment_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    employer        TEXT,
    position        TEXT,
    start_date      DATE,
    end_date        DATE,
    responsibilities TEXT,
    reason_for_leaving TEXT,
    salary_information TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE education_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    institution       TEXT,
    qualification_type TEXT,
    degree_diploma     TEXT,
    field_of_study     TEXT,
    start_date         DATE,
    end_date           DATE,
    grade_score        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reference_contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name        TEXT,
    relationship TEXT,
    email       TEXT,
    phone       TEXT,
    company     TEXT,
    position    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    file_name   TEXT,
    file_path   TEXT,
    document_type TEXT,
    mime_type   TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3️⃣  Job tracking & application flow
CREATE TABLE jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_job_id TEXT NOT NULL,
    portal      portal_enum NOT NULL,
    title       TEXT NOT NULL,
    company     TEXT,
    description TEXT,
    location    TEXT,
    application_link TEXT,
    status      job_status_enum DEFAULT 'saved',
    closing_date DATE,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, portal, external_job_id)
);

CREATE TABLE applications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    event       application_event_enum NOT NULL DEFAULT 'application_submitted',
    note        TEXT,
    event_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4️⃣  Optional & future-facing feature tables
CREATE TABLE job_board_credentials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_name      TEXT NOT NULL,
    api_key_encrypted  TEXT NOT NULL,
    last_synced_at     TIMESTAMPTZ
);

CREATE TABLE saved_job_listings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_id     TEXT NOT NULL,
    source_platform TEXT,
    title       TEXT,
    company     TEXT,
    location    TEXT,
    job_description_raw TEXT,
    job_url     TEXT,
    saved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    template_category template_category_enum NOT NULL,
    template_content TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, template_name)
);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id      UUID REFERENCES jobs(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    notification_type notification_type_enum NOT NULL,
    message     TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at      TIMESTAMPTZ,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE user_skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    skill_name  TEXT NOT NULL,
    proficiency_level proficiency_level_enum DEFAULT 'Beginner',
    category    TEXT,
    UNIQUE (user_profile_id, skill_name)
);

CREATE TABLE ai_usage_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ai_model_used    TEXT,
    tokens_consumed  INT,
    cost             NUMERIC(10,4),
    feature_used     TEXT
);

-- 5️⃣  Helpful indexes
CREATE INDEX idx_jobs_status        ON jobs(status);
CREATE INDEX idx_jobs_created_at    ON jobs(created_at);
CREATE INDEX idx_applications_job   ON applications(job_id);
CREATE INDEX idx_applications_date  ON applications(event_date);
