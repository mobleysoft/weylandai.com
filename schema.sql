
-- Table: ventures
CREATE TABLE "ventures" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_id TEXT,
    config_json TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: nodes
CREATE TABLE "nodes" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    mhs_id TEXT,
    stripe_customer_id TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: memberships
CREATE TABLE "memberships" (
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner', 'mhs_sysadmin')),
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, tenant_id),
    FOREIGN KEY (user_id) REFERENCES "nodes"(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES "ventures"(id) ON DELETE CASCADE
);

-- Table: organizations
CREATE TABLE "organizations" (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    billing_email TEXT,
    config_json TEXT DEFAULT '{}',
    is_sysadmin INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Table: kv_compat
CREATE TABLE kv_compat (
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    metadata TEXT,
    expiration INTEGER,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (namespace, key)
);

-- Table: weyland_sessions
CREATE TABLE weyland_sessions (id TEXT PRIMARY KEY, user_id TEXT, email TEXT, mhs_id TEXT, player_json TEXT, expires_at TEXT, created_at TEXT DEFAULT (datetime('now')));

-- Table: affirm_audit_log
CREATE TABLE affirm_audit_log (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT,
  reason TEXT,
  entity_snapshot TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: affirmation_log
CREATE TABLE affirmation_log (
  log_id TEXT PRIMARY KEY,
  mapping_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  notes TEXT
);

-- Table: affirmation_queue
CREATE TABLE affirmation_queue (
  queue_id TEXT PRIMARY KEY,
  mapping_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  assigned_at TEXT,
  completed_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL
);

-- Table: api_keys
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT,
  last_used_at TEXT,
  expires_at TEXT,
  revoked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Table: audit_logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  submittal_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

-- Table: building_codes
CREATE TABLE building_codes (
  id TEXT PRIMARY KEY,
  code_type TEXT NOT NULL,
  code_section TEXT,
  description TEXT NOT NULL,
  requirements TEXT,
  fire_rating_requirements TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: catalogue_intake_tickets
CREATE TABLE catalogue_intake_tickets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  type TEXT NOT NULL DEFAULT 'CATALOGUE_INTAKE_REVIEW',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  manufacturer TEXT,
  product_category TEXT,
  triggered_by_component TEXT,
  triggered_by_project TEXT,
  triggered_by_user TEXT NOT NULL,
  reviewer_id TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  resulting_catalogue_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table: catalogue_pages
CREATE TABLE catalogue_pages (
  catalogue_id TEXT NOT NULL,
  page_num INTEGER NOT NULL,
  text_content TEXT,
  char_count INTEGER DEFAULT 0,
  has_extractable_text INTEGER DEFAULT 1,
  header_text TEXT,
  footer_text TEXT,
  search_text TEXT,
  PRIMARY KEY (catalogue_id, page_num)
);

-- Table: catalogues
CREATE TABLE catalogues (
  catalogue_id TEXT PRIMARY KEY,
  source_filename TEXT NOT NULL,
  source_hash_sha256 TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  manufacturer TEXT,
  title TEXT,
  version TEXT,
  ingested_at TEXT NOT NULL,
  ingested_by TEXT,
  storage_path TEXT NOT NULL,
  text_extracted INTEGER DEFAULT 0,
  index_built INTEGER DEFAULT 0
);

-- Table: claude_api_logs
CREATE TABLE claude_api_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  api_type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  request_timestamp TEXT NOT NULL,
  request_body TEXT,
  system_prompt TEXT,
  user_message_preview TEXT,
  response_timestamp TEXT,
  response_text TEXT,
  response_status INTEGER,
  error_message TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  estimated_cost_usd REAL,
  page_number INTEGER,
  correlation_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: client_telemetry
CREATE TABLE client_telemetry (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  message TEXT,
  stack_trace TEXT,
  context TEXT,
  url TEXT,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  performance_data TEXT,
  client_timestamp TEXT NOT NULL,
  server_timestamp TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  correlation_id TEXT,
  parent_event_id TEXT,
  created_at TEXT
);

-- Table: constraint_executions
CREATE TABLE constraint_executions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_number INTEGER,
  tenant_id TEXT,
  industry_id TEXT,
  spec_version TEXT NOT NULL,
  resolved_constraints TEXT NOT NULL,
  prompt_hash TEXT,
  input_hash TEXT,
  output_hash TEXT,
  extraction_success INTEGER,
  error_message TEXT,
  executed_at TEXT DEFAULT (datetime('now')),
  duration_ms INTEGER
);

-- Table: cps_draft_selections
CREATE TABLE cps_draft_selections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT NOT NULL,
  component_id TEXT NOT NULL,
  selected_pages TEXT NOT NULL,
  preview_state TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL,
  expires_at TEXT
);

-- Table: cut_sheet_discoveries
CREATE TABLE cut_sheet_discoveries (
  id TEXT PRIMARY KEY,
  component_id TEXT,
  queue_item_id TEXT,
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  discovered_at TEXT DEFAULT (datetime('now')),
  document_title TEXT,
  document_type TEXT DEFAULT 'cut_sheet',
  file_size_bytes INTEGER,
  page_count INTEGER,
  extracted_metadata TEXT,
  extraction_confidence REAL,
  matches_expected INTEGER DEFAULT 0,
  temp_r2_key TEXT,
  file_hash_sha256 TEXT,
  status TEXT DEFAULT 'pending_review',
  reviewed_by TEXT,
  reviewed_at TEXT,
  rejection_reason TEXT,
  corrections TEXT,
  product_document_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: cut_sheet_discovery_queue
CREATE TABLE cut_sheet_discovery_queue (
  id TEXT PRIMARY KEY,
  component_id TEXT,
  manufacturer TEXT NOT NULL,
  model TEXT,
  catalog_number TEXT,
  dhi_category TEXT,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  error_message TEXT,
  processed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  session_id TEXT,
  discovery_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  component_type TEXT
);

-- Table: d1_migrations
CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT,
  applied_at TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

-- Table: discovery_engine_config
CREATE TABLE discovery_engine_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Table: discovery_retry_log
CREATE TABLE discovery_retry_log (
  id TEXT PRIMARY KEY,
  discovery_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  strategy_used TEXT,
  error_message TEXT,
  http_status INTEGER,
  attempted_at DATETIME DEFAULT (datetime('now')),
  duration_ms INTEGER,
  succeeded BOOLEAN DEFAULT 0,
  result_url TEXT
);

-- Table: door_entries
CREATE TABLE door_entries (
  id TEXT PRIMARY KEY,
  submittal_id TEXT NOT NULL,
  door_number TEXT NOT NULL,
  door_type TEXT,
  material_code TEXT,
  frame_material TEXT,
  width_inches REAL,
  height_inches REAL,
  thickness_inches REAL,
  fire_rating TEXT,
  fire_rating_minutes INTEGER,
  hardware_group TEXT,
  hardware_requirements TEXT,
  ada_compliant INTEGER DEFAULT 0,
  aia_standard TEXT,
  remarks TEXT,
  extraction_confidence REAL,
  validated INTEGER DEFAULT 0,
  validation_notes TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT DEFAULT NULL,
  size TEXT,
  glazing TEXT,
  door_notes_refs TEXT,
  glazing_notes_refs TEXT
);

-- Table: door_hardware_matrix
CREATE TABLE door_hardware_matrix (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  door_number TEXT NOT NULL,
  door_location TEXT,
  door_type TEXT,
  hardware_set_number TEXT NOT NULL,
  source_page INTEGER,
  source_type TEXT NOT NULL DEFAULT 'extracted',
  extraction_confidence REAL,
  verified BOOLEAN DEFAULT 0,
  verified_at TEXT,
  verified_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: door_schedule_entries
CREATE TABLE door_schedule_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT,
  page_number INTEGER NOT NULL,
  mark TEXT NOT NULL,
  hardware_group TEXT,
  fire_rating TEXT,
  width TEXT,
  height TEXT,
  width_inches REAL,
  height_inches REAL,
  door_type TEXT,
  door_material TEXT,
  frame_type TEXT,
  frame_material TEXT,
  panic INTEGER DEFAULT 0,
  thickness TEXT,
  thickness_inches REAL,
  door_finish TEXT,
  stc_rating INTEGER,
  frame_finish TEXT,
  head_detail TEXT,
  jamb_detail TEXT,
  sill_detail TEXT,
  notes TEXT,
  hardware_set_id TEXT,
  hardware_group_match_score REAL,
  hardware_group_match_method TEXT,
  extraction_confidence REAL,
  field_confidence_json TEXT,
  low_confidence_fields TEXT,
  validated INTEGER DEFAULT 0,
  validated_by TEXT,
  validated_at TEXT,
  corrections_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  validation_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  original_values_json TEXT,
  validation_notes TEXT
);

-- Table: door_types
CREATE TABLE door_types (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  typical_configuration TEXT,
  hardware_requirements TEXT,
  created_at TEXT NOT NULL
);

-- Table: extraction_cache
CREATE TABLE extraction_cache (
  cache_key TEXT PRIMARY KEY,
  catalogue_id TEXT NOT NULL,
  pages TEXT NOT NULL,
  format TEXT NOT NULL,
  dpi INTEGER,
  output_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  created_at TEXT NOT NULL,
  last_accessed TEXT,
  access_count INTEGER DEFAULT 0
);

-- Table: founder_directives
CREATE TABLE founder_directives (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  product TEXT,
  raw_response TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: hardware_components
CREATE TABLE hardware_components (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  component_type TEXT NOT NULL,
  dhi_category TEXT,
  sequence_order INTEGER,
  manufacturer TEXT,
  model TEXT,
  catalog_number TEXT,
  finish TEXT,
  quantity INTEGER DEFAULT 1,
  function_code TEXT,
  specifications TEXT,
  ansi_bhma_grade TEXT,
  fire_rating_minutes INTEGER,
  ul_listing_number TEXT,
  ada_compliant BOOLEAN,
  approved_at TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  version INTEGER DEFAULT 1,
  affirmed INTEGER DEFAULT 0,
  affirmed_at TEXT,
  affirmed_by TEXT,
  product_id TEXT,
  product_variant_id TEXT,
  product_match_confidence REAL,
  uom TEXT DEFAULT 'EA',
  unit_price REAL,
  price_source TEXT DEFAULT 'manual',
  net_price REAL,
  list_price REAL,
  hardware_set_id TEXT
);

-- Table: hardware_door_matrix
CREATE TABLE hardware_door_matrix (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  door_mark TEXT,
  hardware_set_id TEXT,
  hardware_group TEXT,
  source_page INTEGER,
  created_at TEXT,
  updated_at TEXT
);

-- Table: hardware_extraction_sessions
CREATE TABLE hardware_extraction_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  submittal_id TEXT,
  project_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_buffer_key TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  pages_processed INTEGER DEFAULT 0,
  pages_approved INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  current_page INTEGER DEFAULT 1,
  total_sets_extracted INTEGER DEFAULT 0,
  total_components_extracted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  version INTEGER DEFAULT 1,
  door_schedule_extracted INTEGER DEFAULT 0,
  door_entries_count INTEGER DEFAULT 0,
  door_schedule_extracted_at TEXT,
  source_type TEXT DEFAULT 'pdf',
  detection_status TEXT DEFAULT 'not_started',
  detection_method TEXT,
  detection_completed_at TEXT,
  candidates_count INTEGER DEFAULT 0,
  text_extraction_viable INTEGER,
  document_type TEXT DEFAULT 'door_schedule',
  tenant_id TEXT,
  industry_id TEXT,
  project_id TEXT,
  document_outline TEXT,
  detected_schedule_pages TEXT,
  extraction_page_range TEXT,
  schedule_table_pages TEXT
, extraction_route TEXT, extraction_route_affirmed_at TEXT, extraction_route_affirmed_by TEXT, pending_job_id TEXT, pending_job_queued_at TEXT, extraction_completed_at TEXT);

-- Table: hardware_page_extractions
CREATE TABLE hardware_page_extractions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  extracted_data TEXT NOT NULL,
  status TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  corrections TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  extraction_time_ms INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  version INTEGER DEFAULT 1,
  field_confidence TEXT,
  overall_confidence REAL,
  auto_approved BOOLEAN DEFAULT FALSE,
  affirm_state TEXT,
  previous_extracted_data TEXT,
  previous_affirm_state TEXT,
  extraction_count INTEGER DEFAULT 1,
  re_extracted_at TEXT
);

-- Table: hardware_sets
CREATE TABLE hardware_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  submittal_id TEXT,
  set_number TEXT NOT NULL,
  set_name TEXT,
  door_location TEXT,
  door_count INTEGER,
  approved_from_page INTEGER NOT NULL,
  approved_at TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  source_page_extraction_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  version INTEGER DEFAULT 1,
  location_id TEXT,
  affirmed INTEGER DEFAULT 0,
  affirmed_at TEXT,
  affirmed_by TEXT,
  unit_price_override REAL DEFAULT NULL
);

-- Table: hardware_specifications
CREATE TABLE hardware_specifications (
  id TEXT PRIMARY KEY,
  set_id TEXT,
  component_id TEXT,
  specification_type TEXT NOT NULL,
  specification_text TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Table: hook_deliveries
CREATE TABLE hook_deliveries (
  id TEXT PRIMARY KEY,
  hook_id TEXT NOT NULL,
  event TEXT NOT NULL,
  direction TEXT NOT NULL,
  payload TEXT NOT NULL,
  status INTEGER DEFAULT 0,
  response_status INTEGER,
  response_body TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table: industries
CREATE TABLE industries (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_industry_id TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: layer_results
CREATE TABLE layer_results (
  id TEXT PRIMARY KEY,
  verification_run_id TEXT NOT NULL,
  layer_name TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  status TEXT NOT NULL,
  execution_time_ms INTEGER,
  statistics TEXT,
  created_at TEXT NOT NULL
);

-- Table: layout_specifications
CREATE TABLE layout_specifications (
  id TEXT PRIMARY KEY,
  document_type TEXT NOT NULL,
  layout_variant TEXT,
  source_hash TEXT,
  visual_structure TEXT NOT NULL,
  table_patterns TEXT,
  extraction_prompt_fragment TEXT,
  scope_level TEXT DEFAULT 'global',
  manufacturer_id TEXT,
  tenant_id TEXT,
  affirmed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: learned_url_patterns
CREATE TABLE learned_url_patterns (
  id TEXT PRIMARY KEY,
  manufacturer_slug TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_value TEXT NOT NULL,
  source_discovery_id TEXT,
  learned_from_model TEXT,
  applicable_to_series TEXT,
  times_used INTEGER DEFAULT 0,
  times_succeeded INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now')),
  last_used_at DATETIME,
  last_succeeded_at DATETIME
);

-- Table: locations
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  parent_location_id TEXT,
  location_type TEXT NOT NULL,
  location_code TEXT NOT NULL,
  location_name TEXT,
  full_path TEXT,
  occupancy_classification TEXT,
  occupant_load INTEGER,
  ahj_jurisdiction TEXT,
  accessibility_required BOOLEAN DEFAULT TRUE,
  area_square_feet REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT
);

-- Table: manufacturer_brands
CREATE TABLE manufacturer_brands (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  parent_manufacturer_id TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_code TEXT,
  website_domain TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP DEFAULT (datetime('now'))
);

-- Table: manufacturer_domains
CREATE TABLE manufacturer_domains (
  id TEXT PRIMARY KEY,
  manufacturer_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  domain_type TEXT,
  verified INTEGER DEFAULT 0,
  verified_by TEXT,
  verified_at TEXT,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  manufacturer_slug TEXT
);

-- Table: manufacturers
CREATE TABLE manufacturers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  website TEXT,
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  support_email TEXT,
  support_phone TEXT,
  parent_company TEXT,
  country_of_origin TEXT,
  founded_year INTEGER,
  last_sync_timestamp TEXT,
  last_sync_status TEXT,
  sync_error_message TEXT,
  product_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  preferred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: material_codes
CREATE TABLE material_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT,
  typical_use_percentage REAL,
  standard_specifications TEXT,
  created_at TEXT NOT NULL
);

-- Table: ocr_validation_queue
CREATE TABLE ocr_validation_queue (
  id TEXT PRIMARY KEY,
  extraction_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  priority TEXT DEFAULT 'normal',
  flagged_reason TEXT,
  low_confidence_fields TEXT,
  assigned_to TEXT,
  assigned_at TEXT,
  validation_status TEXT DEFAULT 'pending',
  suggested_corrections TEXT,
  reviewer_notes TEXT,
  validated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: password_reset_rate_limit
CREATE TABLE password_reset_rate_limit (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  first_request_at INTEGER NOT NULL,
  last_request_at INTEGER NOT NULL,
  locked_until INTEGER
);

-- Table: password_reset_tokens
CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  used_at INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

-- Table: payment_transactions
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  tier TEXT,
  event_type TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: payment_webhook_log
CREATE TABLE payment_webhook_log (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT,
  processed INTEGER DEFAULT 0,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: post_transformation_review_queue
CREATE TABLE post_transformation_review_queue (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  extraction_id TEXT NOT NULL,
  transformation_result TEXT,
  enrichment_result TEXT,
  sets_created INTEGER DEFAULT 0,
  components_created INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending_final_review',
  priority TEXT DEFAULT 'normal',
  assigned_to TEXT,
  assigned_at TEXT,
  reviewer_notes TEXT,
  final_approved_at TEXT,
  final_approved_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- Table: product_compatibility
CREATE TABLE product_compatibility (
  product_id TEXT NOT NULL,
  compatible_product_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  constraint_description TEXT,
  condition_json TEXT,
  confidence_score DECIMAL(3,2),
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: product_documents
CREATE TABLE product_documents (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  document_subtitle TEXT,
  document_url TEXT,
  r2_object_key TEXT,
  r2_bucket TEXT DEFAULT 'product-docs',
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  file_hash_sha256 TEXT,
  version TEXT,
  page_count INTEGER,
  language TEXT DEFAULT 'en',
  published_date TEXT,
  expiration_date TEXT,
  searchable_text TEXT,
  contains_pricing BOOLEAN DEFAULT FALSE,
  contains_cad BOOLEAN DEFAULT FALSE,
  contains_bim BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: product_mappings
CREATE TABLE product_mappings (
  mapping_id TEXT PRIMARY KEY,
  catalogue_id TEXT NOT NULL,
  model TEXT NOT NULL,
  model_normalized TEXT NOT NULL,
  series TEXT,
  manufacturer TEXT,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  match_method TEXT NOT NULL,
  match_pattern TEXT,
  confidence TEXT NOT NULL,
  affirmed INTEGER DEFAULT 0,
  affirmed_by TEXT,
  affirmed_at TEXT,
  created_at TEXT NOT NULL
);

-- Table: product_variants
CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  function_code TEXT,
  function_description TEXT,
  trim_style TEXT,
  trim_style_code TEXT,
  finish_code TEXT NOT NULL,
  finish_description TEXT,
  handing TEXT,
  size_code TEXT,
  backset_inches DECIMAL(4,2),
  door_thickness_min DECIMAL(5,2),
  door_thickness_max DECIMAL(5,2),
  voltage TEXT,
  current_draw_amps DECIMAL(5,2),
  fail_safe_fail_secure TEXT,
  ansi_bhma_grade TEXT,
  fire_rating_minutes INTEGER,
  cycle_rating INTEGER,
  cycle_test_passed BOOLEAN DEFAULT FALSE,
  weight_lbs DECIMAL(6,2),
  width_inches DECIMAL(5,2),
  height_inches DECIMAL(5,2),
  depth_inches DECIMAL(5,2),
  full_model_number TEXT NOT NULL,
  upc_code TEXT,
  manufacturer_part_number TEXT,
  catalog_page TEXT,
  catalog_section TEXT,
  list_price DECIMAL(10,2),
  unit_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  price_effective_date TEXT,
  price_expires_date TEXT,
  lead_time_weeks INTEGER,
  stock_status TEXT DEFAULT 'unknown',
  stock_quantity INTEGER,
  minimum_order_quantity INTEGER DEFAULT 1,
  special_order BOOLEAN DEFAULT FALSE,
  customizable BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: products
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  manufacturer_id TEXT NOT NULL,
  product_series TEXT NOT NULL,
  product_family TEXT NOT NULL,
  base_model TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  category_level_1 TEXT,
  category_level_2 TEXT,
  category_level_3 TEXT,
  ansi_bhma_certified BOOLEAN DEFAULT FALSE,
  ansi_grade TEXT,
  ul_listed BOOLEAN DEFAULT FALSE,
  ul_listing_number TEXT,
  ada_compliant BOOLEAN DEFAULT FALSE,
  california_title_24 BOOLEAN DEFAULT FALSE,
  fire_rated BOOLEAN DEFAULT FALSE,
  max_fire_rating_minutes INTEGER,
  smoke_rated BOOLEAN DEFAULT FALSE,
  hurricane_rated BOOLEAN DEFAULT FALSE,
  security_level TEXT,
  pick_resistant BOOLEAN DEFAULT FALSE,
  drill_resistant BOOLEAN DEFAULT FALSE,
  door_types TEXT,
  suitable_for_exterior BOOLEAN DEFAULT FALSE,
  suitable_for_interior BOOLEAN DEFAULT FALSE,
  suitable_for_fire_door BOOLEAN DEFAULT FALSE,
  available BOOLEAN DEFAULT TRUE,
  discontinued BOOLEAN DEFAULT FALSE,
  eol_date TEXT,
  eol_reason TEXT,
  replacement_product_id TEXT,
  popular BOOLEAN DEFAULT FALSE,
  new_product BOOLEAN DEFAULT FALSE,
  catalog_page_url TEXT,
  spec_sheet_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  catalog_number TEXT,
  search_text TEXT
);

-- Table: prompt_specifications
CREATE TABLE prompt_specifications (
  id TEXT PRIMARY KEY,
  spec_version TEXT NOT NULL,
  scope_level TEXT NOT NULL DEFAULT 'global',
  industry_id TEXT,
  tenant_id TEXT,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  extraction_instruction TEXT NOT NULL,
  enum_values TEXT,
  default_value TEXT,
  validation_rule TEXT,
  required INTEGER DEFAULT 1,
  override_mode TEXT DEFAULT 'replace',
  field_group TEXT DEFAULT 'component',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  field_aliases TEXT
);

-- Table: quote_templates
CREATE TABLE quote_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'Default',
  is_default INTEGER DEFAULT 0,
  source_pdf_r2_key TEXT,
  layout_dna TEXT NOT NULL,
  affirmed INTEGER DEFAULT 0,
  affirmed_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- Table: quotes
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  project_id TEXT,
  html_content TEXT,
  status TEXT DEFAULT 'draft',
  share_token TEXT,
  shared_at TEXT,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TEXT,
  signature_name TEXT,
  accepted_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Table: schedule_region_candidates
CREATE TABLE schedule_region_candidates (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  schedule_type TEXT NOT NULL,
  detection_confidence REAL,
  bounding_box TEXT NOT NULL,
  bounding_box_percent TEXT,
  detection_hints_found TEXT,
  row_count_estimate INTEGER,
  detection_notes TEXT,
  detection_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  affirmed_by TEXT,
  affirmed_at TEXT,
  rejection_reason TEXT,
  user_adjusted_bounding_box TEXT,
  extraction_job_id TEXT,
  extraction_started_at TEXT,
  extraction_completed_at TEXT,
  extraction_entry_count INTEGER,
  extraction_error TEXT,
  preview_image_key TEXT,
  detected_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  tenant_id TEXT,
  extraction_dpi INTEGER DEFAULT 600
, parse_order INTEGER, user_notes TEXT, cross_ref TEXT, review_status TEXT DEFAULT 'ok', conflict_reason TEXT);

-- Table: schema_version
CREATE TABLE schema_version (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL,
  description TEXT
);

-- Table: service_hooks
CREATE TABLE service_hooks (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL DEFAULT 'outbound',
  event TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  secret TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_delivery TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}'
);

-- Table: session_affirm_status
CREATE TABLE session_affirm_status (
  session_id TEXT PRIMARY KEY,
  total_groups INTEGER DEFAULT 0,
  affirmed_groups INTEGER DEFAULT 0,
  total_components INTEGER DEFAULT 0,
  affirmed_components INTEGER DEFAULT 0,
  all_affirmed INTEGER DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now'))
);

-- Table: session_cut_sheet_matches
CREATE TABLE session_cut_sheet_matches (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  cut_sheet_id TEXT NOT NULL,
  matched_manufacturer TEXT,
  matched_model TEXT,
  match_type TEXT,
  confidence REAL,
  status TEXT DEFAULT 'matched',
  reviewed_by TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  product_document_id TEXT
);

-- Table: session_nomenclature
CREATE TABLE session_nomenclature (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  hardware_unit_term TEXT DEFAULT 'set',
  door_identifier_term TEXT DEFAULT 'door',
  detected_from_page INTEGER,
  user_override BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: session_readiness
CREATE TABLE session_readiness (
  session_id TEXT PRIMARY KEY,
  readiness_score REAL,
  readiness_status TEXT,
  total_components INTEGER DEFAULT 0,
  components_with_cut_sheets INTEGER DEFAULT 0,
  cut_sheet_coverage_pct REAL,
  extraction_complete BOOLEAN DEFAULT 0,
  extraction_approved BOOLEAN DEFAULT 0,
  discovery_triggered BOOLEAN DEFAULT 0,
  discovery_complete BOOLEAN DEFAULT 0,
  all_cut_sheets_verified BOOLEAN DEFAULT 0,
  pdf_assembled BOOLEAN DEFAULT 0,
  pending_discoveries INTEGER DEFAULT 0,
  failed_discoveries INTEGER DEFAULT 0,
  pending_approvals INTEGER DEFAULT 0,
  calculated_at DATETIME DEFAULT (datetime('now')),
  last_action_at DATETIME
);

-- Table: submittal_certifications
CREATE TABLE submittal_certifications (
  id TEXT PRIMARY KEY,
  submittal_id TEXT NOT NULL,
  certified INTEGER DEFAULT 0,
  certified_by TEXT,
  certified_at TEXT,
  professional_name TEXT,
  license_number TEXT,
  license_state TEXT,
  certification_statement TEXT,
  signature TEXT,
  unverified_sheets_at_cert INTEGER DEFAULT 0,
  validation_passed INTEGER DEFAULT 0,
  validation_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: submittal_cut_sheets
CREATE TABLE submittal_cut_sheets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  submittal_id TEXT NOT NULL,
  hardware_set_id TEXT,
  component_id TEXT,
  product_document_id TEXT,
  match_confidence REAL,
  match_method TEXT,
  page_order INTEGER,
  included INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: submittals
CREATE TABLE submittals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  input_file_key TEXT,
  output_file_key TEXT,
  extracted_data TEXT,
  product_recommendations TEXT,
  modifications TEXT,
  door_count INTEGER,
  token_usage INTEGER,
  processing_time_seconds INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  approved_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT DEFAULT NULL,
  original_filename TEXT,
  file_buffer_key TEXT,
  auto_retry_enabled INTEGER DEFAULT 1,
  max_retry_attempts INTEGER DEFAULT 3,
  version INTEGER DEFAULT 1
);

-- Table: sysadmin_users
CREATE TABLE sysadmin_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  granted_by TEXT,
  granted_at TEXT DEFAULT (datetime('now')),
  revoked_at TEXT,
  notes TEXT
);

-- Table: takeoff_line_items
CREATE TABLE takeoff_line_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  spec_type TEXT,
  size TEXT,
  material TEXT,
  finish TEXT,
  rating TEXT,
  quantity INTEGER DEFAULT 1,
  uom TEXT DEFAULT 'EA',
  unit_price REAL,
  notes TEXT,
  taxable INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: takeoff_quotes
CREATE TABLE takeoff_quotes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  quote_number INTEGER NOT NULL,
  project_id TEXT,
  subtotal REAL,
  tax_rate REAL,
  taxable_amount REAL,
  tax_amount REAL,
  grand_total REAL,
  line_item_snapshot TEXT,
  settings_snapshot TEXT,
  r2_key TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  access_token TEXT,
  shared_at TEXT,
  first_viewed_at TEXT,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TEXT,
  accepted_at TEXT,
  accepted_by TEXT,
  signature_r2_key TEXT,
  acceptance_ip TEXT,
  acceptance_user_agent TEXT
);

-- Table: takeoff_settings
CREATE TABLE takeoff_settings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  template_version TEXT DEFAULT 'v1',
  show_unit_prices INTEGER DEFAULT 1,
  show_extended_prices INTEGER DEFAULT 1,
  grouping_mode TEXT DEFAULT 'by_set',
  tax_rate REAL DEFAULT 0.0,
  tax_jurisdiction TEXT,
  validity_days INTEGER DEFAULT 30,
  exclusions_text TEXT,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  logo_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  include_addendum INTEGER DEFAULT 0
);

-- Table: undo_stack
CREATE TABLE undo_stack (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table: usage_logs
CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  submittal_id TEXT,
  action TEXT NOT NULL,
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  api_calls INTEGER DEFAULT 1,
  estimated_cost REAL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

-- Table: user_affirmed_cutsheets
CREATE TABLE user_affirmed_cutsheets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  component_hash TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  catalogue_id TEXT,
  page_start INTEGER,
  page_end INTEGER,
  r2_bucket TEXT DEFAULT 'subx-uploads',
  r2_key TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'image/png',
  trade TEXT DEFAULT 'doors',
  affirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  affirmed_by TEXT NOT NULL,
  notes TEXT,
  metadata_json TEXT
);

-- Table: verification_flags
CREATE TABLE verification_flags (
  id TEXT PRIMARY KEY,
  verification_run_id TEXT NOT NULL,
  layer_result_id TEXT,
  layer TEXT NOT NULL,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  door_mark TEXT,
  hardware_group TEXT,
  field TEXT,
  message TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  building_code_reference TEXT,
  created_at TEXT NOT NULL,
  resolved INTEGER DEFAULT 0,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_notes TEXT
);

-- Table: verification_runs
CREATE TABLE verification_runs (
  id TEXT PRIMARY KEY,
  submittal_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  composite_score REAL NOT NULL,
  overall_status TEXT NOT NULL,
  total_execution_time_ms INTEGER,
  submittal_data_hash TEXT,
  hardware_schedule_hash TEXT,
  rule_database_version TEXT,
  cloudflare_worker_version TEXT,
  claude_model TEXT,
  d1_database_version TEXT
);

-- Table: projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  project_type TEXT DEFAULT 'DOORS',
  status TEXT DEFAULT 'active',
  client_name TEXT,
  client_address TEXT,
  client_contact_name TEXT,
  client_contact_email TEXT,
  client_contact_phone TEXT,
  billing_name TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  ap_contact TEXT,
  resale_number TEXT,
  project_address TEXT,
  dsa_number TEXT,
  architect TEXT,
  contractor TEXT,
  external_project_ref TEXT,
  metadata TEXT,
  notes TEXT,
  metadata_affirmed INTEGER DEFAULT 0,
  metadata_affirmed_at TEXT,
  metadata_affirmed_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  created_by TEXT,
  user_id TEXT,
  project_number TEXT
);

-- Table: sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_activity_at TEXT DEFAULT (datetime('now'))
);

-- Table: vendor_profile
CREATE TABLE vendor_profile (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  logo_url TEXT,
  shipping_address TEXT,
  resale_number TEXT,
  ap_contact TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  user_id TEXT
, affirmed INTEGER DEFAULT 0, affirmed_at TEXT, affirmed_by TEXT);

-- Table: users
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT, name TEXT NOT NULL DEFAULT '', company TEXT, tenant_id TEXT, subscription_tier TEXT DEFAULT 'enterprise', subscription_status TEXT DEFAULT 'active', submittals_used INTEGER DEFAULT 0, submittals_limit INTEGER DEFAULT 999, trial_ends_at TEXT, stripe_customer_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), products_enabled TEXT DEFAULT '');
-- products_enabled: comma-separated standalone product slugs (e.g. "cutsheetx,takeoffx")
-- granted independent of subscription_tier='subconp' (which implies all products).
-- Checked by requireProductAccess() in weyland.worker.js.

-- Table: install_device_auth
CREATE TABLE install_device_auth (
  device_code      TEXT PRIMARY KEY,
  user_code        TEXT NOT NULL,
  mhs_id           TEXT,
  hostname         TEXT,
  agent_label      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  bridge_token     TEXT,
  approved_by      TEXT,
  approved_at      TEXT,
  ip_at_init       TEXT,
  ip_at_approve    TEXT,
  ua_at_init       TEXT,
  expires_at       TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  consumed_at      TEXT
);

-- Table: catalogue_pages_fts
CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text_content, content='catalogue_pages', content_rowid='rowid');

-- Table: kdp_packets
CREATE TABLE kdp_packets (id TEXT PRIMARY KEY, connection_id TEXT NOT NULL, candidate_id TEXT, page_number INTEGER, sequence INTEGER, unit_type TEXT DEFAULT 'hardware_set', job_id TEXT, route TEXT, provider_path TEXT, owner_id TEXT, state TEXT NOT NULL DEFAULT 'in_flight', attempts INTEGER DEFAULT 1, groups_count INTEGER, components_count INTEGER, checksum_confidence REAL, error TEXT, delivered_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), project_id TEXT);
-- Table: access_requests
CREATE TABLE access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  role TEXT,
  trade TEXT NOT NULL CHECK (trade IN ('doors_glazing', 'plumbing', 'hvac', 'electrical', 'other')),
  trade_other TEXT,
  message TEXT,
  source TEXT,
  venture_code TEXT NOT NULL DEFAULT 'weyland',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'denied')),
  approved_by TEXT,
  approved_at TEXT,
  invited_mhs_id TEXT,
  request_ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Table: annotation_view_grants
CREATE TABLE annotation_view_grants (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, grantee_id TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT, UNIQUE(owner_id, grantee_id));

-- Table: catalogue_coverage
CREATE TABLE catalogue_coverage (
  slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  parent_group TEXT,
  category TEXT,
  priority INTEGER DEFAULT 3,
  book_status TEXT DEFAULT 'not_attempted',
  edition_label TEXT,
  edition_year INTEGER,
  source_url TEXT,
  rows_parsed INTEGER DEFAULT 0,
  variants_active INTEGER DEFAULT 0,
  parser_class TEXT,
  last_swept_at TEXT,
  last_outcome TEXT,
  notes TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
, trade TEXT DEFAULT 'div08_openings', csi_division TEXT DEFAULT '08', manufacturer_id TEXT);

-- Table: catalogue_page_annotations
CREATE TABLE catalogue_page_annotations (annotation_id TEXT PRIMARY KEY, catalogue_id TEXT NOT NULL, page_num TEXT NOT NULL, shape TEXT NOT NULL, color TEXT NOT NULL, geometry TEXT NOT NULL, stroke_width REAL, author TEXT, author_id TEXT, created_at TEXT, updated_at TEXT);

-- Table: catalogue_trigram_fts
CREATE VIRTUAL TABLE catalogue_trigram_fts USING fts5(
    catalogue_id,
    page_num,
    search_text,
    tokenize='trigram'
);

-- Table: cps_gaps
CREATE TABLE cps_gaps (
  id TEXT PRIMARY KEY,
  component_id TEXT,
  session_id TEXT,  -- PROVENANCE: the session that first surfaced this gap. Not a key, not a filter.
  manufacturer_raw TEXT,
  manufacturer_slug TEXT,
  model TEXT,
  missing TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  opened_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  routed_path TEXT,
  closed_at TEXT,
  closed_method TEXT,
  closure_ref TEXT
);

-- Table: manufacturer_aliases
CREATE TABLE manufacturer_aliases (
  alias TEXT NOT NULL,
  manufacturer_id TEXT NOT NULL REFERENCES manufacturers(id),
  source TEXT DEFAULT 'industry_standard',
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (alias)
);

-- Table: product_cert_claims
CREATE TABLE product_cert_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  column_name TEXT NOT NULL,
  value TEXT NOT NULL,
  catalogue_id TEXT NOT NULL,
  page_num INTEGER NOT NULL,
  binding_kind TEXT NOT NULL,
  listing_type TEXT,
  evidence_snippet TEXT,
  rollup_status TEXT NOT NULL DEFAULT 'evidence',
  mined_at TEXT NOT NULL,
  affirmed_by TEXT,
  UNIQUE(product_id, column_name, catalogue_id, page_num, value)
);

-- Table: product_option_constraints
CREATE TABLE product_option_constraints (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  natural_key      TEXT    NOT NULL UNIQUE,
  manufacturer_id  TEXT    NOT NULL,
  scope_kind       TEXT    NOT NULL,          -- exact-model | series | page-ambient
  scope_ref        TEXT,                      -- model or series ref; NULL for page-ambient
  constraint_kind  TEXT    NOT NULL,          -- excludes | requires | not_offered_on
  left_token       TEXT,
  right_token      TEXT,                      -- NULL for unary claims
  left_group       TEXT,
  right_group      TEXT,
  catalogue_id     TEXT    NOT NULL,
  page_num         INTEGER NOT NULL,          -- 1-based PDF index, /render-compatible
  evidence_snippet TEXT,                      -- <=200 chars, the printed sentence
  source_signal    TEXT,                      -- prose | na_cell | dash_cell | footnote
  confidence       REAL,
  dup_count        INTEGER DEFAULT 1,
  rollup_status    TEXT    NOT NULL DEFAULT 'evidence',   -- evidence | affirmed
  mined_by         TEXT,
  mined_at         TEXT    NOT NULL,
  affirmed_by      TEXT,
  affirmed_at      TEXT,
  created_at       TEXT    DEFAULT (datetime('now'))
);

-- Table: user_preferences
CREATE TABLE user_preferences (user_id TEXT PRIMARY KEY, prefs_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT);

CREATE UNIQUE INDEX idx_access_requests_email_venture ON access_requests(email, venture_code);

CREATE INDEX idx_access_requests_status ON access_requests(status);

CREATE INDEX idx_access_requests_trade ON access_requests(trade);

CREATE INDEX idx_avg_grantee ON annotation_view_grants(grantee_id, revoked_at);

CREATE INDEX idx_cpa_page ON catalogue_page_annotations (catalogue_id, page_num);

CREATE INDEX idx_cps_gaps_manufacturer_slug ON cps_gaps(manufacturer_slug);

CREATE UNIQUE INDEX idx_cps_gaps_open ON cps_gaps(component_id, missing) WHERE status <> 'closed';

CREATE INDEX idx_cps_gaps_status ON cps_gaps(status);

CREATE INDEX idx_pcc_product ON product_cert_claims(product_id, rollup_status);

CREATE INDEX idx_poc_lookup
  ON product_option_constraints (manufacturer_id, rollup_status, left_token);
