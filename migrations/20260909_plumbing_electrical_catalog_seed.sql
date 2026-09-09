-- Real, sourced plumbing and electrical catalog seed (trade='plumbing' /
-- trade='electrical'). Every manufacturer and model number below is a real,
-- well-documented commercial/residential-crossover product line -- chosen
-- deliberately conservative (extremely well-known catalog items) over
-- precise-but-uncertain model numbers, same standard as "not fabricated"
-- applied to the original 101-entry door catalog. Optional fields left
-- NULL where exact certification numbers aren't confidently known, same
-- pattern the door catalog itself already uses (e.g. ul_listing_number).
-- See MULTI_TRADE_BID_SUPPORT.md.

INSERT OR IGNORE INTO manufacturers (id, name, slug, trade, active, verified) VALUES
  ('mfr-kohler', 'Kohler', 'kohler', 'plumbing', 1, 1),
  ('mfr-moen', 'Moen', 'moen', 'plumbing', 1, 1),
  ('mfr-sloan', 'Sloan Valve Company', 'sloan', 'plumbing', 1, 1),
  ('mfr-zurn', 'Zurn Industries', 'zurn', 'plumbing', 1, 1),
  ('mfr-watts', 'Watts Water Technologies', 'watts', 'plumbing', 1, 1),
  ('mfr-americanstandard', 'American Standard', 'american-standard', 'plumbing', 1, 1),
  ('mfr-bradley', 'Bradley Corporation', 'bradley', 'plumbing', 1, 1),
  ('mfr-aosmith', 'A. O. Smith', 'ao-smith', 'plumbing', 1, 1);

INSERT OR IGNORE INTO manufacturers (id, name, slug, trade, active, verified) VALUES
  ('mfr-squared', 'Square D (Schneider Electric)', 'square-d', 'electrical', 1, 1),
  ('mfr-eaton', 'Eaton', 'eaton', 'electrical', 1, 1),
  ('mfr-leviton', 'Leviton', 'leviton', 'electrical', 1, 1),
  ('mfr-hubbell', 'Hubbell', 'hubbell', 'electrical', 1, 1),
  ('mfr-lutron', 'Lutron Electronics', 'lutron', 'electrical', 1, 1);

-- Plumbing: fixtures, flush valves, backflow/pressure valves, water heaters, drainage
INSERT OR IGNORE INTO products
  (id, manufacturer_id, trade, product_series, product_family, base_model, display_name, description,
   category_level_1, category_level_2, category_level_3, ul_listed, ada_compliant, available, popular)
VALUES
  ('prod-koh-k3999', 'mfr-kohler', 'plumbing', 'Wellworth', 'toilets', 'K-3999', 'Kohler Wellworth Two-Piece Toilet',
   'Two-piece elongated toilet, 1.28 gpf, ADA comfort height.', 'Fixtures', 'Toilets', 'Two-Piece', 0, 1, 1, 1),
  ('prod-koh-k2032', 'mfr-kohler', 'plumbing', 'Ladena', 'lavatories', 'K-2032', 'Kohler Ladena Wall-Mount Lavatory',
   'Wall-mount vitreous china lavatory sink, ADA-compliant clearance when installed per spec.', 'Fixtures', 'Lavatories', 'Wall-Mount', 0, 1, 1, 1),
  ('prod-amst-cadet3', 'mfr-americanstandard', 'plumbing', 'Cadet 3', 'toilets', 'Cadet 3', 'American Standard Cadet 3 Toilet',
   'Two-piece elongated toilet, 1.28/1.6 gpf, PowerWash rim.', 'Fixtures', 'Toilets', 'Two-Piece', 0, 1, 1, 1),
  ('prod-moen-8801', 'mfr-moen', 'plumbing', 'M-Power', 'faucets', '8801', 'Moen M-Power Sensor-Operated Faucet',
   'Battery/AC sensor-operated commercial lavatory faucet.', 'Fixtures', 'Faucets', 'Sensor-Operated', 1, 1, 1, 0),
  ('prod-sloan-royal111', 'mfr-sloan', 'plumbing', 'Royal', 'flush_valves', 'Royal 111', 'Sloan Royal 111 Flushometer',
   'Exposed manual diaphragm flushometer for water closets, 1.6 gpf.', 'Valves', 'Flush Valves', 'Manual', 1, 0, 1, 1),
  ('prod-sloan-regal111', 'mfr-sloan', 'plumbing', 'Regal', 'flush_valves', 'Regal 111', 'Sloan Regal 111 Flushometer',
   'Exposed manual diaphragm flushometer, water closet.', 'Valves', 'Flush Valves', 'Manual', 1, 0, 1, 0),
  ('prod-zurn-z6000', 'mfr-zurn', 'plumbing', 'AquaSense/AquaFlush', 'flush_valves', 'Z6000', 'Zurn Z6000 Series Flush Valve',
   'Manual/sensor exposed flushometer, water closet and urinal variants.', 'Valves', 'Flush Valves', 'Manual', 1, 0, 1, 0),
  ('prod-watts-909', 'mfr-watts', 'plumbing', '909', 'backflow_preventers', '909', 'Watts 909 Reduced Pressure Zone Backflow Preventer',
   'RPZ backflow preventer for high-hazard cross-connection control, commonly used on fire and domestic water services.', 'Valves', 'Backflow Preventers', 'RPZ', 1, 0, 1, 1),
  ('prod-watts-n55', 'mfr-watts', 'plumbing', 'N55', 'pressure_reducing_valves', 'N55', 'Watts N55 Water Pressure Reducing Valve',
   'Lead-free water pressure reducing valve for domestic water service entry.', 'Valves', 'Pressure Reducing', 'Direct-Acting', 0, 0, 1, 1),
  ('prod-zurn-z1231', 'mfr-zurn', 'plumbing', 'Z1200', 'floor_drains', 'Z1231', 'Zurn Z1231 Floor Drain',
   'Cast iron floor drain with adjustable strainer head, general-purpose interior drainage.', 'Drainage', 'Floor Drains', 'Cast Iron', 0, 0, 1, 0),
  ('prod-bradley-verge', 'mfr-bradley', 'plumbing', 'Verge', 'lavatory_systems', 'Verge', 'Bradley Verge Lavatory System',
   'Multi-station washbasin system for commercial restrooms.', 'Fixtures', 'Lavatories', 'Multi-Station', 0, 1, 1, 0),
  ('prod-aosmith-bth', 'mfr-aosmith', 'plumbing', 'BTH', 'water_heaters', 'BTH', 'A.O. Smith BTH Commercial Gas Water Heater',
   'High-efficiency commercial gas-fired water heater.', 'Mechanical', 'Water Heaters', 'Gas-Fired', 1, 0, 1, 0);

-- Electrical: breakers, panelboards, wiring devices, lighting controls
INSERT OR IGNORE INTO products
  (id, manufacturer_id, trade, product_series, product_family, base_model, display_name, description,
   category_level_1, category_level_2, category_level_3, ul_listed, ada_compliant, available, popular)
VALUES
  ('prod-sqd-qo120', 'mfr-squared', 'electrical', 'QO', 'circuit_breakers', 'QO120', 'Square D QO 20A Single-Pole Breaker',
   'Plug-on single-pole miniature circuit breaker, 20A, QO series load centers.', 'Distribution', 'Circuit Breakers', 'Single-Pole', 1, 0, 1, 1),
  ('prod-sqd-hom120', 'mfr-squared', 'electrical', 'Homeline', 'circuit_breakers', 'HOM120', 'Square D Homeline 20A Single-Pole Breaker',
   'Plug-on single-pole breaker for Homeline load centers.', 'Distribution', 'Circuit Breakers', 'Single-Pole', 1, 0, 1, 1),
  ('prod-sqd-iline', 'mfr-squared', 'electrical', 'I-Line', 'panelboards', 'I-Line', 'Square D I-Line Panelboard',
   'Bus-bar-style distribution panelboard for commercial/industrial applications.', 'Distribution', 'Panelboards', 'Bus-Bar', 1, 0, 1, 0),
  ('prod-eaton-br120', 'mfr-eaton', 'electrical', 'BR', 'circuit_breakers', 'BR120', 'Eaton BR 20A Single-Pole Breaker',
   'Plug-on single-pole breaker for BR-series residential load centers.', 'Distribution', 'Circuit Breakers', 'Single-Pole', 1, 0, 1, 1),
  ('prod-eaton-ch150', 'mfr-eaton', 'electrical', 'CH', 'circuit_breakers', 'CH150', 'Eaton CH 50A Single-Pole Breaker',
   'Plug-on single-pole breaker, CH-series load centers.', 'Distribution', 'Circuit Breakers', 'Single-Pole', 1, 0, 1, 0),
  ('prod-eaton-powrline', 'mfr-eaton', 'electrical', 'Pow-R-Line', 'panelboards', 'Pow-R-Line', 'Eaton Pow-R-Line Panelboard',
   'Commercial/industrial distribution panelboard line.', 'Distribution', 'Panelboards', 'Bus-Bar', 1, 0, 1, 0),
  ('prod-lev-decora5325', 'mfr-leviton', 'electrical', 'Decora', 'receptacles', '5325', 'Leviton Decora 20A Tamper-Resistant Duplex Receptacle',
   'Decora-style tamper-resistant duplex receptacle, 20A/125V.', 'Devices', 'Receptacles', 'Duplex', 1, 0, 1, 1),
  ('prod-lev-gfnt1', 'mfr-leviton', 'electrical', 'SmartlockPro', 'receptacles', 'GFNT1', 'Leviton SmartlockPro GFCI Receptacle',
   'Self-test GFCI duplex receptacle, tamper-resistant, 15A/125V.', 'Devices', 'Receptacles', 'GFCI', 1, 0, 1, 1),
  ('prod-hub-hospitalgrade', 'mfr-hubbell', 'electrical', 'Hospital Grade', 'receptacles', 'HBL8300 Series', 'Hubbell Hospital Grade Duplex Receptacle',
   'Hospital-grade duplex receptacle, 20A/125V, meets UL 498 hospital-grade requirements for patient care areas.', 'Devices', 'Receptacles', 'Hospital Grade', 1, 0, 1, 0),
  ('prod-lutron-caseta', 'mfr-lutron', 'electrical', 'Caseta', 'dimmers', 'PD-6WCL', 'Lutron Caseta In-Wall Dimmer',
   'Wireless in-wall dimmer for dimmable LED/incandescent/halogen, app/remote controllable.', 'Devices', 'Lighting Controls', 'Dimmer', 1, 0, 1, 1),
  ('prod-lutron-maestro', 'mfr-lutron', 'electrical', 'Maestro', 'dimmers', 'MA-600', 'Lutron Maestro 600W Dimmer',
   'Single-pole/3-way wall dimmer switch, 600W incandescent/halogen rating.', 'Devices', 'Lighting Controls', 'Dimmer', 1, 0, 1, 1);
