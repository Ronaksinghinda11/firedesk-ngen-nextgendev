--
-- PostgreSQL database dump
--

\restrict dwUuvVCcDYXAbWeylGip5YIrThBQLXFtGLs6zbqQIFVs0wiI6QhpzoiyqfKyTg1

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_asset_status_history_new_health_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_asset_status_history_new_health_status AS ENUM (
    'HEALTHY',
    'NEEDS_ATTENTION',
    'NOT_WORKING',
    'INVENTORY',
    'OBSOLETE',
    'ABSOLUTE'
);


ALTER TYPE public.enum_asset_status_history_new_health_status OWNER TO admin;

--
-- Name: enum_assets_health_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_assets_health_status AS ENUM (
    'HEALTHY',
    'NEEDS_ATTENTION',
    'NOT_WORKING',
    'INVENTORY',
    'OBSOLETE',
    'ABSOLUTE'
);


ALTER TYPE public.enum_assets_health_status OWNER TO admin;

--
-- Name: enum_assets_maintenance_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_assets_maintenance_status AS ENUM (
    'UNDER_WARRANTY',
    'OUT_OF_WARRANTY',
    'UNDER_AMC',
    'OUT_OF_AMC',
    'IN_HOUSE'
);


ALTER TYPE public.enum_assets_maintenance_status OWNER TO admin;

--
-- Name: enum_assets_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_assets_status AS ENUM (
    'ACTIVE',
    'DEACTIVE'
);


ALTER TYPE public.enum_assets_status OWNER TO admin;

--
-- Name: enum_audit_logs_action; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_audit_logs_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'RESTORE',
    'ARCHIVE',
    'ASSIGN',
    'UNASSIGN',
    'APPROVE',
    'REJECT',
    'SUBMIT',
    'CANCEL',
    'COMPLETE',
    'STATUS_CHANGE',
    'BULK_UPDATE',
    'IMPORT'
);


ALTER TYPE public.enum_audit_logs_action OWNER TO admin;

--
-- Name: enum_audit_logs_entity_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_audit_logs_entity_type AS ENUM (
    'plant',
    'building',
    'floor',
    'wing',
    'asset',
    'ticket',
    'user',
    'technician',
    'manager',
    'organization',
    'role',
    'fire_safety_system',
    'maintenance_schedule',
    'service_submission',
    'form',
    'vendor',
    'category',
    'product',
    'notification',
    'industry',
    'condition',
    'scheduler',
    'incident',
    'incident_type',
    'incident_subtype',
    'capa',
    'question',
    'manufacturer',
    'monitoring_device'
);


ALTER TYPE public.enum_audit_logs_entity_type OWNER TO admin;

--
-- Name: enum_audit_logs_related_entity_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_audit_logs_related_entity_type AS ENUM (
    'plant',
    'building',
    'floor',
    'wing',
    'asset',
    'ticket',
    'user',
    'technician',
    'manager',
    'organization',
    'role',
    'fire_safety_system',
    'maintenance_schedule',
    'service_submission',
    'form',
    'vendor',
    'category',
    'product',
    'notification',
    'industry',
    'condition',
    'scheduler',
    'incident',
    'capa',
    'question',
    'manufacturer',
    'monitoring_device'
);


ALTER TYPE public.enum_audit_logs_related_entity_type OWNER TO admin;

--
-- Name: enum_categories_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_categories_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_categories_status OWNER TO admin;

--
-- Name: enum_conditions_severity_level; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_conditions_severity_level AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'INFO'
);


ALTER TYPE public.enum_conditions_severity_level OWNER TO admin;

--
-- Name: enum_forms_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_forms_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_forms_status OWNER TO admin;

--
-- Name: enum_incident_capa_steps_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_incident_capa_steps_status AS ENUM (
    'Not Started',
    'In Progress',
    'Pending Approval',
    'Approved',
    'Rejected'
);


ALTER TYPE public.enum_incident_capa_steps_status OWNER TO admin;

--
-- Name: enum_incidents_severity; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_incidents_severity AS ENUM (
    'Low',
    'Medium',
    'High',
    'Critical'
);


ALTER TYPE public.enum_incidents_severity OWNER TO admin;

--
-- Name: enum_incidents_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_incidents_status AS ENUM (
    'Open',
    'Team Assigned',
    'In Progress',
    'Pending Approval',
    'Closed',
    'Rejected'
);


ALTER TYPE public.enum_incidents_status OWNER TO admin;

--
-- Name: enum_industries_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_industries_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_industries_status OWNER TO admin;

--
-- Name: enum_managers_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_managers_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_managers_status OWNER TO admin;

--
-- Name: enum_notifications_category; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_notifications_category AS ENUM (
    'ALERT',
    'WARNING',
    'INFO',
    'SUCCESS',
    'REMAINDER'
);


ALTER TYPE public.enum_notifications_category OWNER TO admin;

--
-- Name: enum_notifications_priority; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_notifications_priority AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
);


ALTER TYPE public.enum_notifications_priority OWNER TO admin;

--
-- Name: enum_notifications_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_notifications_type AS ENUM (
    'ASSET_ALERT',
    'SERVICE_DUE',
    'HP_TEST_DUE',
    'TICKET_ASSIGNED',
    'TICKET_UPDATED',
    'INCIDENT_CREATED',
    'INCIDENT_ASSIGNED',
    'CAPA_INITIATED',
    'CAPA_STEP_ACTION',
    'AUDIT_SCHEDULED',
    'AUDIT_REMINDER',
    'TRAINING_SCHEDULED',
    'SYSTEM_ALERT',
    'GENERAL'
);


ALTER TYPE public.enum_notifications_type OWNER TO admin;

--
-- Name: enum_plants_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_plants_status AS ENUM (
    'Active',
    'Inactive',
    'Draft'
);


ALTER TYPE public.enum_plants_status OWNER TO admin;

--
-- Name: enum_products_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_products_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_products_status OWNER TO admin;

--
-- Name: enum_products_test_frequency; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_products_test_frequency AS ENUM (
    'One Year',
    'Two Years',
    'Three Years',
    'Five Years',
    'Ten Years'
);


ALTER TYPE public.enum_products_test_frequency OWNER TO admin;

--
-- Name: enum_questions_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_questions_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_questions_status OWNER TO admin;

--
-- Name: enum_service_technicians_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_service_technicians_status AS ENUM (
    'assigned',
    'started',
    'completed',
    'declined'
);


ALTER TYPE public.enum_service_technicians_status OWNER TO admin;

--
-- Name: enum_states_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_states_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_states_status OWNER TO admin;

--
-- Name: enum_technicians_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_technicians_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_technicians_status OWNER TO admin;

--
-- Name: enum_ticket_responses_response_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_ticket_responses_response_type AS ENUM (
    'submission',
    'rejection',
    'comment'
);


ALTER TYPE public.enum_ticket_responses_response_type OWNER TO admin;

--
-- Name: enum_tickets_completed_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_tickets_completed_status AS ENUM (
    'Pending',
    'In Progress',
    'Rejected',
    'Waiting for approval',
    'Completed'
);


ALTER TYPE public.enum_tickets_completed_status OWNER TO admin;

--
-- Name: enum_tickets_ticket_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_tickets_ticket_type AS ENUM (
    'General',
    'Asset Related'
);


ALTER TYPE public.enum_tickets_ticket_type OWNER TO admin;

--
-- Name: enum_users_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_users_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_users_status OWNER TO admin;

--
-- Name: enum_vendors_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.enum_vendors_status AS ENUM (
    'Active',
    'Inactive'
);


ALTER TYPE public.enum_vendors_status OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: asset_active_conditions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_active_conditions (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    condition_id uuid NOT NULL,
    question_id uuid NOT NULL,
    severity_level character varying(20),
    priority_score integer DEFAULT 0,
    detected_at timestamp with time zone,
    last_submission_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_active_conditions OWNER TO admin;

--
-- Name: COLUMN asset_active_conditions.severity_level; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.asset_active_conditions.severity_level IS 'CRITICAL, HIGH, MEDIUM, LOW, INFO';


--
-- Name: COLUMN asset_active_conditions.detected_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.asset_active_conditions.detected_at IS 'When this condition was first detected (answer timestamp)';


--
-- Name: COLUMN asset_active_conditions.last_submission_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.asset_active_conditions.last_submission_id IS 'Last service submission that confirmed this condition';


--
-- Name: asset_documents; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_documents (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    document_url text NOT NULL,
    description character varying(500),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_documents OWNER TO admin;

--
-- Name: asset_floorplan_position; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_floorplan_position (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    floor_id uuid NOT NULL,
    coordinate_x double precision NOT NULL,
    coordinate_y double precision NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_floorplan_position OWNER TO admin;

--
-- Name: asset_health_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_health_history (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    submission_id uuid,
    submitted_at timestamp with time zone NOT NULL,
    critical_count integer,
    high_count integer,
    medium_count integer,
    low_count integer,
    total_priority_score integer,
    health_status character varying(50),
    created_at timestamp with time zone
);


ALTER TABLE public.asset_health_history OWNER TO admin;

--
-- Name: COLUMN asset_health_history.health_status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.asset_health_history.health_status IS 'HEALTHY, NEEDS_ATTENTION, NOT_WORKING';


--
-- Name: asset_location_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_location_history (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    recorded_by uuid,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_location_history OWNER TO admin;

--
-- Name: asset_metadata; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_metadata (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    tag text,
    serial_number character varying(255),
    model character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_metadata OWNER TO admin;

--
-- Name: asset_spec_values; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_spec_values (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    spec_definition_id uuid NOT NULL,
    spec_value text,
    unit character varying(100),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_spec_values OWNER TO admin;

--
-- Name: asset_status_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_status_history (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    old_health_statuses public.enum_asset_status_history_new_health_status[],
    new_health_status public.enum_asset_status_history_new_health_status,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone,
    source_type character varying(100),
    source_id uuid,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_status_history OWNER TO admin;

--
-- Name: asset_testing_schedule; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.asset_testing_schedule (
    id uuid NOT NULL,
    asset_id uuid NOT NULL,
    last_hp_test_date jsonb,
    next_hp_test_due_date date,
    test_frequency_months integer,
    last_refill_date jsonb,
    next_refill_date date,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_testing_schedule OWNER TO admin;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.assets (
    id uuid NOT NULL,
    asset_code character varying(100) NOT NULL,
    plant_id uuid NOT NULL,
    building_id uuid,
    floor_id uuid,
    wing_id uuid,
    location character varying(255),
    category_id uuid NOT NULL,
    product_id uuid NOT NULL,
    manufacturer_id uuid,
    created_by uuid NOT NULL,
    type character varying(100) NOT NULL,
    sub_type character varying(100),
    manufacturing_date date NOT NULL,
    install_date date NOT NULL,
    warranty_end_date date,
    lifespan_years integer,
    latitude numeric(10,8),
    longitude numeric(11,8),
    status public.enum_assets_status DEFAULT 'ACTIVE'::public.enum_assets_status NOT NULL,
    health_status public.enum_assets_health_status DEFAULT 'HEALTHY'::public.enum_assets_health_status NOT NULL,
    maintenance_status public.enum_assets_maintenance_status DEFAULT 'IN_HOUSE'::public.enum_assets_maintenance_status NOT NULL,
    conditions jsonb,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.assets OWNER TO admin;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    entity_type public.enum_audit_logs_entity_type NOT NULL,
    entity_id uuid,
    entity_name character varying(255),
    action public.enum_audit_logs_action NOT NULL,
    action_description text,
    user_id uuid,
    user_name character varying(255),
    user_type character varying(50),
    changes jsonb,
    field_name character varying(100),
    old_value text,
    new_value text,
    old_value_display text,
    new_value_display text,
    context_id uuid,
    source character varying(30) DEFAULT 'ui'::character varying,
    ip_address inet,
    user_agent text,
    request_id character varying(100),
    metadata jsonb,
    related_entity_type public.enum_audit_logs_related_entity_type,
    related_entity_id uuid,
    related_entity_name character varying(255),
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO admin;

--
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity being audited';


--
-- Name: COLUMN audit_logs.entity_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID of the entity (can be null if entity is deleted)';


--
-- Name: COLUMN audit_logs.entity_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.entity_name IS 'Human-readable entity name/code for UI display';


--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.action IS 'Action performed';


--
-- Name: COLUMN audit_logs.action_description; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.action_description IS 'Human-readable description of the action';


--
-- Name: COLUMN audit_logs.user_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.user_id IS 'Who performed the action';


--
-- Name: COLUMN audit_logs.user_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.user_name IS 'Snapshot of user name at time of action';


--
-- Name: COLUMN audit_logs.user_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.user_type IS 'admin/manager/technician/system';


--
-- Name: COLUMN audit_logs.changes; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.changes IS 'Full change set: { field: { old, new, old_display, new_display } }';


--
-- Name: COLUMN audit_logs.field_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.field_name IS 'Name of the field that changed (for simple cases)';


--
-- Name: COLUMN audit_logs.old_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.old_value IS 'Previous value (as string)';


--
-- Name: COLUMN audit_logs.new_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.new_value IS 'New value (as string)';


--
-- Name: COLUMN audit_logs.old_value_display; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.old_value_display IS 'Human-readable old value';


--
-- Name: COLUMN audit_logs.new_value_display; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.new_value_display IS 'Human-readable new value';


--
-- Name: COLUMN audit_logs.context_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.context_id IS 'Groups related changes (e.g., single save action with multiple field updates)';


--
-- Name: COLUMN audit_logs.source; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.source IS 'ui | api | scheduler | system | import';


--
-- Name: COLUMN audit_logs.ip_address; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP address of the user';


--
-- Name: COLUMN audit_logs.user_agent; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.user_agent IS 'Browser/app user agent';


--
-- Name: COLUMN audit_logs.request_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.request_id IS 'Request ID for tracing';


--
-- Name: COLUMN audit_logs.metadata; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.metadata IS 'Any additional context: { reason, notes, etc. }';


--
-- Name: COLUMN audit_logs.related_entity_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.related_entity_type IS 'E.g., when assigning technician to asset';


--
-- Name: COLUMN audit_logs.related_entity_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.related_entity_id IS 'ID of the related entity';


--
-- Name: COLUMN audit_logs.related_entity_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.related_entity_name IS 'Name of the related entity';


--
-- Name: COLUMN audit_logs.created_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.audit_logs.created_at IS 'Timestamp of the action (partition key)';


--
-- Name: buildings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.buildings (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    building_name character varying(255) NOT NULL,
    building_height numeric(8,2),
    total_area numeric(12,2),
    total_built_up_area numeric(12,2),
    building_type character varying(50),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.buildings OWNER TO admin;

--
-- Name: capa_step_definitions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.capa_step_definitions (
    id uuid NOT NULL,
    step_number integer NOT NULL,
    step_name character varying(255) NOT NULL,
    step_code character varying(50),
    step_description text,
    is_document_required boolean DEFAULT false,
    is_approval_required boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.capa_step_definitions OWNER TO admin;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.categories (
    id uuid NOT NULL,
    category_name character varying(255) NOT NULL,
    category_code character varying(100) NOT NULL,
    test_frequency_required boolean DEFAULT false,
    status public.enum_categories_status DEFAULT 'Active'::public.enum_categories_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.categories OWNER TO admin;

--
-- Name: category_files; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.category_files (
    id uuid NOT NULL,
    category_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    mime_type character varying(100),
    file_size integer,
    storage_path character varying(500) NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.category_files OWNER TO admin;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.comments (
    id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    comment_text text NOT NULL,
    raw_text text NOT NULL,
    comment_format character varying(20) DEFAULT 'plain'::character varying,
    created_by uuid NOT NULL,
    created_by_name character varying(255),
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    edited_by uuid,
    edit_count integer DEFAULT 0,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.comments OWNER TO admin;

--
-- Name: compliance_records; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.compliance_records (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    fire_noc_number character varying(100),
    fire_noc_expiry_date date,
    insurance_policy_number character varying(100),
    insurance_name character varying(255),
    num_fire_extinguishers integer DEFAULT 0,
    num_hydrant_points integer DEFAULT 0,
    num_sprinklers integer DEFAULT 0,
    num_safe_assembly_areas integer DEFAULT 0,
    documents_data jsonb,
    documents_json jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.compliance_records OWNER TO admin;

--
-- Name: conditions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.conditions (
    id uuid NOT NULL,
    condition_code character varying(100) NOT NULL,
    condition_name character varying(255) NOT NULL,
    severity_level public.enum_conditions_severity_level DEFAULT 'MEDIUM'::public.enum_conditions_severity_level,
    priority_score integer,
    health_impact character varying(500),
    recommended_action text,
    requires_immediate_action boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.conditions OWNER TO admin;

--
-- Name: COLUMN conditions.priority_score; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.conditions.priority_score IS '0-100 priority score';


--
-- Name: diesel_generators; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.diesel_generators (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    available boolean DEFAULT false,
    quantity integer DEFAULT 1
);


ALTER TABLE public.diesel_generators OWNER TO admin;

--
-- Name: entrances; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.entrances (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    entrance_name character varying(100) NOT NULL,
    entrance_type character varying(50),
    width_meters numeric(8,2),
    location_description text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entrances OWNER TO admin;

--
-- Name: fire_safety_systems; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.fire_safety_systems (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    prime_over_tank numeric(12,2),
    terrace_tank numeric(12,2),
    diesel_tank_1 numeric(10,2),
    diesel_tank_2 numeric(10,2),
    header_pressure_value numeric(8,2),
    system_commission_date date,
    diesel_pump_count integer DEFAULT 0,
    electric_pump_count integer DEFAULT 0,
    jockey_pump_count integer DEFAULT 0,
    fire_extinguisher_count integer DEFAULT 0,
    hydrant_point_count integer DEFAULT 0,
    sprinkler_count integer DEFAULT 0,
    safe_assembly_area_count integer DEFAULT 0,
    amc_vendor_id uuid,
    amc_start_date date,
    amc_end_date date,
    documents_json jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.fire_safety_systems OWNER TO admin;

--
-- Name: floors; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.floors (
    id uuid NOT NULL,
    building_id uuid NOT NULL,
    floor_name character varying(100) NOT NULL,
    usage_type character varying(100),
    floor_area numeric(12,2),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.floors OWNER TO admin;

--
-- Name: form_questions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.form_questions (
    id uuid NOT NULL,
    form_id uuid NOT NULL,
    question_id uuid NOT NULL,
    section_id uuid,
    question_order integer NOT NULL,
    is_mandatory_override boolean,
    created_at timestamp with time zone
);


ALTER TABLE public.form_questions OWNER TO admin;

--
-- Name: COLUMN form_questions.is_mandatory_override; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.form_questions.is_mandatory_override IS 'Override the question default mandatory setting';


--
-- Name: form_sections; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.form_sections (
    id uuid NOT NULL,
    form_id uuid NOT NULL,
    section_name character varying(255) NOT NULL,
    section_order integer NOT NULL,
    description text,
    is_mandatory boolean DEFAULT false,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.form_sections OWNER TO admin;

--
-- Name: forms; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.forms (
    id uuid NOT NULL,
    form_code character varying(100) NOT NULL,
    service_name character varying(255) NOT NULL,
    service_type character varying(50),
    category_id uuid,
    product_id uuid,
    frequency_id uuid,
    plant_id uuid,
    status public.enum_forms_status DEFAULT 'Active'::public.enum_forms_status,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.forms OWNER TO admin;

--
-- Name: COLUMN forms.service_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.forms.service_type IS 'inspection, testing, maintenance';


--
-- Name: COLUMN forms.category_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.forms.category_id IS 'Optional: Primary category for this form';


--
-- Name: COLUMN forms.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.forms.product_id IS 'Optional: Primary product for this form';


--
-- Name: COLUMN forms.frequency_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.forms.frequency_id IS 'Frequency for this form - unique per category+product+frequency';


--
-- Name: COLUMN forms.plant_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.forms.plant_id IS 'Optional: Plant-specific form';


--
-- Name: incident_activities; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_activities (
    id uuid NOT NULL,
    incident_id uuid NOT NULL,
    action character varying(255) NOT NULL,
    description text,
    performed_by uuid NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.incident_activities OWNER TO admin;

--
-- Name: incident_assignments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_assignments (
    id uuid NOT NULL,
    incident_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(100),
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.incident_assignments OWNER TO admin;

--
-- Name: incident_capa_steps; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_capa_steps (
    id uuid NOT NULL,
    incident_id uuid NOT NULL,
    capa_step_definition_id uuid NOT NULL,
    step_number integer NOT NULL,
    step_name character varying(255),
    step_description text,
    is_document_required boolean DEFAULT false,
    is_approval_required boolean DEFAULT true,
    step_response text,
    documents_data jsonb,
    status public.enum_incident_capa_steps_status DEFAULT 'Not Started'::public.enum_incident_capa_steps_status,
    submitted_by uuid,
    submitted_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.incident_capa_steps OWNER TO admin;

--
-- Name: incident_subtypes; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_subtypes (
    id uuid NOT NULL,
    incident_type_id uuid NOT NULL,
    subtype_name character varying(255) NOT NULL,
    subtype_code character varying(50),
    description text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.incident_subtypes OWNER TO admin;

--
-- Name: incident_types; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_types (
    id uuid NOT NULL,
    type_name character varying(255) NOT NULL,
    type_code character varying(50),
    description text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.incident_types OWNER TO admin;

--
-- Name: incidents; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incidents (
    id uuid NOT NULL,
    incident_number character varying(50) NOT NULL,
    incident_subtype_id uuid NOT NULL,
    plant_id uuid NOT NULL,
    building_id uuid,
    floor_id uuid,
    incident_date timestamp with time zone NOT NULL,
    description text NOT NULL,
    impact text,
    severity public.enum_incidents_severity DEFAULT 'Medium'::public.enum_incidents_severity NOT NULL,
    status public.enum_incidents_status DEFAULT 'Open'::public.enum_incidents_status,
    current_capa_step integer DEFAULT 0,
    team_creator_id uuid,
    team_leader_id uuid,
    documents_data jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.incidents OWNER TO admin;

--
-- Name: industries; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.industries (
    id uuid NOT NULL,
    industry_name character varying(255) NOT NULL,
    industry_code character varying(100) NOT NULL,
    status public.enum_industries_status DEFAULT 'Active'::public.enum_industries_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.industries OWNER TO admin;

--
-- Name: inspection_frequencies; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inspection_frequencies (
    id uuid NOT NULL,
    frequency_code character varying(50) NOT NULL,
    frequency_name character varying(100) NOT NULL,
    interval_days integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.inspection_frequencies OWNER TO admin;

--
-- Name: iot_device_asset_map; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.iot_device_asset_map (
    id uuid NOT NULL,
    device_id character varying(100) NOT NULL,
    asset_code character varying(50) NOT NULL,
    category_id uuid NOT NULL,
    plant_id uuid NOT NULL,
    data_key character varying(50),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.iot_device_asset_map OWNER TO admin;

--
-- Name: COLUMN iot_device_asset_map.device_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_device_asset_map.device_id IS 'IoT device identifier (matches device_id in iot_live_data_* tables)';


--
-- Name: COLUMN iot_device_asset_map.asset_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_device_asset_map.asset_code IS 'Reference to assets.assetCode (unique identifier)';


--
-- Name: COLUMN iot_device_asset_map.category_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_device_asset_map.category_id IS 'Category ID (Pump Room, Fire Extinguisher, Fire Hydrant)';


--
-- Name: COLUMN iot_device_asset_map.plant_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_device_asset_map.plant_id IS 'Plant ID where device is installed';


--
-- Name: COLUMN iot_device_asset_map.data_key; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_device_asset_map.data_key IS 'Specific data field for this asset (e.g., AS1, AS2, AS3 for pumps)';


--
-- Name: iot_live_data_fe; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.iot_live_data_fe (
    id uuid NOT NULL,
    device_id character varying(100) NOT NULL,
    device_data jsonb NOT NULL,
    history jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.iot_live_data_fe OWNER TO admin;

--
-- Name: COLUMN iot_live_data_fe.device_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_fe.device_id IS 'Unique device identifier from AWS IoT/Lambda';


--
-- Name: COLUMN iot_live_data_fe.device_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_fe.device_data IS 'Current IoT sensor data (PRESSURE, TEMPERATURE, STATUS, LOCATION)';


--
-- Name: COLUMN iot_live_data_fe.history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_fe.history IS 'Historical trends for each sensor';


--
-- Name: iot_live_data_fh; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.iot_live_data_fh (
    id uuid NOT NULL,
    device_id character varying(100) NOT NULL,
    device_data jsonb NOT NULL,
    history jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.iot_live_data_fh OWNER TO admin;

--
-- Name: COLUMN iot_live_data_fh.device_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_fh.device_id IS 'Unique device identifier from AWS IoT/Lambda';


--
-- Name: COLUMN iot_live_data_fh.device_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_fh.device_data IS 'Current IoT sensor data (PRESSURE, FLOW_RATE, STATUS, LOCATION)';


--
-- Name: COLUMN iot_live_data_fh.history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_fh.history IS 'Historical trends for each sensor';


--
-- Name: iot_live_data_pr; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.iot_live_data_pr (
    id uuid NOT NULL,
    device_id character varying(100) NOT NULL,
    device_data jsonb NOT NULL,
    history jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.iot_live_data_pr OWNER TO admin;

--
-- Name: COLUMN iot_live_data_pr.device_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_pr.device_id IS 'Unique device identifier from AWS IoT/Lambda';


--
-- Name: COLUMN iot_live_data_pr.device_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_pr.device_data IS 'Current IoT sensor data (AS1-3, PS1-3, TS1-3, WLS, DLS, PLS, BAT, etc.)';


--
-- Name: COLUMN iot_live_data_pr.history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.iot_live_data_pr.history IS 'Historical trends for each sensor (last 100 values)';


--
-- Name: layouts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.layouts (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    building_id uuid,
    floor_id uuid,
    wing_id uuid,
    svg_picture text,
    svg_binary bytea,
    file_name character varying(255),
    file_size_bytes bigint,
    mime_type character varying(100) DEFAULT 'image/svg+xml'::character varying,
    health_status character varying(50),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.layouts OWNER TO admin;

--
-- Name: lifts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lifts (
    id uuid NOT NULL,
    building_id uuid NOT NULL,
    available boolean DEFAULT false,
    quantity integer DEFAULT 1,
    type character varying(50),
    capacity_kg numeric(10,2),
    fire_rating_minutes integer,
    has_emergency_phone boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.lifts OWNER TO admin;

--
-- Name: maintenance_schedulers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.maintenance_schedulers (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    category_id uuid NOT NULL,
    schedule_start_date date NOT NULL,
    schedule_end_date date NOT NULL,
    inspection_frequency character varying(255),
    testing_frequency character varying(255),
    maintenance_frequency character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.maintenance_schedulers OWNER TO admin;

--
-- Name: managers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.managers (
    id uuid NOT NULL,
    manager_code character varying(50),
    user_id uuid NOT NULL,
    created_by uuid,
    status public.enum_managers_status DEFAULT 'Active'::public.enum_managers_status,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.managers OWNER TO admin;

--
-- Name: manufacturers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.manufacturers (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.manufacturers OWNER TO admin;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    type public.enum_notifications_type NOT NULL,
    category public.enum_notifications_category DEFAULT 'INFO'::public.enum_notifications_category,
    priority public.enum_notifications_priority DEFAULT 'MEDIUM'::public.enum_notifications_priority,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    related_entity_type character varying(50),
    related_entity_id uuid,
    user_id uuid NOT NULL,
    action_url character varying(500),
    is_actionable boolean DEFAULT false,
    action_taken boolean DEFAULT false,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    sent_at timestamp with time zone,
    expires_at timestamp with time zone,
    triggered_by uuid,
    notification_source character varying(50) DEFAULT 'SYSTEM'::character varying,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO admin;

--
-- Name: organization; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.organization (
    id uuid NOT NULL,
    organization_code character varying(50) NOT NULL,
    organization_name character varying(255) NOT NULL,
    address text NOT NULL,
    gst_number character varying(15),
    country character varying(50),
    state character varying(50),
    city character varying(50),
    created_by uuid,
    no_of_plants integer DEFAULT 3,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.organization OWNER TO admin;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    entity_name character varying(100) NOT NULL,
    action_name character varying(100) NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.permissions OWNER TO admin;

--
-- Name: plant_categories; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.plant_categories (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.plant_categories OWNER TO admin;

--
-- Name: plant_managers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.plant_managers (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    manager_id uuid NOT NULL,
    assigned_at timestamp with time zone
);


ALTER TABLE public.plant_managers OWNER TO admin;

--
-- Name: plants; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.plants (
    id uuid NOT NULL,
    plant_code character varying(50) NOT NULL,
    plant_name character varying(255) NOT NULL,
    address_line1 text NOT NULL,
    city character varying(30) NOT NULL,
    state character varying(35) NOT NULL,
    country character varying(50) DEFAULT 'India'::character varying NOT NULL,
    postal_code character varying(6),
    gst_number character varying(25),
    industry_id uuid,
    organization_id uuid,
    main_buildings_count integer DEFAULT 0,
    sub_buildings_count integer DEFAULT 0,
    total_plant_area numeric(12,2),
    total_built_up_area numeric(12,2),
    status public.enum_plants_status DEFAULT 'Active'::public.enum_plants_status,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.plants OWNER TO admin;

--
-- Name: products; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    category_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    product_code character varying(100) NOT NULL,
    test_frequency public.enum_products_test_frequency,
    variants jsonb DEFAULT '[]'::jsonb,
    image text,
    status public.enum_products_status DEFAULT 'Active'::public.enum_products_status NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.products OWNER TO admin;

--
-- Name: question_categories; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.question_categories (
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.question_categories OWNER TO admin;

--
-- Name: question_conditions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.question_conditions (
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    condition_id uuid NOT NULL,
    condition_source character varying(100),
    display_order integer,
    is_active boolean DEFAULT true,
    data_source_config jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.question_conditions OWNER TO admin;

--
-- Name: COLUMN question_conditions.condition_source; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.question_conditions.condition_source IS 'manual, system, calculated';


--
-- Name: COLUMN question_conditions.data_source_config; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.question_conditions.data_source_config IS 'Configuration for dynamic condition loading';


--
-- Name: question_frequencies; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.question_frequencies (
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    frequency_id uuid NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.question_frequencies OWNER TO admin;

--
-- Name: question_products; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.question_products (
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.question_products OWNER TO admin;

--
-- Name: questions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.questions (
    id uuid NOT NULL,
    question_text text NOT NULL,
    question_code character varying(100) NOT NULL,
    answer_type character varying(50) NOT NULL,
    question_type character varying(50),
    is_mandatory boolean DEFAULT false,
    requires_photo boolean DEFAULT false,
    requires_notes boolean DEFAULT false,
    help_text text,
    display_condition jsonb,
    standards text,
    status public.enum_questions_status DEFAULT 'Active'::public.enum_questions_status,
    created_by uuid NOT NULL,
    plant_id uuid,
    service_type character varying(50),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.questions OWNER TO admin;

--
-- Name: COLUMN questions.answer_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.questions.answer_type IS 'text, number, boolean, date, select, multi_select, condition, photo, signature';


--
-- Name: COLUMN questions.question_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.questions.question_type IS 'inspection, testing, maintenance, general';


--
-- Name: COLUMN questions.standards; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.questions.standards IS 'Standards/regulations this question relates to';


--
-- Name: COLUMN questions.plant_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.questions.plant_id IS 'Plant this question belongs to (for grouping in UI)';


--
-- Name: COLUMN questions.service_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.questions.service_type IS 'inspection, testing, maintenance';


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.refresh_tokens OWNER TO admin;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.role_permissions (
    id uuid NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.role_permissions OWNER TO admin;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(500),
    is_default boolean DEFAULT false,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.roles OWNER TO admin;

--
-- Name: service_answers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.service_answers (
    id uuid NOT NULL,
    submission_id uuid NOT NULL,
    question_id uuid NOT NULL,
    text_value text,
    numeric_value numeric,
    boolean_value boolean,
    date_value date,
    json_value jsonb,
    selected_condition_id uuid,
    condition_code character varying(50),
    condition_name character varying(255),
    severity_level character varying(20),
    priority_score integer,
    health_impact character varying(255),
    compliance_status character varying(20) DEFAULT 'COMPLIANT'::character varying NOT NULL,
    non_compliance_condition_id uuid,
    photo_urls jsonb,
    signature_url character varying(500),
    notes text,
    answered_by uuid NOT NULL,
    answered_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.service_answers OWNER TO admin;

--
-- Name: COLUMN service_answers.text_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.text_value IS 'For text, textarea answers';


--
-- Name: COLUMN service_answers.numeric_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.numeric_value IS 'For number inputs';


--
-- Name: COLUMN service_answers.boolean_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.boolean_value IS 'For yes/no, checkboxes';


--
-- Name: COLUMN service_answers.date_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.date_value IS 'For date inputs';


--
-- Name: COLUMN service_answers.json_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.json_value IS 'For multi-select, complex answers';


--
-- Name: COLUMN service_answers.selected_condition_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.selected_condition_id IS 'Selected condition from dropdown';


--
-- Name: COLUMN service_answers.condition_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.condition_code IS 'Snapshot: condition code at time of answer';


--
-- Name: COLUMN service_answers.condition_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.condition_name IS 'Snapshot: condition name';


--
-- Name: COLUMN service_answers.severity_level; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.severity_level IS 'Snapshot: CRITICAL, HIGH, MEDIUM, LOW';


--
-- Name: COLUMN service_answers.priority_score; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.priority_score IS 'Snapshot: 0-100';


--
-- Name: COLUMN service_answers.health_impact; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.health_impact IS 'Snapshot: health impact description';


--
-- Name: COLUMN service_answers.compliance_status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.compliance_status IS 'COMPLIANT (YES), NON_COMPLIANT (NO), or NA';


--
-- Name: COLUMN service_answers.non_compliance_condition_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.non_compliance_condition_id IS 'Condition applied when answer is NON_COMPLIANT';


--
-- Name: COLUMN service_answers.photo_urls; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.photo_urls IS 'Array of photo URLs: ["url1", "url2"]';


--
-- Name: COLUMN service_answers.signature_url; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.signature_url IS 'Digital signature if required';


--
-- Name: COLUMN service_answers.notes; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_answers.notes IS 'Technician notes/remarks';


--
-- Name: service_submissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.service_submissions (
    id uuid NOT NULL,
    submission_number character varying(100),
    asset_id uuid NOT NULL,
    plant_id uuid NOT NULL,
    form_id uuid NOT NULL,
    schedule_id uuid,
    frequency_id uuid,
    technician_id uuid,
    submitted_by uuid,
    manager_id uuid,
    frequency character varying(50),
    inspection_type character varying(50),
    scheduled_date date,
    status character varying(50),
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    qr_verified boolean DEFAULT false,
    qr_verified_at timestamp with time zone,
    override_requested boolean DEFAULT false,
    override_requested_at timestamp with time zone,
    override_reason text,
    override_status character varying(50),
    override_approved_by uuid,
    override_approved_at timestamp with time zone,
    approval_status character varying(50),
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_remarks text,
    cancelled_reason text,
    cancelled_at timestamp with time zone,
    critical_count integer DEFAULT 0,
    high_count integer DEFAULT 0,
    medium_count integer DEFAULT 0,
    low_count integer DEFAULT 0,
    total_priority_score integer DEFAULT 0,
    calculated_health_status character varying(50),
    calculated_priority_score integer,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.service_submissions OWNER TO admin;

--
-- Name: COLUMN service_submissions.technician_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.technician_id IS 'Assigned later by manager or auto-assignment scheduler';


--
-- Name: COLUMN service_submissions.frequency; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.frequency IS 'Daily, Weekly, Monthly, etc.';


--
-- Name: COLUMN service_submissions.inspection_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.inspection_type IS 'Inspection, Testing, Maintenance';


--
-- Name: COLUMN service_submissions.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.status IS 'draft, in_progress, submitted, approved, rejected, cancelled';


--
-- Name: COLUMN service_submissions.override_status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.override_status IS 'PENDING, approved, rejected';


--
-- Name: COLUMN service_submissions.approval_status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.approval_status IS 'PENDING, approved, rejected';


--
-- Name: COLUMN service_submissions.critical_count; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.critical_count IS 'Count of CRITICAL severity answers';


--
-- Name: COLUMN service_submissions.high_count; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.high_count IS 'Count of HIGH severity answers';


--
-- Name: COLUMN service_submissions.medium_count; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.medium_count IS 'Count of MEDIUM severity answers';


--
-- Name: COLUMN service_submissions.low_count; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.low_count IS 'Count of LOW severity answers';


--
-- Name: COLUMN service_submissions.total_priority_score; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.total_priority_score IS 'Sum of all priority scores';


--
-- Name: COLUMN service_submissions.calculated_health_status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.calculated_health_status IS 'HEALTHY, NEEDS_ATTENTION, NOT_WORKING';


--
-- Name: COLUMN service_submissions.calculated_priority_score; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.calculated_priority_score IS 'Overall priority 0-100';


--
-- Name: COLUMN service_submissions.created_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.service_submissions.created_by IS 'NULL for system-generated services (scheduler), set for manual submissions';


--
-- Name: service_technicians; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.service_technicians (
    id uuid NOT NULL,
    service_id uuid NOT NULL,
    technician_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone NOT NULL,
    status public.enum_service_technicians_status DEFAULT 'assigned'::public.enum_service_technicians_status NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.service_technicians OWNER TO admin;

--
-- Name: spec_definitions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.spec_definitions (
    id uuid NOT NULL,
    category_id uuid NOT NULL,
    spec_name character varying(255) NOT NULL,
    spec_label character varying(255),
    spec_type character varying(50) NOT NULL,
    spec_unit jsonb,
    is_required boolean DEFAULT false NOT NULL,
    display_order integer,
    select_options jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.spec_definitions OWNER TO admin;

--
-- Name: staircases; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.staircases (
    id uuid NOT NULL,
    building_id uuid NOT NULL,
    available boolean DEFAULT false,
    quantity integer DEFAULT 1,
    type character varying(50),
    has_pressurization boolean DEFAULT false,
    width_meters numeric(8,2),
    fire_rating_minutes integer,
    has_emergency_lighting boolean DEFAULT false,
    location_description text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.staircases OWNER TO admin;

--
-- Name: technician_categories; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.technician_categories (
    id uuid NOT NULL,
    technician_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.technician_categories OWNER TO admin;

--
-- Name: technician_managers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.technician_managers (
    id uuid NOT NULL,
    technician_id uuid NOT NULL,
    manager_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.technician_managers OWNER TO admin;

--
-- Name: technician_plants; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.technician_plants (
    id uuid NOT NULL,
    technician_id uuid NOT NULL,
    plant_id uuid NOT NULL,
    manager_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.technician_plants OWNER TO admin;

--
-- Name: technicians; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.technicians (
    id uuid NOT NULL,
    technician_code character varying(50),
    user_id uuid NOT NULL,
    created_by uuid,
    vendor_id uuid,
    technician_type character varying(50),
    experience character varying(100),
    specialization character varying(255),
    status public.enum_technicians_status DEFAULT 'Active'::public.enum_technicians_status,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.technicians OWNER TO admin;

--
-- Name: COLUMN technicians.technician_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.technicians.technician_type IS 'In-House | Third-Party';


--
-- Name: ticket_responses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.ticket_responses (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    assigned_technician_id uuid NOT NULL,
    comment text NOT NULL,
    response_type public.enum_ticket_responses_response_type DEFAULT 'comment'::public.enum_ticket_responses_response_type,
    is_fixed boolean,
    photo_urls json DEFAULT '[]'::json,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.ticket_responses OWNER TO admin;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tickets (
    id uuid NOT NULL,
    ticket_code character varying(50),
    created_by uuid NOT NULL,
    plant_id uuid,
    asset_id uuid NOT NULL,
    category_id uuid,
    technician_id uuid,
    task_name character varying(255) NOT NULL,
    task_description text,
    target_date timestamp with time zone NOT NULL,
    ticket_type public.enum_tickets_ticket_type DEFAULT 'General'::public.enum_tickets_ticket_type,
    completed_status public.enum_tickets_completed_status DEFAULT 'Pending'::public.enum_tickets_completed_status,
    started_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.tickets OWNER TO admin;

--
-- Name: uploaded_files; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.uploaded_files (
    id uuid NOT NULL,
    original_name character varying(255) NOT NULL,
    stored_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size integer NOT NULL,
    path character varying(500) NOT NULL,
    url character varying(500) NOT NULL,
    uploaded_by uuid NOT NULL,
    data bytea,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.uploaded_files OWNER TO admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name character varying(255),
    display_name character varying(255),
    phone character varying(20),
    email character varying(255),
    password character varying(255),
    profile_pic text,
    status public.enum_users_status DEFAULT 'Active'::public.enum_users_status,
    otp text,
    otp_expiry timestamp with time zone,
    otp_is_used boolean DEFAULT false,
    device_token character varying(500),
    role_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO admin;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.vendors (
    id uuid NOT NULL,
    vendor_name character varying(255) NOT NULL,
    vendor_code character varying(100) NOT NULL,
    address character varying(500),
    contact_name character varying(255),
    email character varying(255),
    phone_no character varying(20),
    status public.enum_vendors_status DEFAULT 'Active'::public.enum_vendors_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.vendors OWNER TO admin;

--
-- Name: wings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.wings (
    id uuid NOT NULL,
    floor_id uuid NOT NULL,
    wing_name character varying(100) NOT NULL,
    usage_type character varying(100),
    wing_area numeric(12,2),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.wings OWNER TO admin;

--
-- Name: asset_active_conditions asset_active_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_active_conditions
    ADD CONSTRAINT asset_active_conditions_pkey PRIMARY KEY (id);


--
-- Name: asset_documents asset_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_documents
    ADD CONSTRAINT asset_documents_pkey PRIMARY KEY (id);


--
-- Name: asset_floorplan_position asset_floorplan_position_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_floorplan_position
    ADD CONSTRAINT asset_floorplan_position_asset_id_key UNIQUE (asset_id);


--
-- Name: asset_floorplan_position asset_floorplan_position_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_floorplan_position
    ADD CONSTRAINT asset_floorplan_position_pkey PRIMARY KEY (id);


--
-- Name: asset_health_history asset_health_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_health_history
    ADD CONSTRAINT asset_health_history_pkey PRIMARY KEY (id);


--
-- Name: asset_location_history asset_location_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_location_history
    ADD CONSTRAINT asset_location_history_pkey PRIMARY KEY (id);


--
-- Name: asset_metadata asset_metadata_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_metadata
    ADD CONSTRAINT asset_metadata_asset_id_key UNIQUE (asset_id);


--
-- Name: asset_metadata asset_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_metadata
    ADD CONSTRAINT asset_metadata_pkey PRIMARY KEY (id);


--
-- Name: asset_spec_values asset_spec_values_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_spec_values
    ADD CONSTRAINT asset_spec_values_pkey PRIMARY KEY (id);


--
-- Name: asset_status_history asset_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_status_history
    ADD CONSTRAINT asset_status_history_pkey PRIMARY KEY (id);


--
-- Name: asset_testing_schedule asset_testing_schedule_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_testing_schedule
    ADD CONSTRAINT asset_testing_schedule_asset_id_key UNIQUE (asset_id);


--
-- Name: asset_testing_schedule asset_testing_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_testing_schedule
    ADD CONSTRAINT asset_testing_schedule_pkey PRIMARY KEY (id);


--
-- Name: assets assets_asset_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_asset_code_key UNIQUE (asset_code);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: capa_step_definitions capa_step_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.capa_step_definitions
    ADD CONSTRAINT capa_step_definitions_pkey PRIMARY KEY (id);


--
-- Name: capa_step_definitions capa_step_definitions_step_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.capa_step_definitions
    ADD CONSTRAINT capa_step_definitions_step_code_key UNIQUE (step_code);


--
-- Name: capa_step_definitions capa_step_definitions_step_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.capa_step_definitions
    ADD CONSTRAINT capa_step_definitions_step_number_key UNIQUE (step_number);


--
-- Name: categories categories_category_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_category_code_key UNIQUE (category_code);


--
-- Name: categories categories_category_code_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_category_code_key1 UNIQUE (category_code);


--
-- Name: categories categories_category_code_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_category_code_key2 UNIQUE (category_code);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_files category_files_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.category_files
    ADD CONSTRAINT category_files_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: compliance_records compliance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.compliance_records
    ADD CONSTRAINT compliance_records_pkey PRIMARY KEY (id);


--
-- Name: conditions conditions_condition_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.conditions
    ADD CONSTRAINT conditions_condition_code_key UNIQUE (condition_code);


--
-- Name: conditions conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.conditions
    ADD CONSTRAINT conditions_pkey PRIMARY KEY (id);


--
-- Name: diesel_generators diesel_generators_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.diesel_generators
    ADD CONSTRAINT diesel_generators_pkey PRIMARY KEY (id);


--
-- Name: entrances entrances_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.entrances
    ADD CONSTRAINT entrances_pkey PRIMARY KEY (id);


--
-- Name: fire_safety_systems fire_safety_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.fire_safety_systems
    ADD CONSTRAINT fire_safety_systems_pkey PRIMARY KEY (id);


--
-- Name: fire_safety_systems fire_safety_systems_plant_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.fire_safety_systems
    ADD CONSTRAINT fire_safety_systems_plant_id_key UNIQUE (plant_id);


--
-- Name: floors floors_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_pkey PRIMARY KEY (id);


--
-- Name: form_questions form_questions_form_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.form_questions
    ADD CONSTRAINT form_questions_form_id_question_id_key UNIQUE (form_id, question_id);


--
-- Name: form_questions form_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.form_questions
    ADD CONSTRAINT form_questions_pkey PRIMARY KEY (id);


--
-- Name: form_sections form_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.form_sections
    ADD CONSTRAINT form_sections_pkey PRIMARY KEY (id);


--
-- Name: forms forms_form_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_form_code_key UNIQUE (form_code);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: incident_activities incident_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_activities
    ADD CONSTRAINT incident_activities_pkey PRIMARY KEY (id);


--
-- Name: incident_assignments incident_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_assignments
    ADD CONSTRAINT incident_assignments_pkey PRIMARY KEY (id);


--
-- Name: incident_capa_steps incident_capa_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_capa_steps
    ADD CONSTRAINT incident_capa_steps_pkey PRIMARY KEY (id);


--
-- Name: incident_subtypes incident_subtypes_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_subtypes
    ADD CONSTRAINT incident_subtypes_pkey PRIMARY KEY (id);


--
-- Name: incident_subtypes incident_subtypes_subtype_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_subtypes
    ADD CONSTRAINT incident_subtypes_subtype_code_key UNIQUE (subtype_code);


--
-- Name: incident_types incident_types_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_types
    ADD CONSTRAINT incident_types_pkey PRIMARY KEY (id);


--
-- Name: incident_types incident_types_type_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_types
    ADD CONSTRAINT incident_types_type_code_key UNIQUE (type_code);


--
-- Name: incident_types incident_types_type_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_types
    ADD CONSTRAINT incident_types_type_name_key UNIQUE (type_name);


--
-- Name: incidents incidents_incident_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_incident_number_key UNIQUE (incident_number);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: industries industries_industry_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_industry_code_key UNIQUE (industry_code);


--
-- Name: industries industries_industry_code_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_industry_code_key1 UNIQUE (industry_code);


--
-- Name: industries industries_industry_code_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_industry_code_key2 UNIQUE (industry_code);


--
-- Name: industries industries_industry_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_industry_name_key UNIQUE (industry_name);


--
-- Name: industries industries_industry_name_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_industry_name_key1 UNIQUE (industry_name);


--
-- Name: industries industries_industry_name_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_industry_name_key2 UNIQUE (industry_name);


--
-- Name: industries industries_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_pkey PRIMARY KEY (id);


--
-- Name: inspection_frequencies inspection_frequencies_frequency_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inspection_frequencies
    ADD CONSTRAINT inspection_frequencies_frequency_code_key UNIQUE (frequency_code);


--
-- Name: inspection_frequencies inspection_frequencies_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inspection_frequencies
    ADD CONSTRAINT inspection_frequencies_pkey PRIMARY KEY (id);


--
-- Name: iot_device_asset_map iot_device_asset_map_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_device_asset_map
    ADD CONSTRAINT iot_device_asset_map_pkey PRIMARY KEY (id);


--
-- Name: iot_live_data_fe iot_live_data_fe_device_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_live_data_fe
    ADD CONSTRAINT iot_live_data_fe_device_id_key UNIQUE (device_id);


--
-- Name: iot_live_data_fe iot_live_data_fe_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_live_data_fe
    ADD CONSTRAINT iot_live_data_fe_pkey PRIMARY KEY (id);


--
-- Name: iot_live_data_fh iot_live_data_fh_device_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_live_data_fh
    ADD CONSTRAINT iot_live_data_fh_device_id_key UNIQUE (device_id);


--
-- Name: iot_live_data_fh iot_live_data_fh_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_live_data_fh
    ADD CONSTRAINT iot_live_data_fh_pkey PRIMARY KEY (id);


--
-- Name: iot_live_data_pr iot_live_data_pr_device_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_live_data_pr
    ADD CONSTRAINT iot_live_data_pr_device_id_key UNIQUE (device_id);


--
-- Name: iot_live_data_pr iot_live_data_pr_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_live_data_pr
    ADD CONSTRAINT iot_live_data_pr_pkey PRIMARY KEY (id);


--
-- Name: layouts layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_pkey PRIMARY KEY (id);


--
-- Name: lifts lifts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lifts
    ADD CONSTRAINT lifts_pkey PRIMARY KEY (id);


--
-- Name: maintenance_schedulers maintenance_schedulers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.maintenance_schedulers
    ADD CONSTRAINT maintenance_schedulers_pkey PRIMARY KEY (id);


--
-- Name: managers managers_manager_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_manager_code_key UNIQUE (manager_code);


--
-- Name: managers managers_manager_code_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_manager_code_key1 UNIQUE (manager_code);


--
-- Name: managers managers_manager_code_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_manager_code_key2 UNIQUE (manager_code);


--
-- Name: managers managers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_pkey PRIMARY KEY (id);


--
-- Name: managers managers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_user_id_key UNIQUE (user_id);


--
-- Name: manufacturers manufacturers_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.manufacturers
    ADD CONSTRAINT manufacturers_name_key UNIQUE (name);


--
-- Name: manufacturers manufacturers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.manufacturers
    ADD CONSTRAINT manufacturers_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization organization_organization_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_organization_code_key UNIQUE (organization_code);


--
-- Name: organization organization_organization_code_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_organization_code_key1 UNIQUE (organization_code);


--
-- Name: organization organization_organization_code_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_organization_code_key2 UNIQUE (organization_code);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: plant_categories plant_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_categories
    ADD CONSTRAINT plant_categories_pkey PRIMARY KEY (id);


--
-- Name: plant_categories plant_categories_plant_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_categories
    ADD CONSTRAINT plant_categories_plant_id_category_id_key UNIQUE (plant_id, category_id);


--
-- Name: plant_managers plant_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_managers
    ADD CONSTRAINT plant_managers_pkey PRIMARY KEY (id);


--
-- Name: plant_managers plant_managers_plant_id_manager_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_managers
    ADD CONSTRAINT plant_managers_plant_id_manager_id_key UNIQUE (plant_id, manager_id);


--
-- Name: plants plants_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_pkey PRIMARY KEY (id);


--
-- Name: plants plants_plant_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_plant_code_key UNIQUE (plant_code);


--
-- Name: plants plants_plant_code_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_plant_code_key1 UNIQUE (plant_code);


--
-- Name: plants plants_plant_code_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_plant_code_key2 UNIQUE (plant_code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_product_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_product_code_key UNIQUE (product_code);


--
-- Name: products products_product_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_product_name_key UNIQUE (product_name);


--
-- Name: question_categories question_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_pkey PRIMARY KEY (id);


--
-- Name: question_categories question_categories_question_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_question_id_category_id_key UNIQUE (question_id, category_id);


--
-- Name: question_conditions question_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_conditions
    ADD CONSTRAINT question_conditions_pkey PRIMARY KEY (id);


--
-- Name: question_conditions question_conditions_question_id_condition_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_conditions
    ADD CONSTRAINT question_conditions_question_id_condition_id_key UNIQUE (question_id, condition_id);


--
-- Name: question_frequencies question_frequencies_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_frequencies
    ADD CONSTRAINT question_frequencies_pkey PRIMARY KEY (id);


--
-- Name: question_frequencies question_frequencies_question_id_frequency_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_frequencies
    ADD CONSTRAINT question_frequencies_question_id_frequency_id_key UNIQUE (question_id, frequency_id);


--
-- Name: question_products question_products_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_products
    ADD CONSTRAINT question_products_pkey PRIMARY KEY (id);


--
-- Name: question_products question_products_question_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_products
    ADD CONSTRAINT question_products_question_id_product_id_key UNIQUE (question_id, product_id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: questions questions_question_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_question_code_key UNIQUE (question_code);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_key UNIQUE (user_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_name_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key1 UNIQUE (name);


--
-- Name: roles roles_name_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key2 UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: service_answers service_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_answers
    ADD CONSTRAINT service_answers_pkey PRIMARY KEY (id);


--
-- Name: service_submissions service_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_pkey PRIMARY KEY (id);


--
-- Name: service_submissions service_submissions_submission_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_submission_number_key UNIQUE (submission_number);


--
-- Name: service_technicians service_technicians_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_technicians
    ADD CONSTRAINT service_technicians_pkey PRIMARY KEY (id);


--
-- Name: service_technicians service_technicians_service_id_technician_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_technicians
    ADD CONSTRAINT service_technicians_service_id_technician_id_key UNIQUE (service_id, technician_id);


--
-- Name: spec_definitions spec_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spec_definitions
    ADD CONSTRAINT spec_definitions_pkey PRIMARY KEY (id);


--
-- Name: staircases staircases_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.staircases
    ADD CONSTRAINT staircases_pkey PRIMARY KEY (id);


--
-- Name: technician_categories technician_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_categories
    ADD CONSTRAINT technician_categories_pkey PRIMARY KEY (id);


--
-- Name: technician_categories technician_categories_technician_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_categories
    ADD CONSTRAINT technician_categories_technician_id_category_id_key UNIQUE (technician_id, category_id);


--
-- Name: technician_managers technician_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_managers
    ADD CONSTRAINT technician_managers_pkey PRIMARY KEY (id);


--
-- Name: technician_managers technician_managers_technician_id_manager_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_managers
    ADD CONSTRAINT technician_managers_technician_id_manager_id_key UNIQUE (technician_id, manager_id);


--
-- Name: technician_plants technician_plants_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_plants
    ADD CONSTRAINT technician_plants_pkey PRIMARY KEY (id);


--
-- Name: technician_plants technician_plants_technician_id_plant_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_plants
    ADD CONSTRAINT technician_plants_technician_id_plant_id_key UNIQUE (technician_id, plant_id);


--
-- Name: technicians technicians_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_pkey PRIMARY KEY (id);


--
-- Name: technicians technicians_technician_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_technician_code_key UNIQUE (technician_code);


--
-- Name: technicians technicians_technician_code_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_technician_code_key1 UNIQUE (technician_code);


--
-- Name: technicians technicians_technician_code_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_technician_code_key2 UNIQUE (technician_code);


--
-- Name: technicians technicians_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_user_id_key UNIQUE (user_id);


--
-- Name: ticket_responses ticket_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: uploaded_files uploaded_files_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_phone_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key1 UNIQUE (phone);


--
-- Name: users users_phone_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key2 UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_vendor_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_code_key UNIQUE (vendor_code);


--
-- Name: vendors vendors_vendor_code_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_code_key1 UNIQUE (vendor_code);


--
-- Name: vendors vendors_vendor_code_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_code_key2 UNIQUE (vendor_code);


--
-- Name: vendors vendors_vendor_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_name_key UNIQUE (vendor_name);


--
-- Name: vendors vendors_vendor_name_key1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_name_key1 UNIQUE (vendor_name);


--
-- Name: vendors vendors_vendor_name_key2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_name_key2 UNIQUE (vendor_name);


--
-- Name: wings wings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wings
    ADD CONSTRAINT wings_pkey PRIMARY KEY (id);


--
-- Name: asset_active_conditions_asset_id_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX asset_active_conditions_asset_id_idx ON public.asset_active_conditions USING btree (asset_id);


--
-- Name: asset_active_conditions_priority_score_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX asset_active_conditions_priority_score_idx ON public.asset_active_conditions USING btree (priority_score);


--
-- Name: asset_active_conditions_unique_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX asset_active_conditions_unique_idx ON public.asset_active_conditions USING btree (asset_id, condition_id, question_id);


--
-- Name: asset_spec_values_asset_id_spec_definition_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX asset_spec_values_asset_id_spec_definition_id ON public.asset_spec_values USING btree (asset_id, spec_definition_id);


--
-- Name: form_questions_form_id_question_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX form_questions_form_id_question_id ON public.form_questions USING btree (form_id, question_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_entity; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (related_entity_type, related_entity_id);


--
-- Name: idx_notifications_entity_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_entity_type ON public.notifications USING btree (related_entity_type);


--
-- Name: idx_notifications_expires; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_expires ON public.notifications USING btree (expires_at);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (user_id, priority, is_read);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_service_technicians_service_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_service_technicians_service_id ON public.service_technicians USING btree (service_id);


--
-- Name: idx_service_technicians_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_service_technicians_status ON public.service_technicians USING btree (status);


--
-- Name: idx_service_technicians_technician_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_service_technicians_technician_id ON public.service_technicians USING btree (technician_id);


--
-- Name: incident_assignments_incident_id_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX incident_assignments_incident_id_user_id ON public.incident_assignments USING btree (incident_id, user_id);


--
-- Name: incident_capa_steps_incident_id_step_number; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX incident_capa_steps_incident_id_step_number ON public.incident_capa_steps USING btree (incident_id, step_number);


--
-- Name: incident_subtypes_incident_type_id_subtype_name; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX incident_subtypes_incident_type_id_subtype_name ON public.incident_subtypes USING btree (incident_type_id, subtype_name);


--
-- Name: iot_device_asset_data_key_unique; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX iot_device_asset_data_key_unique ON public.iot_device_asset_map USING btree (device_id, asset_code, data_key);


--
-- Name: iot_device_asset_map_asset_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_device_asset_map_asset_code ON public.iot_device_asset_map USING btree (asset_code);


--
-- Name: iot_device_asset_map_category_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_device_asset_map_category_id ON public.iot_device_asset_map USING btree (category_id);


--
-- Name: iot_device_asset_map_device_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_device_asset_map_device_id ON public.iot_device_asset_map USING btree (device_id);


--
-- Name: iot_device_asset_map_plant_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_device_asset_map_plant_id ON public.iot_device_asset_map USING btree (plant_id);


--
-- Name: iot_live_data_fe_device_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_live_data_fe_device_id ON public.iot_live_data_fe USING btree (device_id);


--
-- Name: iot_live_data_fe_updated_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_live_data_fe_updated_at ON public.iot_live_data_fe USING btree (updated_at);


--
-- Name: iot_live_data_fh_device_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_live_data_fh_device_id ON public.iot_live_data_fh USING btree (device_id);


--
-- Name: iot_live_data_fh_updated_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_live_data_fh_updated_at ON public.iot_live_data_fh USING btree (updated_at);


--
-- Name: iot_live_data_pr_device_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_live_data_pr_device_id ON public.iot_live_data_pr USING btree (device_id);


--
-- Name: iot_live_data_pr_updated_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX iot_live_data_pr_updated_at ON public.iot_live_data_pr USING btree (updated_at);


--
-- Name: permissions_entity_name_action_name; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX permissions_entity_name_action_name ON public.permissions USING btree (entity_name, action_name);


--
-- Name: plant_categories_plant_id_category_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX plant_categories_plant_id_category_id ON public.plant_categories USING btree (plant_id, category_id);


--
-- Name: plant_managers_plant_id_manager_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX plant_managers_plant_id_manager_id ON public.plant_managers USING btree (plant_id, manager_id);


--
-- Name: question_categories_question_id_category_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX question_categories_question_id_category_id ON public.question_categories USING btree (question_id, category_id);


--
-- Name: question_conditions_question_id_condition_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX question_conditions_question_id_condition_id ON public.question_conditions USING btree (question_id, condition_id);


--
-- Name: question_frequencies_question_id_frequency_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX question_frequencies_question_id_frequency_id ON public.question_frequencies USING btree (question_id, frequency_id);


--
-- Name: question_products_question_id_product_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX question_products_question_id_product_id ON public.question_products USING btree (question_id, product_id);


--
-- Name: role_permissions_role_id_permission_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX role_permissions_role_id_permission_id ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: service_answers_submission_id_question_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX service_answers_submission_id_question_id ON public.service_answers USING btree (submission_id, question_id);


--
-- Name: spec_definitions_category_id_spec_name; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX spec_definitions_category_id_spec_name ON public.spec_definitions USING btree (category_id, spec_name);


--
-- Name: technician_categories_technician_id_category_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX technician_categories_technician_id_category_id ON public.technician_categories USING btree (technician_id, category_id);


--
-- Name: technician_managers_technician_id_manager_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX technician_managers_technician_id_manager_id ON public.technician_managers USING btree (technician_id, manager_id);


--
-- Name: technician_plants_technician_id_plant_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX technician_plants_technician_id_plant_id ON public.technician_plants USING btree (technician_id, plant_id);


--
-- Name: unique_service_technician; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX unique_service_technician ON public.service_technicians USING btree (service_id, technician_id);


--
-- Name: asset_active_conditions asset_active_conditions_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_active_conditions
    ADD CONSTRAINT asset_active_conditions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_active_conditions asset_active_conditions_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_active_conditions
    ADD CONSTRAINT asset_active_conditions_condition_id_fkey FOREIGN KEY (condition_id) REFERENCES public.conditions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_active_conditions asset_active_conditions_last_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_active_conditions
    ADD CONSTRAINT asset_active_conditions_last_submission_id_fkey FOREIGN KEY (last_submission_id) REFERENCES public.service_submissions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_active_conditions asset_active_conditions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_active_conditions
    ADD CONSTRAINT asset_active_conditions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_documents asset_documents_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_documents
    ADD CONSTRAINT asset_documents_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_floorplan_position asset_floorplan_position_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_floorplan_position
    ADD CONSTRAINT asset_floorplan_position_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_floorplan_position asset_floorplan_position_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_floorplan_position
    ADD CONSTRAINT asset_floorplan_position_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_floorplan_position asset_floorplan_position_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_floorplan_position
    ADD CONSTRAINT asset_floorplan_position_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: asset_health_history asset_health_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_health_history
    ADD CONSTRAINT asset_health_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE;


--
-- Name: asset_health_history asset_health_history_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_health_history
    ADD CONSTRAINT asset_health_history_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.service_submissions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_location_history asset_location_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_location_history
    ADD CONSTRAINT asset_location_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_location_history asset_location_history_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_location_history
    ADD CONSTRAINT asset_location_history_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_metadata asset_metadata_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_metadata
    ADD CONSTRAINT asset_metadata_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_spec_values asset_spec_values_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_spec_values
    ADD CONSTRAINT asset_spec_values_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_spec_values asset_spec_values_spec_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_spec_values
    ADD CONSTRAINT asset_spec_values_spec_definition_id_fkey FOREIGN KEY (spec_definition_id) REFERENCES public.spec_definitions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_status_history asset_status_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_status_history
    ADD CONSTRAINT asset_status_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_status_history asset_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_status_history
    ADD CONSTRAINT asset_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: asset_testing_schedule asset_testing_schedule_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.asset_testing_schedule
    ADD CONSTRAINT asset_testing_schedule_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets assets_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assets assets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assets assets_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_manufacturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES public.manufacturers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets assets_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assets assets_wing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_wing_id_fkey FOREIGN KEY (wing_id) REFERENCES public.wings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: buildings buildings_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: capa_step_definitions capa_step_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.capa_step_definitions
    ADD CONSTRAINT capa_step_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: categories categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: category_files category_files_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.category_files
    ADD CONSTRAINT category_files_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: category_files category_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.category_files
    ADD CONSTRAINT category_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: comments comments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: compliance_records compliance_records_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.compliance_records
    ADD CONSTRAINT compliance_records_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conditions conditions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.conditions
    ADD CONSTRAINT conditions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: diesel_generators diesel_generators_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.diesel_generators
    ADD CONSTRAINT diesel_generators_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entrances entrances_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.entrances
    ADD CONSTRAINT entrances_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fire_safety_systems fire_safety_systems_amc_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.fire_safety_systems
    ADD CONSTRAINT fire_safety_systems_amc_vendor_id_fkey FOREIGN KEY (amc_vendor_id) REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fire_safety_systems fire_safety_systems_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.fire_safety_systems
    ADD CONSTRAINT fire_safety_systems_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: floors floors_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: form_questions form_questions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.form_questions
    ADD CONSTRAINT form_questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: form_questions form_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.form_questions
    ADD CONSTRAINT form_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: form_questions form_questions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.form_questions
    ADD CONSTRAINT form_questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.form_sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: form_sections form_sections_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.form_sections
    ADD CONSTRAINT form_sections_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: forms forms_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: forms forms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: forms forms_frequency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_frequency_id_fkey FOREIGN KEY (frequency_id) REFERENCES public.inspection_frequencies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: forms forms_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: forms forms_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_activities incident_activities_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_activities
    ADD CONSTRAINT incident_activities_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_activities incident_activities_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_activities
    ADD CONSTRAINT incident_activities_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incident_assignments incident_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_assignments
    ADD CONSTRAINT incident_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incident_assignments incident_assignments_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_assignments
    ADD CONSTRAINT incident_assignments_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_assignments incident_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_assignments
    ADD CONSTRAINT incident_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_capa_steps incident_capa_steps_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_capa_steps
    ADD CONSTRAINT incident_capa_steps_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_capa_steps incident_capa_steps_capa_step_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_capa_steps
    ADD CONSTRAINT incident_capa_steps_capa_step_definition_id_fkey FOREIGN KEY (capa_step_definition_id) REFERENCES public.capa_step_definitions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incident_capa_steps incident_capa_steps_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_capa_steps
    ADD CONSTRAINT incident_capa_steps_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_capa_steps incident_capa_steps_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_capa_steps
    ADD CONSTRAINT incident_capa_steps_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_capa_steps incident_capa_steps_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_capa_steps
    ADD CONSTRAINT incident_capa_steps_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_subtypes incident_subtypes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_subtypes
    ADD CONSTRAINT incident_subtypes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incident_subtypes incident_subtypes_incident_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_subtypes
    ADD CONSTRAINT incident_subtypes_incident_type_id_fkey FOREIGN KEY (incident_type_id) REFERENCES public.incident_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_types incident_types_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_types
    ADD CONSTRAINT incident_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incidents incidents_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_incident_subtype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_incident_subtype_id_fkey FOREIGN KEY (incident_subtype_id) REFERENCES public.incident_subtypes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incidents incidents_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incidents incidents_team_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_team_creator_id_fkey FOREIGN KEY (team_creator_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: industries industries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: iot_device_asset_map iot_device_asset_map_asset_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_device_asset_map
    ADD CONSTRAINT iot_device_asset_map_asset_code_fkey FOREIGN KEY (asset_code) REFERENCES public.assets(asset_code) ON UPDATE CASCADE;


--
-- Name: iot_device_asset_map iot_device_asset_map_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_device_asset_map
    ADD CONSTRAINT iot_device_asset_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE;


--
-- Name: iot_device_asset_map iot_device_asset_map_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.iot_device_asset_map
    ADD CONSTRAINT iot_device_asset_map_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE;


--
-- Name: layouts layouts_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: layouts layouts_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: layouts layouts_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE;


--
-- Name: layouts layouts_wing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_wing_id_fkey FOREIGN KEY (wing_id) REFERENCES public.wings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lifts lifts_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lifts
    ADD CONSTRAINT lifts_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: maintenance_schedulers maintenance_schedulers_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.maintenance_schedulers
    ADD CONSTRAINT maintenance_schedulers_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE;


--
-- Name: maintenance_schedulers maintenance_schedulers_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.maintenance_schedulers
    ADD CONSTRAINT maintenance_schedulers_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: managers managers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: managers managers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: notifications notifications_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organization organization_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: plant_categories plant_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_categories
    ADD CONSTRAINT plant_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: plant_categories plant_categories_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_categories
    ADD CONSTRAINT plant_categories_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: plant_managers plant_managers_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_managers
    ADD CONSTRAINT plant_managers_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.managers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: plant_managers plant_managers_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plant_managers
    ADD CONSTRAINT plant_managers_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: plants plants_industry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: plants plants_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE;


--
-- Name: question_categories question_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_categories question_categories_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_conditions question_conditions_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_conditions
    ADD CONSTRAINT question_conditions_condition_id_fkey FOREIGN KEY (condition_id) REFERENCES public.conditions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_conditions question_conditions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_conditions
    ADD CONSTRAINT question_conditions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_frequencies question_frequencies_frequency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_frequencies
    ADD CONSTRAINT question_frequencies_frequency_id_fkey FOREIGN KEY (frequency_id) REFERENCES public.inspection_frequencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_frequencies question_frequencies_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_frequencies
    ADD CONSTRAINT question_frequencies_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_products question_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_products
    ADD CONSTRAINT question_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: question_products question_products_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_products
    ADD CONSTRAINT question_products_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: questions questions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: questions questions_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_answers service_answers_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_answers
    ADD CONSTRAINT service_answers_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.technicians(id) ON UPDATE CASCADE;


--
-- Name: service_answers service_answers_non_compliance_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_answers
    ADD CONSTRAINT service_answers_non_compliance_condition_id_fkey FOREIGN KEY (non_compliance_condition_id) REFERENCES public.conditions(id);


--
-- Name: service_answers service_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_answers
    ADD CONSTRAINT service_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE;


--
-- Name: service_answers service_answers_selected_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_answers
    ADD CONSTRAINT service_answers_selected_condition_id_fkey FOREIGN KEY (selected_condition_id) REFERENCES public.conditions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_answers service_answers_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_answers
    ADD CONSTRAINT service_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.service_submissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_submissions service_submissions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.managers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_submissions service_submissions_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE;


--
-- Name: service_submissions service_submissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_submissions service_submissions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON UPDATE CASCADE;


--
-- Name: service_submissions service_submissions_frequency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_frequency_id_fkey FOREIGN KEY (frequency_id) REFERENCES public.inspection_frequencies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_submissions service_submissions_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.managers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_submissions service_submissions_override_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_override_approved_by_fkey FOREIGN KEY (override_approved_by) REFERENCES public.managers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_submissions service_submissions_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE;


--
-- Name: service_submissions service_submissions_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.maintenance_schedulers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_submissions service_submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.technicians(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_submissions service_submissions_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_submissions
    ADD CONSTRAINT service_submissions_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_technicians service_technicians_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_technicians
    ADD CONSTRAINT service_technicians_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.managers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_technicians service_technicians_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_technicians
    ADD CONSTRAINT service_technicians_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_submissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_technicians service_technicians_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.service_technicians
    ADD CONSTRAINT service_technicians_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spec_definitions spec_definitions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.spec_definitions
    ADD CONSTRAINT spec_definitions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: staircases staircases_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.staircases
    ADD CONSTRAINT staircases_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: technician_categories technician_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_categories
    ADD CONSTRAINT technician_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: technician_categories technician_categories_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_categories
    ADD CONSTRAINT technician_categories_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id) ON UPDATE CASCADE;


--
-- Name: technician_managers technician_managers_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_managers
    ADD CONSTRAINT technician_managers_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.managers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: technician_managers technician_managers_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_managers
    ADD CONSTRAINT technician_managers_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: technician_plants technician_plants_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_plants
    ADD CONSTRAINT technician_plants_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.managers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: technician_plants technician_plants_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_plants
    ADD CONSTRAINT technician_plants_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: technician_plants technician_plants_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technician_plants
    ADD CONSTRAINT technician_plants_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id) ON UPDATE CASCADE;


--
-- Name: technicians technicians_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: technicians technicians_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: technicians technicians_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: ticket_responses ticket_responses_assigned_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_assigned_technician_id_fkey FOREIGN KEY (assigned_technician_id) REFERENCES public.technicians(id) ON UPDATE CASCADE;


--
-- Name: ticket_responses ticket_responses_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tickets tickets_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE;


--
-- Name: tickets tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: tickets tickets_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: uploaded_files uploaded_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendors vendors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: wings wings_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wings
    ADD CONSTRAINT wings_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dwUuvVCcDYXAbWeylGip5YIrThBQLXFtGLs6zbqQIFVs0wiI6QhpzoiyqfKyTg1

