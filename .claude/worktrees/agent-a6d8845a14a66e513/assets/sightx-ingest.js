(function () {
  'use strict';

  const SCHEMA = 'weyland.sightx.site-genome.v1';
  const TEXT_LIMIT = 16 * 1024 * 1024;
  const ADAPTER_TYPES = new Set(['glb', 'laz', 'e57', 'rvt', 'dwg', 'dxf', 'fbx', 'step', 'stp']);
  const MIME_BY_EXTENSION = Object.freeze({
    csv: 'text/csv', ifc: 'application/x-step', obj: 'text/plain', gltf: 'model/gltf+json',
    glb: 'model/gltf-binary', las: 'application/vnd.las', laz: 'application/vnd.laszip',
    e57: 'model/e57', pdf: 'application/pdf', json: 'application/json', geojson: 'application/geo+json'
  });

  const finite = value => value !== null && value !== undefined && cleanText(value) !== '' && Number.isFinite(Number(value));
  const cleanText = value => String(value == null ? '' : value).trim();
  const slug = value => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'asset';
  const extensionOf = name => {
    const match = cleanText(name).toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  };

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  async function sha256(data) {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function mediaType(file, ext) {
    return file.type || MIME_BY_EXTENSION[ext] || 'application/octet-stream';
  }

  function classify(ext, type) {
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'heic', 'tif', 'tiff'].includes(ext) || type.startsWith('image/')) return 'image';
    if (['mp4', 'mov', 'webm', 'm4v'].includes(ext) || type.startsWith('video/')) return 'video';
    if (ext === 'csv') return 'asset-table';
    if (ext === 'ifc') return 'bim';
    if (ext === 'obj') return 'mesh';
    if (ext === 'gltf') return 'scene';
    if (ext === 'las' || ext === 'laz' || ext === 'e57') return 'point-cloud';
    if (ext === 'pdf') return 'document';
    if (ext === 'json' || ext === 'geojson') return 'structured-data';
    if (ADAPTER_TYPES.has(ext)) return 'geometry';
    return 'file';
  }

  function textFromBuffer(buffer, encoding = 'utf-8') {
    return new TextDecoder(encoding).decode(buffer.slice(0, TEXT_LIMIT));
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (char !== '\r') cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows.shift().map(value => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ''));
    return rows.filter(values => values.some(value => cleanText(value))).map(values => {
      const result = {};
      headers.forEach((header, index) => { if (header) result[header] = cleanText(values[index]); });
      return result;
    });
  }

  const aliases = Object.freeze({
    id: ['id', 'assetid', 'elementid', 'guid', 'uuid'],
    name: ['name', 'assetname', 'label', 'title'],
    type: ['type', 'assettype', 'category', 'class', 'ifcclass'],
    summary: ['summary', 'description', 'notes', 'scope'],
    x: ['x', 'positionx', 'centerx', 'coordx'],
    y: ['y', 'positiony', 'centery', 'coordy'],
    z: ['z', 'positionz', 'centerz', 'coordz'],
    dimensions: ['dimensions', 'dimension', 'size'],
    width: ['width', 'w'], height: ['height', 'h'], depth: ['depth', 'length', 'd'],
    material: ['material', 'finish'], hazard: ['hazard', 'risk', 'exception'],
    status: ['status', 'state'], tags: ['tags', 'labels']
  });

  function pick(row, key) {
    for (const alias of aliases[key] || []) if (cleanText(row[alias])) return cleanText(row[alias]);
    return '';
  }

  function dimensionsFromRow(row) {
    const supplied = pick(row, 'dimensions');
    if (supplied) return supplied;
    const parts = [['W', pick(row, 'width')], ['H', pick(row, 'height')], ['D', pick(row, 'depth')]].filter(([, value]) => value);
    return parts.length ? parts.map(([label, value]) => `${label} ${value}`).join(' x ') : null;
  }

  function parseCsv(text, sourceId, options) {
    const rows = parseCsvRows(text);
    const assets = rows.map((row, index) => {
      const coordinates = [pick(row, 'x'), pick(row, 'y'), pick(row, 'z')];
      const hasPosition = coordinates.every(finite);
      const rawId = pick(row, 'id') || `${pick(row, 'name') || 'row'}-${index + 1}`;
      return {
        id: `${sourceId}-${slug(rawId)}`,
        type: pick(row, 'type') || 'TABULAR ASSET',
        name: pick(row, 'name') || pick(row, 'id') || `Asset ${index + 1}`,
        summary: pick(row, 'summary') || 'Asset compiled from an explicit row in the supplied table.',
        dimensions: dimensionsFromRow(row),
        material: pick(row, 'material') || null,
        hazard: pick(row, 'hazard') || null,
        status: pick(row, 'status') || 'OBSERVED',
        tags: pick(row, 'tags') ? pick(row, 'tags').split(/[|;]/).map(cleanText).filter(Boolean) : [],
        spatial: hasPosition ? {
          position: coordinates.map(Number), units: options.units, coordinateSystem: options.coordinateSystem
        } : null,
        provenance: { method: 'csv-column-map', status: 'observed', confidence: 1, sourceRefs: [sourceId] }
      };
    });
    return {
      assets,
      observations: [{ type: 'table-shape', columns: rows[0] ? Object.keys(rows[0]) : [], rowCount: rows.length }],
      status: 'indexed'
    };
  }

  function parseIfc(text, sourceId) {
    const counts = {};
    for (const match of text.matchAll(/=\s*(IFC[A-Z0-9_]+)\s*\(/gi)) {
      const type = match[1].toUpperCase();
      counts[type] = (counts[type] || 0) + 1;
    }
    const supported = /#(\d+)\s*=\s*(IFC(?:DOOR|WINDOW|SPACE|WALL|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY))\s*\(([\s\S]*?)\);/gi;
    const assets = [];
    for (const match of text.matchAll(supported)) {
      if (assets.length >= 1000) break;
      const strings = [...match[3].matchAll(/'((?:''|[^'])*)'/g)].map(item => item[1].replace(/''/g, "'"));
      const entity = match[2].toUpperCase();
      const name = cleanText(strings[1]) || `${entity} #${match[1]}`;
      assets.push({
        id: `${sourceId}-ifc-${match[1]}`,
        type: entity,
        name,
        summary: cleanText(strings[2]) || `Explicit ${entity} entity compiled from IFC evidence; placement awaits a geometry adapter.`,
        dimensions: null, material: null, hazard: null, status: 'OBSERVED / UNLOCATED', tags: ['ifc'], spatial: null,
        provenance: { method: 'ifc-entity-index', status: 'observed', confidence: 1, sourceRefs: [sourceId] }
      });
    }
    return {
      assets,
      observations: [{ type: 'ifc-entity-counts', counts, indexedEntities: assets.length }],
      status: 'indexed',
      adapter: 'ifc-placement-and-geometry'
    };
  }

  function parseObj(text, sourceId, options) {
    let vertices = 0;
    let faces = 0;
    const objects = [];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith('v ')) {
        const values = line.trim().split(/\s+/).slice(1, 4).map(Number);
        if (values.length === 3 && values.every(Number.isFinite)) {
          vertices += 1;
          values.forEach((value, index) => { min[index] = Math.min(min[index], value); max[index] = Math.max(max[index], value); });
        }
      } else if (line.startsWith('f ')) faces += 1;
      else if (line.startsWith('o ') && objects.length < 100) objects.push(cleanText(line.slice(2)));
    }
    const bounded = vertices > 0 && min.every(Number.isFinite) && max.every(Number.isFinite);
    const center = bounded ? min.map((value, index) => (value + max[index]) / 2) : null;
    const size = bounded ? min.map((value, index) => max[index] - value) : null;
    const assets = bounded ? [{
      id: `${sourceId}-mesh`, type: 'OBJ MESH', name: objects[0] || 'Imported OBJ mesh',
      summary: `${vertices} explicit vertices and ${faces} faces indexed from source geometry.`,
      dimensions: `${size[0].toFixed(2)} W x ${size[1].toFixed(2)} H x ${size[2].toFixed(2)} D ${options.units}`,
      material: null, hazard: null, status: 'GEOMETRY INDEXED', tags: ['mesh', 'obj'],
      spatial: { position: center, units: options.units, coordinateSystem: options.coordinateSystem },
      radius: Math.max(...size) / 2,
      provenance: { method: 'obj-bounds', status: 'observed', confidence: 1, sourceRefs: [sourceId] }
    }] : [];
    return { assets, observations: [{ type: 'obj-geometry', vertices, faces, objects, bounds: bounded ? { min, max } : null }], status: 'indexed', adapter: 'obj-render-mesh' };
  }

  function parseGltf(text, sourceId, options) {
    const data = JSON.parse(text);
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const assets = [];
    nodes.slice(0, 1000).forEach((node, index) => {
      const hasTranslation = Array.isArray(node.translation) && node.translation.length >= 3 && node.translation.slice(0, 3).every(finite);
      if (!hasTranslation && !node.name) return;
      assets.push({
        id: `${sourceId}-node-${index}`, type: Number.isInteger(node.mesh) ? 'GLTF MESH NODE' : 'GLTF NODE',
        name: cleanText(node.name) || `glTF node ${index}`, summary: 'Node compiled from explicit glTF scene data.',
        dimensions: null, material: null, hazard: null, status: hasTranslation ? 'SPATIAL NODE' : 'OBSERVED / UNLOCATED', tags: ['gltf'],
        spatial: hasTranslation ? { position: node.translation.slice(0, 3).map(Number), units: options.units, coordinateSystem: options.coordinateSystem } : null,
        provenance: { method: 'gltf-node-index', status: 'observed', confidence: 1, sourceRefs: [sourceId] }
      });
    });
    return {
      assets,
      observations: [{ type: 'gltf-scene', scenes: (data.scenes || []).length, nodes: nodes.length, meshes: (data.meshes || []).length, materials: (data.materials || []).length }],
      status: 'indexed', adapter: 'gltf-render-scene'
    };
  }

  function readAscii(bytes, start, length) {
    return String.fromCharCode(...bytes.slice(start, start + length)).replace(/\0/g, '').trim();
  }

  function parseLas(buffer, sourceId, options) {
    if (buffer.byteLength < 227) throw new Error('LAS header is shorter than 227 bytes.');
    const bytes = new Uint8Array(buffer);
    if (readAscii(bytes, 0, 4) !== 'LASF') throw new Error('LASF signature not found.');
    const view = new DataView(buffer);
    const version = `${view.getUint8(24)}.${view.getUint8(25)}`;
    const scales = [view.getFloat64(131, true), view.getFloat64(139, true), view.getFloat64(147, true)];
    const offsets = [view.getFloat64(155, true), view.getFloat64(163, true), view.getFloat64(171, true)];
    const min = [view.getFloat64(187, true), view.getFloat64(203, true), view.getFloat64(219, true)];
    const max = [view.getFloat64(179, true), view.getFloat64(195, true), view.getFloat64(211, true)];
    const boundsValid = min.concat(max).every(Number.isFinite);
    const center = boundsValid ? min.map((value, index) => (value + max[index]) / 2) : null;
    const size = boundsValid ? min.map((value, index) => max[index] - value) : null;
    let points = view.getUint32(107, true);
    if (!points && buffer.byteLength >= 255 && typeof view.getBigUint64 === 'function') points = Number(view.getBigUint64(247, true));
    const assets = boundsValid ? [{
      id: `${sourceId}-bounds`, type: 'POINT CLOUD EXTENT', name: 'LAS survey extent',
      summary: `${points.toLocaleString()} point records declared by the LAS header.`,
      dimensions: `${size[0].toFixed(2)} x ${size[1].toFixed(2)} x ${size[2].toFixed(2)} ${options.units}`,
      material: null, hazard: null, status: 'HEADER INDEXED', tags: ['las', 'point-cloud'],
      spatial: { position: center, units: options.units, coordinateSystem: options.coordinateSystem }, radius: Math.max(...size) / 2,
      provenance: { method: 'las-header-bounds', status: 'observed', confidence: 1, sourceRefs: [sourceId] }
    }] : [];
    return {
      assets,
      observations: [{ type: 'las-header', version, systemIdentifier: readAscii(bytes, 26, 32), generatingSoftware: readAscii(bytes, 58, 32), points, pointFormat: view.getUint8(104) & 63, scales, offsets, bounds: boundsValid ? { min, max } : null }],
      status: 'indexed', adapter: 'las-point-stream'
    };
  }

  async function imageObservation(file) {
    if (!('createImageBitmap' in window)) return { type: 'image-metadata', dimensions: null };
    const bitmap = await createImageBitmap(file);
    const result = { type: 'image-metadata', width: bitmap.width, height: bitmap.height, megapixels: Number((bitmap.width * bitmap.height / 1000000).toFixed(2)) };
    bitmap.close();
    return result;
  }

  function parseJson(text, sourceId, options) {
    const data = JSON.parse(text);
    if (data && data.schema === SCHEMA && Array.isArray(data.assets)) {
      const assets = data.assets.map((asset, index) => ({
        ...asset,
        id: `${sourceId}-import-${slug(asset.id || index + 1)}`,
        provenance: {
          method: 'site-genome-import', status: asset.provenance?.status || 'observed',
          confidence: Number.isFinite(asset.provenance?.confidence) ? asset.provenance.confidence : 1,
          sourceRefs: [sourceId], upstreamPackageId: data.packageId || null,
          upstreamSourceRefs: Array.isArray(asset.provenance?.sourceRefs) ? asset.provenance.sourceRefs : []
        }
      }));
      return { assets, observations: [{ type: 'site-genome-import', packageId: data.packageId || null, assetCount: assets.length }], status: 'indexed' };
    }
    if (Array.isArray(data.nodes) || Array.isArray(data.meshes) || data.asset?.version) return parseGltf(text, sourceId, options);
    return { assets: [], observations: [{ type: 'json-shape', topLevel: Array.isArray(data) ? 'array' : typeof data, keys: data && !Array.isArray(data) ? Object.keys(data).slice(0, 100) : [] }], status: 'metadata-only', adapter: 'structured-data-mapper' };
  }

  async function extract(file, buffer, sourceId, ext, kind, options) {
    if (ext === 'csv') return parseCsv(textFromBuffer(buffer), sourceId, options);
    if (ext === 'ifc') return parseIfc(textFromBuffer(buffer), sourceId);
    if (ext === 'obj') return parseObj(textFromBuffer(buffer), sourceId, options);
    if (ext === 'gltf') return parseGltf(textFromBuffer(buffer), sourceId, options);
    if (ext === 'las') return parseLas(buffer, sourceId, options);
    if (ext === 'json' || ext === 'geojson') return parseJson(textFromBuffer(buffer), sourceId, options);
    if (kind === 'image') return { assets: [], observations: [await imageObservation(file)], status: 'metadata-only', adapter: 'vision-and-photogrammetry' };
    if (ext === 'pdf') {
      const text = textFromBuffer(buffer, 'iso-8859-1');
      const pageCount = (text.match(/\/Type\s*\/Page\b/g) || []).length;
      return { assets: [], observations: [{ type: 'pdf-metadata', pageCount }], status: 'metadata-only', adapter: 'pdf-layout-and-drawing' };
    }
    return { assets: [], observations: [{ type: 'file-metadata', note: 'Source preserved without semantic extraction.' }], status: 'metadata-only', adapter: ADAPTER_TYPES.has(ext) ? `${ext}-geometry-adapter` : 'content-adapter' };
  }

  async function inspectFile(file, index, options) {
    const buffer = await file.arrayBuffer();
    const digest = await sha256(buffer);
    const sourceId = `src-${digest.slice(0, 16)}`;
    const ext = extensionOf(file.name);
    const type = mediaType(file, ext);
    const kind = classify(ext, type);
    const source = {
      id: sourceId,
      path: cleanText(file.webkitRelativePath || file.name) || `source-${index + 1}`,
      name: cleanText(file.name) || `source-${index + 1}`,
      extension: ext || null,
      mediaType: type,
      kind,
      bytes: file.size,
      modifiedAt: Number.isFinite(file.lastModified) && file.lastModified > 0 ? new Date(file.lastModified).toISOString() : null,
      sha256: digest,
      status: 'pending',
      observations: [],
      adapter: null
    };
    try {
      const result = await extract(file, buffer, sourceId, ext, kind, options);
      source.status = result.status;
      source.observations = result.observations || [];
      source.adapter = result.adapter || null;
      return { source, assets: result.assets || [], hypotheses: result.hypotheses || [] };
    } catch (error) {
      source.status = 'metadata-only';
      source.adapter = `${kind}-adapter`;
      source.observations = [{ type: 'extraction-error', message: cleanText(error.message || error) }];
      return { source, assets: [], hypotheses: [] };
    }
  }

  async function compileFiles(files, suppliedOptions = {}) {
    const options = {
      siteName: cleanText(suppliedOptions.siteName) || 'Untitled Site',
      coordinateSystem: suppliedOptions.coordinateSystem === 'site-local' ? 'site-local' : 'source-unmapped',
      units: suppliedOptions.units === 'ft' ? 'ft' : 'm',
      createdAt: suppliedOptions.createdAt || new Date().toISOString()
    };
    const inputs = Array.from(files || []);
    if (!inputs.length) throw new Error('At least one source file is required.');
    const sources = [];
    const assets = [];
    const hypotheses = [];
    for (let index = 0; index < inputs.length; index += 1) {
      if (suppliedOptions.onProgress) suppliedOptions.onProgress({ index, total: inputs.length, file: inputs[index] });
      const result = await inspectFile(inputs[index], index, options);
      sources.push(result.source);
      assets.push(...result.assets);
      hypotheses.push(...result.hypotheses);
    }
    const located = assets.filter(asset => asset.spatial?.coordinateSystem === 'site-local' && asset.spatial?.units === 'm' && Array.isArray(asset.spatial.position) && asset.spatial.position.every(finite)).length;
    const stableSeed = {
      schema: SCHEMA,
      site: { name: options.siteName, coordinateSystem: options.coordinateSystem, units: options.units },
      sources: sources.map(source => ({ path: source.path, sha256: source.sha256 })),
      assets
    };
    const packageDigest = await sha256(stableStringify(stableSeed));
    return {
      schema: SCHEMA,
      packageId: `sxg-${packageDigest.slice(0, 20)}`,
      packageSha256: packageDigest,
      createdAt: options.createdAt,
      compiler: { name: 'SightX Site Genome Compiler', version: '1.0.0', execution: 'browser-local' },
      site: { name: options.siteName, coordinateSystem: options.coordinateSystem, units: options.units },
      sources,
      assets,
      hypotheses,
      verificationQueue: [
        ...sources.filter(source => source.status !== 'indexed').map(source => ({ kind: 'source-hydration', sourceRef: source.id, adapter: source.adapter })),
        ...assets.filter(asset => !asset.spatial).map(asset => ({ kind: 'spatial-registration', assetRef: asset.id }))
      ],
      statistics: {
        sourceCount: sources.length,
        totalBytes: sources.reduce((sum, source) => sum + source.bytes, 0),
        assetCount: assets.length,
        locatedAssetCount: located,
        unlocatedAssetCount: assets.length - located,
        indexedSourceCount: sources.filter(source => source.status === 'indexed').length,
        metadataOnlySourceCount: sources.filter(source => source.status !== 'indexed').length
      },
      readiness: {
        semanticIndex: assets.length > 0 ? 'ready' : 'source-only',
        playableTwin: located > 0 ? 'ready' : 'awaiting-site-local-coordinates',
        geometry: sources.some(source => source.adapter && /render|geometry|point/.test(source.adapter)) ? 'adapter-required' : 'not-supplied'
      }
    };
  }

  function sampleFiles() {
    const stamp = Date.UTC(2026, 6, 29, 12, 0, 0);
    const csv = [
      'id,name,type,x,y,z,width,height,material,hazard,status,tags,description',
      'S1,Main Entrance,Automatic Entrance,0,1.25,0,2.60,2.45,Aluminum and safety glass,Validate presence curtain,Commissioning Ready,opening|exterior,Primary sensor-driven entry assembly',
      'L2,Corridor Luminaire L2,Electrical Fixture,0,3.15,6,0.84,0.84,Aluminum and diffuse lens,Verify emergency circuit,Circuit Linked,electrical|interior,Area light linked to controls sequence',
      'AHU-1,Roof Air Handler,Mechanical Equipment,,,,3.20,2.10,Galvanized steel,Confirm service clearance,Observed,mechanical,Equipment schedule record awaiting spatial registration'
    ].join('\n');
    const ifc = [
      'ISO-10303-21;', 'HEADER;', "FILE_DESCRIPTION(('SightX sample shell'),'2;1');", 'ENDSEC;', 'DATA;',
      "#101=IFCDOOR('3n1F_sample',#1,'North Lab Door','Controlled opening from supplied IFC',#2,#3,'D101',2.35,1.36);",
      "#102=IFCSPACE('4n2F_sample',#1,'Materials Review Area','Programmed material review space',#2,#3,'MAT-01',.ELEMENT.,.INTERNAL.);",
      'ENDSEC;', 'END-ISO-10303-21;'
    ].join('\n');
    return [
      new File([csv], 'facility-assets.csv', { type: 'text/csv', lastModified: stamp }),
      new File([ifc], 'facility-shell.ifc', { type: 'application/x-step', lastModified: stamp })
    ];
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  function mount({ experience } = {}) {
    const root = document.createElement('section');
    root.id = 'sightx-ingest';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'SightX Site Genome Compiler');
    root.innerHTML = `
      <div class="sxi-shell">
        <header class="sxi-head"><div><small>SIGHTX / EVIDENCE INTAKE 01</small><h1>Site Genome Compiler</h1><p>Turn heterogeneous site evidence into one inspectable, provenance-preserving twin package.</p></div><button type="button" data-sxi-close>CLOSE</button></header>
        <div class="sxi-workspace">
          <section class="sxi-intake">
            <div class="sxi-fields">
              <label>SITE NAME<input data-sxi-site value="Weyland Facility 01" autocomplete="off"></label>
              <label>COORDINATE CONTRACT<select data-sxi-coordinates><option value="site-local">Site-local meters / hydrate playable twin</option><option value="source-unmapped">Preserve source coordinates / do not place</option></select></label>
            </div>
            <div class="sxi-drop" tabindex="0"><strong>DROP THE SITE HERE</strong><span>Photos, video, CSV, JSON, IFC, OBJ, glTF, LAS, PDFs, drawings, schedules, and folders.</span><div><label>SELECT FILES<input type="file" data-sxi-files multiple></label><label>SELECT FOLDER<input type="file" data-sxi-folder webkitdirectory multiple></label><button type="button" data-sxi-sample>LOAD VERIFIED SAMPLE</button></div></div>
            <div class="sxi-boundary"><b>EVIDENCE BOUNDARY</b><span>Coordinates are never guessed. IFC placement, point-cloud rendering, document layout, and visual inference remain explicit adapters until verified.</span></div>
            <div class="sxi-queue-head"><span>SOURCE QUEUE</span><b data-sxi-file-count>0 FILES</b></div>
            <div class="sxi-queue"><p>No evidence loaded.</p></div>
          </section>
          <aside class="sxi-output">
            <div class="sxi-pulse"><i></i><span>LOCAL COMPILER</span><b>NO UPLOAD</b></div>
            <div class="sxi-metrics"><span><small>SOURCES</small><b data-sxi-sources>0</b></span><span><small>ASSETS</small><b data-sxi-assets>0</b></span><span><small>LOCATED</small><b data-sxi-located>0</b></span><span><small>VERIFY</small><b data-sxi-verify>0</b></span></div>
            <div class="sxi-package"><small>PACKAGE</small><strong data-sxi-package>NOT COMPILED</strong><p data-sxi-status>Add evidence or load the sample package.</p></div>
            <ol class="sxi-pipeline"><li class="active">Hash and preserve sources</li><li>Extract explicit observations</li><li>Separate hypotheses</li><li>Hydrate verified spatial assets</li></ol>
            <div class="sxi-actions"><button type="button" data-sxi-compile disabled>COMPILE SITE GENOME</button><button type="button" data-sxi-hydrate disabled>LOAD INTO SIGHTX</button><button type="button" data-sxi-download disabled>DOWNLOAD JSON</button><button type="button" data-sxi-reset>RESET</button></div>
          </aside>
        </div>
      </div>`;
    document.body.appendChild(root);

    const state = { files: [], package: null, busy: false };
    const refs = {
      site: root.querySelector('[data-sxi-site]'), coordinates: root.querySelector('[data-sxi-coordinates]'),
      files: root.querySelector('[data-sxi-files]'), folder: root.querySelector('[data-sxi-folder]'),
      drop: root.querySelector('.sxi-drop'), queue: root.querySelector('.sxi-queue'),
      fileCount: root.querySelector('[data-sxi-file-count]'), sources: root.querySelector('[data-sxi-sources]'),
      assets: root.querySelector('[data-sxi-assets]'), located: root.querySelector('[data-sxi-located]'),
      verify: root.querySelector('[data-sxi-verify]'), package: root.querySelector('[data-sxi-package]'),
      status: root.querySelector('[data-sxi-status]'), compile: root.querySelector('[data-sxi-compile]'),
      hydrate: root.querySelector('[data-sxi-hydrate]'), download: root.querySelector('[data-sxi-download]')
    };

    function setStatus(message, tone = '') {
      refs.status.textContent = message;
      refs.status.dataset.tone = tone;
    }

    function renderQueue() {
      refs.queue.replaceChildren();
      refs.fileCount.textContent = `${state.files.length} FILE${state.files.length === 1 ? '' : 'S'}`;
      refs.compile.disabled = !state.files.length || state.busy;
      if (!state.files.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No evidence loaded.';
        refs.queue.appendChild(empty);
        return;
      }
      state.files.forEach(file => {
        const row = document.createElement('article');
        const ext = extensionOf(file.name) || 'FILE';
        const path = document.createElement('span');
        const meta = document.createElement('small');
        const kind = document.createElement('b');
        path.textContent = file.webkitRelativePath || file.name;
        meta.textContent = `${formatBytes(file.size)} / ${file.type || 'binary'}`;
        kind.textContent = ext.toUpperCase();
        row.append(kind, path, meta);
        refs.queue.appendChild(row);
      });
    }

    function addFiles(files, replace = false) {
      const next = replace ? [] : state.files.slice();
      const seen = new Set(next.map(file => `${file.webkitRelativePath || file.name}:${file.size}:${file.lastModified}`));
      Array.from(files || []).forEach(file => {
        const key = `${file.webkitRelativePath || file.name}:${file.size}:${file.lastModified}`;
        if (!seen.has(key)) { next.push(file); seen.add(key); }
      });
      state.files = next;
      state.package = null;
      refs.hydrate.disabled = true;
      refs.download.disabled = true;
      refs.package.textContent = 'NOT COMPILED';
      setStatus(`${state.files.length} source${state.files.length === 1 ? '' : 's'} ready for local compilation.`);
      renderQueue();
    }

    function renderPackage(compiled) {
      const stats = compiled.statistics;
      refs.sources.textContent = stats.sourceCount;
      refs.assets.textContent = stats.assetCount;
      refs.located.textContent = stats.locatedAssetCount;
      refs.verify.textContent = compiled.verificationQueue.length;
      refs.package.textContent = compiled.packageId;
      refs.hydrate.disabled = stats.locatedAssetCount === 0 || !experience;
      refs.download.disabled = false;
      setStatus(`${stats.indexedSourceCount}/${stats.sourceCount} sources semantically indexed; ${stats.locatedAssetCount} assets are playable.`, 'success');
    }

    async function compileCurrent() {
      if (!state.files.length || state.busy) return null;
      state.busy = true;
      refs.compile.disabled = true;
      refs.hydrate.disabled = true;
      refs.download.disabled = true;
      try {
        state.package = await compileFiles(state.files, {
          siteName: refs.site.value,
          coordinateSystem: refs.coordinates.value,
          units: 'm',
          onProgress: ({ index, total, file }) => setStatus(`Hashing and extracting ${index + 1}/${total}: ${file.name}`)
        });
        renderPackage(state.package);
        return state.package;
      } catch (error) {
        state.package = null;
        setStatus(`Compilation stopped: ${cleanText(error.message || error)}`, 'error');
        throw error;
      } finally {
        state.busy = false;
        refs.compile.disabled = !state.files.length;
      }
    }

    function hydrate() {
      if (!state.package || !experience) return null;
      const result = experience.registerTargets(state.package.assets, state.package);
      setStatus(`${result.located} assets loaded into the playable twin; ${result.unlocated} preserved for verification.`, 'success');
      return result;
    }

    function download() {
      if (!state.package) return;
      const blob = new Blob([JSON.stringify(state.package, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${slug(state.package.site.name)}-${state.package.packageId}.sightx.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    function reset() {
      state.files = [];
      state.package = null;
      refs.files.value = '';
      refs.folder.value = '';
      refs.sources.textContent = '0'; refs.assets.textContent = '0'; refs.located.textContent = '0'; refs.verify.textContent = '0';
      refs.package.textContent = 'NOT COMPILED'; refs.hydrate.disabled = true; refs.download.disabled = true;
      setStatus('Add evidence or load the sample package.');
      renderQueue();
    }

    function toggle(force) {
      const open = force === undefined ? root.hidden : Boolean(force);
      root.hidden = !open;
      document.body.classList.toggle('sx-ingest-open', open);
      if (experience?.setInteractionEnabled) experience.setInteractionEnabled(!open);
      if (open) setTimeout(() => refs.site.focus(), 0);
      return open;
    }

    refs.files.addEventListener('change', event => addFiles(event.target.files));
    refs.folder.addEventListener('change', event => addFiles(event.target.files));
    for (const eventName of ['dragenter', 'dragover']) refs.drop.addEventListener(eventName, event => { event.preventDefault(); refs.drop.classList.add('dragging'); });
    for (const eventName of ['dragleave', 'drop']) refs.drop.addEventListener(eventName, event => { event.preventDefault(); refs.drop.classList.remove('dragging'); });
    refs.drop.addEventListener('drop', event => addFiles(event.dataTransfer.files));
    root.addEventListener('click', event => {
      if (event.target.closest('[data-sxi-close]')) toggle(false);
      if (event.target.closest('[data-sxi-sample]')) {
        refs.site.value = 'Weyland Facility 01'; refs.coordinates.value = 'site-local'; addFiles(sampleFiles(), true);
      }
      if (event.target.closest('[data-sxi-compile]')) compileCurrent().catch(() => {});
      if (event.target.closest('[data-sxi-hydrate]')) hydrate();
      if (event.target.closest('[data-sxi-download]')) download();
      if (event.target.closest('[data-sxi-reset]')) reset();
    });
    window.addEventListener('sightx:toggle-ingest', () => toggle());
    document.addEventListener('keydown', event => {
      const focused = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (event.code === 'Escape' && !root.hidden) { event.preventDefault(); toggle(false); return; }
      if (event.code === 'KeyI' && !focused && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); toggle(); }
    });

    return Object.freeze({
      toggle, addFiles, compile: compileCurrent, hydrate, reset,
      get package() { return state.package; },
      get files() { return state.files.slice(); },
      get root() { return root; }
    });
  }

  window.SightXSiteGenome = Object.freeze({ schema: SCHEMA, compileFiles, sampleFiles, mount });
}());
