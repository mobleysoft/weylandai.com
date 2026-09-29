var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../book2film.cc/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");

// ../../book2film.cc/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../book2film.cc/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance2)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance2)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance2, key, desc);
      }
    }
  }
}
globalThis.performance = performance2;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../book2film.cc/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../book2film.cc/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../book2film.cc/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../book2film.cc/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../book2film.cc/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../book2film.cc/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../book2film.cc/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../book2film.cc/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// node_modules/@hyzyla/pdfium/dist/index.esm.browser.js
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve2) {
      resolve2(value);
    });
  }
  __name(adopt, "adopt");
  return new (P || (P = Promise))(function(resolve2, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    __name(fulfilled, "fulfilled");
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    __name(rejected, "rejected");
    function step(result) {
      result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    __name(step, "step");
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
__name(__awaiter, "__awaiter");
var BYTES_PER_PIXEL = 4;
var FPDFErrorCode = {
  UNKNOWN: 1,
  // Unknown error.
  FILE: 2,
  // File not found or could not be opened.
  FORMAT: 3,
  // File not in PDF format or corrupted.
  PASSWORD: 4,
  // Password required or incorrect password.
  SECURITY: 5,
  // Unsupported security scheme.
  PAGE: 6
  // Page not found or content error.
};
var FPDFBitmap = {
  Unknown: 0,
  Gray: 1,
  // Gray scale bitmap, one byte per pixel.
  BGR: 2,
  // 3 bytes per pixel, byte order: blue, green, red.
  BGRx: 3,
  // 4 bytes per pixel, byte order: blue, green, red, unused.
  BGRA: 4
  // 4 bytes per pixel, byte order: blue, green, red, alpha.
};
var FPDFRenderFlag = {
  // Set if annotations are to be rendered (high-lights, sticky-notes, ink, etc.)
  ANNOT: 1,
  // Set if using text rendering optimized for LCD display. This flag will only
  // take effect if anti-aliasing is enabled for text.
  LCD_TEXT: 2,
  // Don't use the native text output available on some platforms
  NO_NATIVETEXT: 4,
  // Grayscale output.
  GRAYSCALE: 8,
  // Obsolete, has no effect, retained for compatibility.
  DEBUG_INFO: 128,
  // Obsolete, has no effect, retained for compatibility.
  NO_CATCH: 256,
  // Limit image cache size.
  RENDER_LIMITEDIMAGECACHE: 512,
  // Always use halftone for image stretching.
  RENDER_FORCEHALFTONE: 1024,
  // Render for printing.
  PRINTING: 2048,
  // Set to disable anti-aliasing on text. This flag will also disable LCD
  // optimization for text rendering.
  RENDER_NO_SMOOTHTEXT: 4096,
  // Set to disable anti-aliasing on images.
  RENDER_NO_SMOOTHIMAGE: 8192,
  // Set to disable anti-aliasing on paths.
  RENDER_NO_SMOOTHPATH: 16384,
  // Set whether to render in a reverse Byte order, this flag is only used when
  // rendering to a bitmap. (what Canvas likes)
  REVERSE_BYTE_ORDER: 16,
  // Set whether fill paths need to be stroked. This flag is only used when
  // FPDF_COLORSCHEME is passed in, since with a single fill color for paths the
  // boundaries of adjacent fill paths are less visible.
  CONVERT_FILL_TO_STROKE: 32
};
var FPDFPageObjectType = {
  TEXT: 1,
  PATH: 2,
  IMAGE: 3,
  SHADING: 4,
  FORM: 5
};
var DEFAULT_PAGE_RENDER_OPTIONS = {
  scale: 1,
  render: "bitmap",
  colorSpace: "BGRA",
  renderFormFields: false,
  transparent: false
};
function convertBitmapToImage(options) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, render } = options;
    if (typeof render === "function") {
      return yield render(options);
    }
    return data;
  });
}
__name(convertBitmapToImage, "convertBitmapToImage");
function readUInt16LE(buffer, offset = 0) {
  return buffer[offset] | buffer[offset + 1] << 8;
}
__name(readUInt16LE, "readUInt16LE");
var PDFiumObjectBase = class {
  static {
    __name(this, "PDFiumObjectBase");
  }
  constructor(options) {
    this.module = options.module;
    this.objectIdx = options.objectIdx;
    this.documentIdx = options.documentIdx;
    this.pageIdx = options.pageIdx;
  }
  static create(options) {
    const type = options.module._FPDFPageObj_GetType(options.objectIdx);
    switch (type) {
      case FPDFPageObjectType.TEXT:
        return new PDFiumTextObject(options);
      case FPDFPageObjectType.PATH:
        return new PDFiumPathObject(options);
      case FPDFPageObjectType.IMAGE:
        return new PDFiumImageObject(options);
      case FPDFPageObjectType.SHADING:
        return new PDFiumShadingObject(options);
      case FPDFPageObjectType.FORM:
        return new PDFiumFormObject(options);
      default:
        throw new Error(`Unknown object type: ${type}`);
    }
  }
};
var PDFiumTextObject = class extends PDFiumObjectBase {
  static {
    __name(this, "PDFiumTextObject");
  }
  constructor() {
    super(...arguments);
    this.type = "text";
  }
};
var PDFiumPathObject = class extends PDFiumObjectBase {
  static {
    __name(this, "PDFiumPathObject");
  }
  constructor() {
    super(...arguments);
    this.type = "path";
  }
};
var PDFiumImageObject = class _PDFiumImageObject extends PDFiumObjectBase {
  static {
    __name(this, "PDFiumImageObject");
  }
  constructor() {
    super(...arguments);
    this.type = "image";
  }
  static formatToBPP(format) {
    switch (format) {
      case FPDFBitmap.Gray:
        return 1;
      case FPDFBitmap.BGR:
        return 3;
      case FPDFBitmap.BGRx:
      case FPDFBitmap.BGRA:
        return 4;
      default:
        throw new Error(`Unsupported bitmap format: ${format}`);
    }
  }
  /**
   * Return the raw uncompressed image data.
   */
  getImageDataRaw() {
    return __awaiter(this, void 0, void 0, function* () {
      const bufferSize = this.module._FPDFImageObj_GetImageDataRaw(this.objectIdx, 0, 0);
      if (!bufferSize) {
        throw new Error("Failed to get bitmap from image object.");
      }
      const bufferPtr = this.module.wasmExports.malloc(bufferSize);
      if (!this.module._FPDFImageObj_GetImageDataRaw(this.objectIdx, bufferPtr, bufferSize)) {
        throw new Error("Failed to get bitmap buffer.");
      }
      const oData = this.module.HEAPU8.slice(bufferPtr, bufferPtr + bufferSize);
      this.module.wasmExports.free(bufferPtr);
      const sizePtr = this.module.wasmExports.malloc(2 + 2);
      const widthPtr = sizePtr;
      const heightPtr = sizePtr + 2;
      if (!this.module._FPDFImageObj_GetImagePixelSize(this.objectIdx, widthPtr, heightPtr)) {
        throw new Error("Failed to get image size.");
      }
      const widthBuffer = this.module.HEAPU8.slice(widthPtr, widthPtr + 2);
      const heightBuffer = this.module.HEAPU8.slice(heightPtr, heightPtr + 2);
      this.module.wasmExports.free(sizePtr);
      const width = readUInt16LE(widthBuffer);
      const height = readUInt16LE(heightBuffer);
      const filtersCount = this.module._FPDFImageObj_GetImageFilterCount(this.objectIdx);
      const filters = [];
      for (let i = 0; i < filtersCount; i++) {
        const filterSize = this.module._FPDFImageObj_GetImageFilter(this.objectIdx, i, 0, 0);
        const filterPtr = this.module.wasmExports.malloc(filterSize);
        if (!this.module._FPDFImageObj_GetImageFilter(this.objectIdx, i, filterPtr, filterSize)) {
          throw new Error("Failed to get image filter.");
        }
        const filterBuffer = this.module.HEAPU8.slice(filterPtr, filterPtr + filterSize - 1);
        const filter = new TextDecoder().decode(filterBuffer).trim();
        this.module.wasmExports.free(filterPtr);
        filters.push(filter);
      }
      return {
        width,
        height,
        data: oData,
        filters
      };
    });
  }
  /**
   * Render the image object to a buffer with the specified render function.
   */
  render() {
    return __awaiter(this, arguments, void 0, function* (options = {
      render: "bitmap"
    }) {
      const bitmapIdx = this.module._FPDFImageObj_GetBitmap(this.objectIdx);
      if (!bitmapIdx) {
        throw new Error("Failed to get bitmap from image object.");
      }
      const bufferPtr = this.module._FPDFBitmap_GetBuffer(bitmapIdx);
      if (!bufferPtr) {
        throw new Error("Failed to get bitmap buffer.");
      }
      const stride = this.module._FPDFBitmap_GetStride(bitmapIdx);
      const width = this.module._FPDFBitmap_GetWidth(bitmapIdx);
      const height = this.module._FPDFBitmap_GetHeight(bitmapIdx);
      const format = this.module._FPDFBitmap_GetFormat(bitmapIdx);
      const oBPP = _PDFiumImageObject.formatToBPP(format);
      const bufferSize = height * stride;
      const oData = this.module.HEAPU8.slice(bufferPtr, bufferPtr + bufferSize);
      this.module.wasmExports.free(bufferPtr);
      const tBPP = BYTES_PER_PIXEL;
      const tData = new Uint8Array(width * height * tBPP);
      tData.fill(255);
      for (let rowIndex = 0; rowIndex < height; rowIndex++) {
        const tRowStart = rowIndex * tBPP * width;
        const oRowStart = rowIndex * stride;
        for (let columnIndex = 0; columnIndex < width; columnIndex++) {
          const tPixelStart = tRowStart + columnIndex * tBPP;
          const oPixelStart = oRowStart + columnIndex * oBPP;
          switch (format) {
            case FPDFBitmap.Gray: {
              const gray = oData[oPixelStart];
              tData[tPixelStart + 0] = gray;
              tData[tPixelStart + 1] = gray;
              tData[tPixelStart + 2] = gray;
              break;
            }
            case FPDFBitmap.BGR: {
              tData[tPixelStart + 0] = oData[oPixelStart + 2];
              tData[tPixelStart + 1] = oData[oPixelStart + 1];
              tData[tPixelStart + 2] = oData[oPixelStart + 0];
              break;
            }
            case FPDFBitmap.BGRx: {
              tData[tPixelStart + 0] = oData[oPixelStart + 2];
              tData[tPixelStart + 1] = oData[oPixelStart + 1];
              tData[tPixelStart + 2] = oData[oPixelStart + 0];
              break;
            }
            case FPDFBitmap.BGRA: {
              tData[tPixelStart + 0] = oData[oPixelStart + 2];
              tData[tPixelStart + 1] = oData[oPixelStart + 1];
              tData[tPixelStart + 2] = oData[oPixelStart + 0];
              tData[tPixelStart + 3] = oData[oPixelStart + 3];
              break;
            }
            default:
              throw new Error(`Unsupported bitmap format: ${format}`);
          }
        }
      }
      const image = yield convertBitmapToImage({
        render: options.render,
        width,
        height,
        data: tData
      });
      return {
        width,
        height,
        data: image
      };
    });
  }
};
var PDFiumShadingObject = class extends PDFiumObjectBase {
  static {
    __name(this, "PDFiumShadingObject");
  }
  constructor() {
    super(...arguments);
    this.type = "shading";
  }
};
var PDFiumFormObject = class extends PDFiumObjectBase {
  static {
    __name(this, "PDFiumFormObject");
  }
  constructor() {
    super(...arguments);
    this.type = "form";
  }
};
var PDFiumPage = class {
  static {
    __name(this, "PDFiumPage");
  }
  constructor(options) {
    this.module = options.module;
    this.pageIdx = options.pageIdx;
    this.documentIdx = options.documentIdx;
    this.document = options.document;
    this.number = options.pageIndex;
  }
  getOriginalSize() {
    const originalWidth = this.module._FPDF_GetPageWidth(this.pageIdx);
    const originalHeight = this.module._FPDF_GetPageHeight(this.pageIdx);
    return {
      originalWidth,
      originalHeight
    };
  }
  /**
   * Get the size of the page in points (1/72 inch)
   * Floored original values needed in testing. Scale can be a float number.
   */
  getSize(renderOptions) {
    const { scale, width, height } = renderOptions;
    const { originalHeight, originalWidth } = this.getOriginalSize();
    const computedWidth = Math.floor(width !== null && width !== void 0 ? width : originalWidth);
    const computedHeight = Math.floor(height !== null && height !== void 0 ? height : originalHeight);
    return {
      originalWidth: Math.floor(originalWidth),
      originalHeight: Math.floor(originalHeight),
      width: Math.floor(computedWidth * scale),
      height: Math.floor(computedHeight * scale)
    };
  }
  /**
   * Extract text from the page
   */
  getText() {
    const textPage = this.module._FPDFText_LoadPage(this.pageIdx);
    if (!textPage) {
      throw new Error("Failed to load text page");
    }
    try {
      const charCount = this.module._FPDFText_CountChars(textPage);
      if (charCount <= 0) {
        return "";
      }
      const bufferSize = (charCount + 1) * 2;
      const textPtr = this.module.wasmExports.malloc(bufferSize);
      try {
        const length = this.module._FPDFText_GetText(textPage, 0, charCount, textPtr);
        if (length <= 0) {
          return "";
        }
        const buffer = new Uint8Array(this.module.HEAPU8.buffer, textPtr, (length - 1) * 2);
        const text = new TextDecoder("utf-16le").decode(buffer);
        return text;
      } finally {
        this.module.wasmExports.free(textPtr);
      }
    } finally {
      this.module._FPDFText_ClosePage(textPage);
    }
  }
  render() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
      let formIdx = null;
      const renderOptions = Object.assign(Object.assign({}, DEFAULT_PAGE_RENDER_OPTIONS), options);
      const { colorSpace, render, renderFormFields, transparent } = renderOptions;
      const { width, height, originalWidth, originalHeight } = this.getSize(renderOptions);
      if (renderFormFields) {
        formIdx = this.document.initializeFormFields();
        this.module._FORM_OnAfterLoadPage(this.pageIdx, formIdx);
      }
      const bytesPerPixel = FPDFBitmap[colorSpace];
      const buffSize = width * height * bytesPerPixel;
      const ptr = this.module.wasmExports.malloc(buffSize);
      let bitmap = null;
      if (ptr === 0) {
        throw new Error("Failed to allocate memory for bitmap");
      }
      try {
        bitmap = this.module._FPDFBitmap_CreateEx(width, height, bytesPerPixel, ptr, width * bytesPerPixel);
        const fillColor = transparent && colorSpace === "BGRA" ? 0 : 4294967295;
        this.module._FPDFBitmap_FillRect(
          bitmap,
          0,
          // left
          0,
          // top
          width,
          // width
          height,
          // height
          fillColor
        );
        let flags = FPDFRenderFlag.ANNOT | FPDFRenderFlag.LCD_TEXT;
        flags = colorSpace === "Gray" ? flags | FPDFRenderFlag.GRAYSCALE : flags | FPDFRenderFlag.REVERSE_BYTE_ORDER;
        this.module._FPDF_RenderPageBitmap(
          bitmap,
          this.pageIdx,
          0,
          // start_x
          0,
          // start_y
          width,
          // size_x
          height,
          // size_y
          0,
          // rotate (0, normal)
          flags
        );
        if (formIdx !== null) {
          const formFlags = flags & ~FPDFRenderFlag.ANNOT;
          this.module._FPDF_FFLDraw(
            formIdx,
            bitmap,
            this.pageIdx,
            0,
            // start_x
            0,
            // start_y
            width,
            // size_x
            height,
            // size_y
            0,
            // rotate (0, normal)
            formFlags
          );
          this.module._FORM_OnBeforeClosePage(this.pageIdx, formIdx);
        }
        const image = yield this.convertBitmapToImage({
          render,
          width,
          height,
          // ⚠️ creation of a copy is necessary to avoid memory corruption
          data: this.module.HEAPU8.slice(ptr, ptr + buffSize)
        });
        return {
          width,
          height,
          originalHeight,
          originalWidth,
          data: image
        };
      } finally {
        if (bitmap !== null) {
          this.module._FPDFBitmap_Destroy(bitmap);
        }
        this.module._FPDF_ClosePage(this.pageIdx);
        this.module.wasmExports.free(ptr);
      }
    });
  }
  convertBitmapToImage(options) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield convertBitmapToImage(options);
    });
  }
  getObjectCount() {
    return this.module._FPDFPage_CountObjects(this.pageIdx);
  }
  getObject(i) {
    const object = this.module._FPDFPage_GetObject(this.pageIdx, i);
    return PDFiumObjectBase.create({
      module: this.module,
      objectIdx: object,
      documentIdx: this.documentIdx,
      pageIdx: this.pageIdx
    });
  }
  *objects() {
    const objectsCount = this.getObjectCount();
    for (let i = 0; i < objectsCount; i++) {
      yield this.getObject(i);
    }
  }
};
var PDFiumDocument = class {
  static {
    __name(this, "PDFiumDocument");
  }
  constructor(options) {
    this.formIdx = null;
    this.formPtr = null;
    this.module = options.module;
    this.documentPtr = options.documentPtr;
    this.documentIdx = options.documentIdx;
  }
  /**
   * Initialize form environment for this document
   * This is required for rendering form fields such as signatures.
   * @returns The form handle
   */
  initializeFormFields() {
    if (this.formIdx !== null) {
      return this.formIdx;
    }
    const formSize = 256;
    this.formPtr = this.module.wasmExports.malloc(formSize);
    if (this.formPtr === 0) {
      throw new Error("Failed to allocate memory for form fill environment");
    }
    this.module.HEAPU8.fill(0, this.formPtr, this.formPtr + formSize);
    new DataView(this.module.HEAPU8.buffer).setUint32(this.formPtr, 2, true);
    this.formIdx = this.module._FPDFDOC_InitFormFillEnvironment(this.documentIdx, this.formPtr);
    if (this.formIdx === 0) {
      this.module.wasmExports.free(this.formPtr);
      this.formPtr = null;
      throw new Error("Failed to initialize form fill environment");
    }
    return this.formIdx;
  }
  /**
   * Get a page from the document by its index. The index is zero-based.
   */
  getPage(pageIndex) {
    const pageIdx = this.module._FPDF_LoadPage(this.documentIdx, pageIndex);
    return new PDFiumPage({
      module: this.module,
      pageIdx,
      documentIdx: this.documentIdx,
      pageIndex,
      document: this
    });
  }
  /**
   * User-friendly iterator to iterate over all pages in the document.
   */
  *pages() {
    const pageCount = this.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      yield this.getPage(i);
    }
  }
  /**
   * Get the number of pages in the document.
   */
  getPageCount() {
    return this.module._FPDF_GetPageCount(this.documentIdx);
  }
  /**
   * After you're done with the document, you should destroy it to free the memory.
   *
   * Otherwise, you'll be fired from your job for causing a memory leak. 😱
   */
  destroy() {
    if (this.formIdx) {
      this.module._FPDFDOC_ExitFormFillEnvironment(this.formIdx);
      this.formIdx = null;
    }
    if (this.formPtr) {
      this.module.wasmExports.free(this.formPtr);
      this.formPtr = null;
    }
    this.module._FPDF_CloseDocument(this.documentIdx);
    this.module.wasmExports.free(this.documentPtr);
  }
};
function lengthBytesUTF8(str) {
  let len = 0;
  for (let i = 0; i < str.length; ++i) {
    const c = str.charCodeAt(i);
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
}
__name(lengthBytesUTF8, "lengthBytesUTF8");
function stringToUTF8(str, heap, outIdx, maxBytesToWrite) {
  outIdx >>>= 0;
  if (!(maxBytesToWrite > 0))
    return 0;
  const startIdx = outIdx;
  const endIdx = outIdx + maxBytesToWrite - 1;
  for (let i = 0; i < str.length; ++i) {
    let u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      const u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | u1 & 1023;
    }
    if (u <= 127) {
      if (outIdx >= endIdx)
        break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx)
        break;
      heap[outIdx++] = 192 | u >> 6;
      heap[outIdx++] = 128 | u & 63;
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx)
        break;
      heap[outIdx++] = 224 | u >> 12;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63;
    } else {
      if (outIdx + 3 >= endIdx)
        break;
      heap[outIdx++] = 240 | u >> 18;
      heap[outIdx++] = 128 | u >> 12 & 63;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63;
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx;
}
__name(stringToUTF8, "stringToUTF8");
var NO_OPTION_WARNING = "@hyzyla/pdfium: wasmUrl, wasmBinary is required for browser environment. \n\nPlease provide the wasm binary or URL to the init method. You can also use '@hyzyla/pdfium/browser/cdn'or '@hyzyla/pdfium/browser/base64' for quick setup, but it's not recommended for production use.";
function stringToCString(module, str) {
  const length = lengthBytesUTF8(str) + 1;
  const passwordPtr = module.wasmExports.malloc(length);
  stringToUTF8(str, module.HEAPU8, passwordPtr, length);
  return passwordPtr;
}
__name(stringToCString, "stringToCString");
var PDFiumLibrary$1 = class PDFiumLibrary {
  static {
    __name(this, "PDFiumLibrary");
  }
  static initBase(options) {
    return __awaiter(this, void 0, void 0, function* () {
      const { wasmUrl, wasmBinary, instantiateWasm } = options || {};
      const loadOptions = {};
      if (wasmUrl) {
        loadOptions.locateFile = (_path) => wasmUrl;
      } else if (wasmBinary) {
        loadOptions.wasmBinary = wasmBinary;
        loadOptions.locateFile = () => "";
      } else if (instantiateWasm) {
        loadOptions.instantiateWasm = instantiateWasm;
      } else {
        if (typeof window !== "undefined") {
          console.error(NO_OPTION_WARNING);
          throw new Error(NO_OPTION_WARNING);
        }
      }
      const module = yield options.vendor(loadOptions);
      module._FPDF_InitLibraryWithConfig({
        version: 2,
        m_pIsolate: null,
        m_pUserFontPaths: null,
        m_v8EmbedderSlot: 0,
        m_pPlatform: null
      });
      return new PDFiumLibrary(module);
    });
  }
  constructor(module) {
    this.module = module;
  }
  loadDocument(buff_1) {
    return __awaiter(this, arguments, void 0, function* (buff, password = "") {
      const size = buff.length;
      const documentPtr = this.module.wasmExports.malloc(size);
      this.module.HEAPU8.set(buff, documentPtr);
      let passwordPtr = 0;
      if (password) {
        passwordPtr = stringToCString(this.module, password);
      }
      const documentIdx = this.module._FPDF_LoadMemDocument(documentPtr, size, passwordPtr);
      if (!documentIdx) {
        const lastError = this.module._FPDF_GetLastError();
        this.module.wasmExports.free(documentPtr);
        if (passwordPtr !== 0) {
          this.module.wasmExports.free(passwordPtr);
        }
        switch (lastError) {
          case FPDFErrorCode.UNKNOWN:
            throw new Error("Unknown error");
          case FPDFErrorCode.FILE:
            throw new Error("File not found or could not be opened");
          case FPDFErrorCode.FORMAT:
            throw new Error("File not in PDF format or corrupted");
          case FPDFErrorCode.PASSWORD:
            throw new Error("Password required or incorrect password");
          case FPDFErrorCode.SECURITY:
            throw new Error("Unsupported security scheme");
          case FPDFErrorCode.PAGE:
            throw new Error("Page not found or content error");
          default:
            throw new Error(`PDF Loading = ${lastError}`);
        }
      }
      const document2 = new PDFiumDocument({
        module: this.module,
        documentPtr,
        documentIdx
      });
      if (passwordPtr !== null) {
        this.module.wasmExports.free(passwordPtr);
      }
      return document2;
    });
  }
  destroy() {
    this.module._FPDF_DestroyLibrary();
  }
};
var PDFiumModule = /* @__PURE__ */ (() => {
  return async function(moduleArg = {}) {
    var moduleRtn;
    var Module2 = moduleArg;
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
    typeof process == "object" && process.versions?.node && process.type != "renderer";
    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && true && !ENVIRONMENT_IS_WORKER;
    var thisProgram = "./this.program";
    var _scriptName = import.meta.url;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    __name(locateFile, "locateFile");
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_SHELL) {
      const isNode = typeof process == "object" && process.versions?.node && process.type != "renderer";
      if (isNode || typeof window == "object" || typeof WorkerGlobalScope != "undefined")
        throw new Error(
          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)"
        );
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      try {
        scriptDirectory = new URL(".", _scriptName).href;
      } catch {
      }
      if (!(typeof window == "object" || typeof WorkerGlobalScope != "undefined"))
        throw new Error(
          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)"
        );
      {
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = /* @__PURE__ */ __name((url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          }, "readBinary");
        }
        readAsync = /* @__PURE__ */ __name(async (url) => {
          if (isFileURI(url)) {
            return new Promise((resolve2, reject) => {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, true);
              xhr.responseType = "arraybuffer";
              xhr.onload = () => {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                  resolve2(xhr.response);
                  return;
                }
                reject(xhr.status);
              };
              xhr.onerror = reject;
              xhr.send(null);
            });
          }
          var response = await fetch(url, { credentials: "same-origin" });
          if (response.ok) {
            return response.arrayBuffer();
          }
          throw new Error(response.status + " : " + response.url);
        }, "readAsync");
      }
    } else {
      throw new Error("environment detection error");
    }
    var out = console.log.bind(console);
    var err = console.error.bind(console);
    assert2(
      !ENVIRONMENT_IS_SHELL,
      "shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable."
    );
    var wasmBinary;
    if (typeof WebAssembly != "object") {
      err("no native wasm support detected");
    }
    var ABORT = false;
    function assert2(condition, text) {
      if (!condition) {
        abort2("Assertion failed" + (text ? ": " + text : ""));
      }
    }
    __name(assert2, "assert");
    var isFileURI = /* @__PURE__ */ __name((filename) => filename.startsWith("file://"), "isFileURI");
    function writeStackCookie() {
      var max = _emscripten_stack_get_end();
      assert2((max & 3) == 0);
      if (max == 0) {
        max += 4;
      }
      HEAPU32[max >> 2] = 34821223;
      HEAPU32[max + 4 >> 2] = 2310721022;
      HEAPU32[0 >> 2] = 1668509029;
    }
    __name(writeStackCookie, "writeStackCookie");
    function checkStackCookie() {
      if (ABORT) return;
      var max = _emscripten_stack_get_end();
      if (max == 0) {
        max += 4;
      }
      var cookie1 = HEAPU32[max >> 2];
      var cookie2 = HEAPU32[max + 4 >> 2];
      if (cookie1 != 34821223 || cookie2 != 2310721022) {
        abort2(
          `Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`
        );
      }
      if (HEAPU32[0 >> 2] != 1668509029) {
        abort2("Runtime error: The application has corrupted its heap memory area (address zero)!");
      }
    }
    __name(checkStackCookie, "checkStackCookie");
    (() => {
      var h16 = new Int16Array(1);
      var h8 = new Int8Array(h16.buffer);
      h16[0] = 25459;
      if (h8[0] !== 115 || h8[1] !== 99)
        throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
    })();
    function consumedModuleProp(prop) {
      if (!Object.getOwnPropertyDescriptor(Module2, prop)) {
        Object.defineProperty(Module2, prop, {
          configurable: true,
          set() {
            abort2(
              `Attempt to set \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`
            );
          }
        });
      }
    }
    __name(consumedModuleProp, "consumedModuleProp");
    function makeInvalidEarlyAccess(name) {
      return () => assert2(false, `call to '${name}' via reference taken before Wasm module initialization`);
    }
    __name(makeInvalidEarlyAccess, "makeInvalidEarlyAccess");
    function ignoredModuleProp(prop) {
      if (Object.getOwnPropertyDescriptor(Module2, prop)) {
        abort2(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
      }
    }
    __name(ignoredModuleProp, "ignoredModuleProp");
    function isExportedByForceFilesystem(name) {
      return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
    }
    __name(isExportedByForceFilesystem, "isExportedByForceFilesystem");
    function hookGlobalSymbolAccess(sym, func) {
      if (typeof globalThis != "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, {
          configurable: true,
          get() {
            func();
            return void 0;
          }
        });
      }
    }
    __name(hookGlobalSymbolAccess, "hookGlobalSymbolAccess");
    function missingGlobal(sym, msg) {
      hookGlobalSymbolAccess(sym, () => {
        warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
      });
    }
    __name(missingGlobal, "missingGlobal");
    missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");
    missingGlobal("asm", "Please use wasmExports instead");
    function missingLibrarySymbol(sym) {
      hookGlobalSymbolAccess(sym, () => {
        var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
        var librarySymbol = sym;
        if (!librarySymbol.startsWith("_")) {
          librarySymbol = "$" + sym;
        }
        msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
        if (isExportedByForceFilesystem(sym)) {
          msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
        }
        warnOnce(msg);
      });
      unexportedRuntimeSymbol(sym);
    }
    __name(missingLibrarySymbol, "missingLibrarySymbol");
    function unexportedRuntimeSymbol(sym) {
      if (!Object.getOwnPropertyDescriptor(Module2, sym)) {
        Object.defineProperty(Module2, sym, {
          configurable: true,
          get() {
            var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
            if (isExportedByForceFilesystem(sym)) {
              msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
            }
            abort2(msg);
          }
        });
      }
    }
    __name(unexportedRuntimeSymbol, "unexportedRuntimeSymbol");
    var readyPromiseResolve, readyPromiseReject;
    var wasmMemory;
    var HEAP8, HEAPU8, HEAP16, HEAP32, HEAPU32;
    var HEAP64;
    var runtimeInitialized = false;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module2["HEAP8"] = HEAP8 = new Int8Array(b);
      Module2["HEAP16"] = HEAP16 = new Int16Array(b);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module2["HEAPU16"] = new Uint16Array(b);
      Module2["HEAP32"] = HEAP32 = new Int32Array(b);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module2["HEAPF32"] = new Float32Array(b);
      Module2["HEAPF64"] = new Float64Array(b);
      HEAP64 = new BigInt64Array(b);
      new BigUint64Array(b);
    }
    __name(updateMemoryViews, "updateMemoryViews");
    assert2(
      typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0,
      "JS engine does not provide full typed array support"
    );
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      consumedModuleProp("preRun");
      callRuntimeCallbacks(onPreRuns);
    }
    __name(preRun, "preRun");
    function initRuntime() {
      assert2(!runtimeInitialized);
      runtimeInitialized = true;
      checkStackCookie();
      if (!Module2["noFSInit"] && !FS.initialized) FS.init();
      wasmExports["__wasm_call_ctors"]();
      FS.ignorePermissions = false;
    }
    __name(initRuntime, "initRuntime");
    function postRun() {
      checkStackCookie();
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      consumedModuleProp("postRun");
      callRuntimeCallbacks(onPostRuns);
    }
    __name(postRun, "postRun");
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    var runDependencyTracking = {};
    var runDependencyWatcher = null;
    function addRunDependency(id) {
      runDependencies++;
      Module2["monitorRunDependencies"]?.(runDependencies);
      if (id) {
        assert2(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
          runDependencyWatcher = setInterval(() => {
            if (ABORT) {
              clearInterval(runDependencyWatcher);
              runDependencyWatcher = null;
              return;
            }
            var shown = false;
            for (var dep in runDependencyTracking) {
              if (!shown) {
                shown = true;
                err("still waiting on run dependencies:");
              }
              err(`dependency: ${dep}`);
            }
            if (shown) {
              err("(end of list)");
            }
          }, 1e4);
        }
      } else {
        err("warning: run dependency added without ID");
      }
    }
    __name(addRunDependency, "addRunDependency");
    function removeRunDependency(id) {
      runDependencies--;
      Module2["monitorRunDependencies"]?.(runDependencies);
      if (id) {
        assert2(runDependencyTracking[id]);
        delete runDependencyTracking[id];
      } else {
        err("warning: run dependency removed without ID");
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    __name(removeRunDependency, "removeRunDependency");
    function abort2(what) {
      Module2["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject?.(e);
      throw e;
    }
    __name(abort2, "abort");
    function createExportWrapper(name, nargs) {
      return (...args) => {
        assert2(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
        var f = wasmExports[name];
        assert2(f, `exported native function \`${name}\` not found`);
        assert2(
          args.length <= nargs,
          `native function \`${name}\` called with ${args.length} args but expects ${nargs}`
        );
        return f(...args);
      };
    }
    __name(createExportWrapper, "createExportWrapper");
    var wasmBinaryFile;
    function findWasmBinary() {
      if (Module2["locateFile"]) {
        return locateFile("pdfium.wasm");
      }
      return new URL("pdfium.wasm", import.meta.url).href;
    }
    __name(findWasmBinary, "findWasmBinary");
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    __name(getBinarySync, "getBinarySync");
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) {
        try {
          var response = await readAsync(binaryFile);
          return new Uint8Array(response);
        } catch {
        }
      }
      return getBinarySync(binaryFile);
    }
    __name(getWasmBinary, "getWasmBinary");
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary = await getWasmBinary(binaryFile);
        var instance = await WebAssembly.instantiate(binary, imports);
        return instance;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        if (isFileURI(wasmBinaryFile)) {
          err(
            `warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`
          );
        }
        abort2(reason);
      }
    }
    __name(instantiateArrayBuffer, "instantiateArrayBuffer");
    async function instantiateAsync(binary, binaryFile, imports) {
      if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isFileURI(binaryFile) && true) {
        try {
          var response = fetch(binaryFile, { credentials: "same-origin" });
          var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
          return instantiationResult;
        } catch (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
        }
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    __name(instantiateAsync, "instantiateAsync");
    function getWasmImports() {
      return { env: wasmImports, wasi_snapshot_preview1: wasmImports };
    }
    __name(getWasmImports, "getWasmImports");
    async function createWasm() {
      function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        Module2["wasmExports"] = wasmExports;
        wasmMemory = wasmExports["memory"];
        assert2(wasmMemory, "memory not found in wasm exports");
        updateMemoryViews();
        wasmTable = wasmExports["__indirect_function_table"];
        assert2(wasmTable, "table not found in wasm exports");
        assignWasmExports(wasmExports);
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      __name(receiveInstance, "receiveInstance");
      addRunDependency("wasm-instantiate");
      var trueModule = Module2;
      function receiveInstantiationResult(result2) {
        assert2(
          Module2 === trueModule,
          "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?"
        );
        trueModule = null;
        return receiveInstance(result2["instance"]);
      }
      __name(receiveInstantiationResult, "receiveInstantiationResult");
      var info = getWasmImports();
      if (Module2["instantiateWasm"]) {
        return new Promise((resolve2, reject) => {
          try {
            Module2["instantiateWasm"](info, (mod, inst) => {
              resolve2(receiveInstance(mod, inst));
            });
          } catch (e) {
            err(`Module.instantiateWasm callback failed with error: ${e}`);
            reject(e);
          }
        });
      }
      wasmBinaryFile ??= findWasmBinary();
      var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
      var exports$1 = receiveInstantiationResult(result);
      return exports$1;
    }
    __name(createWasm, "createWasm");
    var callRuntimeCallbacks = /* @__PURE__ */ __name((callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    }, "callRuntimeCallbacks");
    var onPostRuns = [];
    var addOnPostRun = /* @__PURE__ */ __name((cb) => onPostRuns.push(cb), "addOnPostRun");
    var onPreRuns = [];
    var addOnPreRun = /* @__PURE__ */ __name((cb) => onPreRuns.push(cb), "addOnPreRun");
    var ptrToString = /* @__PURE__ */ __name((ptr) => {
      assert2(typeof ptr === "number");
      ptr >>>= 0;
      return "0x" + ptr.toString(16).padStart(8, "0");
    }, "ptrToString");
    var stackRestore = /* @__PURE__ */ __name((val) => __emscripten_stack_restore(val), "stackRestore");
    var stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave");
    var warnOnce = /* @__PURE__ */ __name((text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text);
      }
    }, "warnOnce");
    var syscallGetVarargI = /* @__PURE__ */ __name(() => {
      assert2(SYSCALLS.varargs != void 0);
      var ret = HEAP32[+SYSCALLS.varargs >> 2];
      SYSCALLS.varargs += 4;
      return ret;
    }, "syscallGetVarargI");
    var syscallGetVarargP = syscallGetVarargI;
    var PATH = {
      isAbs: /* @__PURE__ */ __name((path) => path.charAt(0) === "/", "isAbs"),
      splitPath: /* @__PURE__ */ __name((filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      }, "splitPath"),
      normalizeArray: /* @__PURE__ */ __name((parts, allowAboveRoot) => {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === ".") {
            parts.splice(i, 1);
          } else if (last === "..") {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift("..");
          }
        }
        return parts;
      }, "normalizeArray"),
      normalize: /* @__PURE__ */ __name((path) => {
        var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
        path = PATH.normalizeArray(
          path.split("/").filter((p) => !!p),
          !isAbsolute
        ).join("/");
        if (!path && !isAbsolute) {
          path = ".";
        }
        if (path && trailingSlash) {
          path += "/";
        }
        return (isAbsolute ? "/" : "") + path;
      }, "normalize"),
      dirname: /* @__PURE__ */ __name((path) => {
        var result = PATH.splitPath(path), root = result[0], dir = result[1];
        if (!root && !dir) {
          return ".";
        }
        if (dir) {
          dir = dir.slice(0, -1);
        }
        return root + dir;
      }, "dirname"),
      basename: /* @__PURE__ */ __name((path) => path && path.match(/([^\/]+|\/)\/*$/)[1], "basename"),
      join: /* @__PURE__ */ __name((...paths) => PATH.normalize(paths.join("/")), "join"),
      join2: /* @__PURE__ */ __name((l, r) => PATH.normalize(l + "/" + r), "join2")
    };
    var initRandomFill = /* @__PURE__ */ __name(() => {
      return (view) => crypto.getRandomValues(view);
    }, "initRandomFill");
    var randomFill = /* @__PURE__ */ __name((view) => {
      (randomFill = initRandomFill())(view);
    }, "randomFill");
    var PATH_FS = {
      resolve: /* @__PURE__ */ __name((...args) => {
        var resolvedPath = "", resolvedAbsolute = false;
        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = i >= 0 ? args[i] : FS.cwd();
          if (typeof path != "string") {
            throw new TypeError("Arguments to path.resolve must be strings");
          } else if (!path) {
            return "";
          }
          resolvedPath = path + "/" + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        resolvedPath = PATH.normalizeArray(
          resolvedPath.split("/").filter((p) => !!p),
          !resolvedAbsolute
        ).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
      }, "resolve"),
      relative: /* @__PURE__ */ __name((from, to) => {
        from = PATH_FS.resolve(from).slice(1);
        to = PATH_FS.resolve(to).slice(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== "") break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== "") break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        __name(trim, "trim");
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push("..");
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/");
      }, "relative")
    };
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    var UTF8ArrayToString = /* @__PURE__ */ __name((heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          if ((u0 & 248) != 240)
            warnOnce(
              "Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!"
            );
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }, "UTF8ArrayToString");
    var FS_stdin_getChar_buffer = [];
    var lengthBytesUTF82 = /* @__PURE__ */ __name((str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    }, "lengthBytesUTF8");
    var stringToUTF8Array = /* @__PURE__ */ __name((str, heap, outIdx, maxBytesToWrite) => {
      assert2(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.codePointAt(i);
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 1114111)
            warnOnce(
              "Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF)."
            );
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
          i++;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }, "stringToUTF8Array");
    var intArrayFromString = /* @__PURE__ */ __name((stringy, dontAddNull, length) => {
      var len = lengthBytesUTF82(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      u8array.length = numBytesWritten;
      return u8array;
    }, "intArrayFromString");
    var FS_stdin_getChar = /* @__PURE__ */ __name(() => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n";
          }
        } else ;
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result);
      }
      return FS_stdin_getChar_buffer.shift();
    }, "FS_stdin_getChar");
    var TTY = {
      ttys: [],
      init() {
      },
      shutdown() {
      },
      register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
      stream_ops: {
        open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
        close(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        read(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === void 0 && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === void 0) break;
            bytesRead++;
            buffer[offset + i] = result;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
        write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        }
      },
      default_tty_ops: {
        get_char(tty) {
          return FS_stdin_getChar();
        },
        put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
        fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
        ioctl_tcgets(tty) {
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              3,
              28,
              127,
              21,
              4,
              0,
              1,
              0,
              17,
              19,
              26,
              0,
              18,
              15,
              23,
              22,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0
            ]
          };
        },
        ioctl_tcsets(tty, optional_actions, data) {
          return 0;
        },
        ioctl_tiocgwinsz(tty) {
          return [24, 80];
        }
      },
      default_tty1_ops: {
        put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
        fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        }
      }
    };
    var zeroMemory = /* @__PURE__ */ __name((ptr, size) => HEAPU8.fill(0, ptr, ptr + size), "zeroMemory");
    var alignMemory = /* @__PURE__ */ __name((size, alignment) => {
      assert2(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    }, "alignMemory");
    var mmapAlloc = /* @__PURE__ */ __name((size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (ptr) zeroMemory(ptr, size);
      return ptr;
    }, "mmapAlloc");
    var MEMFS = {
      ops_table: null,
      mount(mount) {
        return MEMFS.createNode(null, "/", 16895, 0);
      },
      createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: { llseek: MEMFS.stream_ops.llseek }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0;
          node.contents = null;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
      getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents);
      },
      expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
      },
      resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null;
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize);
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
          }
          node.usedBytes = newSize;
        }
      },
      node_ops: {
        getattr(node) {
          var attr = {};
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
        setattr(node, attr) {
          for (const key of ["mode", "atime", "mtime", "ctime"]) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== void 0) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
        lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
        mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
        rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {
          }
          if (new_node) {
            if (FS.isDir(old_node.mode)) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
            FS.hashRemoveNode(new_node);
          }
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
        unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
        rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
        readdir(node) {
          return [".", "..", ...Object.keys(node.contents)];
        },
        symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
          node.link = oldpath;
          return node;
        },
        readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        }
      },
      stream_ops: {
        read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert2(size >= 0);
          if (size > 8 && contents.subarray) {
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
        write(stream, buffer, offset, length, position, canOwn) {
          assert2(!(buffer instanceof ArrayBuffer));
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
          if (buffer.subarray && (!node.contents || node.contents.subarray)) {
            if (canOwn) {
              assert2(position === 0, "canOwn must imply no weird position inside the file");
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) {
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) {
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          MEMFS.expandFileStorage(node, position + length);
          if (node.contents.subarray && buffer.subarray) {
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
              node.contents[position + i] = buffer[offset + i];
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
        llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
        mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
        msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          return 0;
        }
      }
    };
    var asyncLoad = /* @__PURE__ */ __name(async (url) => {
      var arrayBuffer = await readAsync(url);
      assert2(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
      return new Uint8Array(arrayBuffer);
    }, "asyncLoad");
    var FS_createDataFile = /* @__PURE__ */ __name((...args) => FS.createDataFile(...args), "FS_createDataFile");
    var getUniqueRunDependency = /* @__PURE__ */ __name((id) => {
      var orig = id;
      while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
      }
    }, "getUniqueRunDependency");
    var preloadPlugins = [];
    var FS_handledByPreloadPlugin = /* @__PURE__ */ __name((byteArray, fullname, finish, onerror) => {
      if (typeof Browser != "undefined") Browser.init();
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin["canHandle"](fullname)) {
          plugin["handle"](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    }, "FS_handledByPreloadPlugin");
    var FS_createPreloadedFile = /* @__PURE__ */ __name((parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`);
      function processData(byteArray) {
        function finish(byteArray2) {
          preFinish?.();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray2, canRead, canWrite, canOwn);
          }
          onload?.();
          removeRunDependency(dep);
        }
        __name(finish, "finish");
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          onerror?.();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      __name(processData, "processData");
      addRunDependency(dep);
      if (typeof url == "string") {
        asyncLoad(url).then(processData, onerror);
      } else {
        processData(url);
      }
    }, "FS_createPreloadedFile");
    var FS_modeStringToFlags = /* @__PURE__ */ __name((str) => {
      var flagModes = {
        r: 0,
        "r+": 2,
        w: 512 | 64 | 1,
        "w+": 512 | 64 | 2,
        a: 1024 | 64 | 1,
        "a+": 1024 | 64 | 2
      };
      var flags = flagModes[str];
      if (typeof flags == "undefined") {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    }, "FS_modeStringToFlags");
    var FS_getMode = /* @__PURE__ */ __name((canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    }, "FS_getMode");
    var UTF8ToString = /* @__PURE__ */ __name((ptr, maxBytesToRead) => {
      assert2(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }, "UTF8ToString");
    var strError = /* @__PURE__ */ __name((errno) => UTF8ToString(_strerror(errno)), "strError");
    var ERRNO_CODES = {
      EPERM: 63,
      ENOENT: 44,
      ESRCH: 71,
      EINTR: 27,
      EIO: 29,
      ENXIO: 60,
      E2BIG: 1,
      ENOEXEC: 45,
      EBADF: 8,
      ECHILD: 12,
      EAGAIN: 6,
      EWOULDBLOCK: 6,
      ENOMEM: 48,
      EACCES: 2,
      EFAULT: 21,
      ENOTBLK: 105,
      EBUSY: 10,
      EEXIST: 20,
      EXDEV: 75,
      ENODEV: 43,
      ENOTDIR: 54,
      EISDIR: 31,
      EINVAL: 28,
      ENFILE: 41,
      EMFILE: 33,
      ENOTTY: 59,
      ETXTBSY: 74,
      EFBIG: 22,
      ENOSPC: 51,
      ESPIPE: 70,
      EROFS: 69,
      EMLINK: 34,
      EPIPE: 64,
      EDOM: 18,
      ERANGE: 68,
      ENOMSG: 49,
      EIDRM: 24,
      ECHRNG: 106,
      EL2NSYNC: 156,
      EL3HLT: 107,
      EL3RST: 108,
      ELNRNG: 109,
      EUNATCH: 110,
      ENOCSI: 111,
      EL2HLT: 112,
      EDEADLK: 16,
      ENOLCK: 46,
      EBADE: 113,
      EBADR: 114,
      EXFULL: 115,
      ENOANO: 104,
      EBADRQC: 103,
      EBADSLT: 102,
      EDEADLOCK: 16,
      EBFONT: 101,
      ENOSTR: 100,
      ENODATA: 116,
      ETIME: 117,
      ENOSR: 118,
      ENONET: 119,
      ENOPKG: 120,
      EREMOTE: 121,
      ENOLINK: 47,
      EADV: 122,
      ESRMNT: 123,
      ECOMM: 124,
      EPROTO: 65,
      EMULTIHOP: 36,
      EDOTDOT: 125,
      EBADMSG: 9,
      ENOTUNIQ: 126,
      EBADFD: 127,
      EREMCHG: 128,
      ELIBACC: 129,
      ELIBBAD: 130,
      ELIBSCN: 131,
      ELIBMAX: 132,
      ELIBEXEC: 133,
      ENOSYS: 52,
      ENOTEMPTY: 55,
      ENAMETOOLONG: 37,
      ELOOP: 32,
      EOPNOTSUPP: 138,
      EPFNOSUPPORT: 139,
      ECONNRESET: 15,
      ENOBUFS: 42,
      EAFNOSUPPORT: 5,
      EPROTOTYPE: 67,
      ENOTSOCK: 57,
      ENOPROTOOPT: 50,
      ESHUTDOWN: 140,
      ECONNREFUSED: 14,
      EADDRINUSE: 3,
      ECONNABORTED: 13,
      ENETUNREACH: 40,
      ENETDOWN: 38,
      ETIMEDOUT: 73,
      EHOSTDOWN: 142,
      EHOSTUNREACH: 23,
      EINPROGRESS: 26,
      EALREADY: 7,
      EDESTADDRREQ: 17,
      EMSGSIZE: 35,
      EPROTONOSUPPORT: 66,
      ESOCKTNOSUPPORT: 137,
      EADDRNOTAVAIL: 4,
      ENETRESET: 39,
      EISCONN: 30,
      ENOTCONN: 53,
      ETOOMANYREFS: 141,
      EUSERS: 136,
      EDQUOT: 19,
      ESTALE: 72,
      ENOTSUP: 138,
      ENOMEDIUM: 148,
      EILSEQ: 25,
      EOVERFLOW: 61,
      ECANCELED: 11,
      ENOTRECOVERABLE: 56,
      EOWNERDEAD: 62,
      ESTRPIPE: 135
    };
    var FS = {
      root: null,
      mounts: [],
      devices: {},
      streams: [],
      nextInode: 1,
      nameTable: null,
      currentPath: "/",
      initialized: false,
      ignorePermissions: true,
      filesystems: null,
      syncFSRequests: 0,
      readFiles: {},
      ErrnoError: class extends Error {
        static {
          __name(this, "ErrnoError");
        }
        name = "ErrnoError";
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : "");
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
      FSStream: class {
        static {
          __name(this, "FSStream");
        }
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return this.flags & 1024;
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
      FSNode: class {
        static {
          __name(this, "FSNode");
        }
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
      lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true;
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + "/" + path;
        }
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          var parts = path.split("/").filter((p) => !!p);
          var current = FS.root;
          var current_path = "/";
          for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
              break;
            }
            if (parts[i] === ".") {
              continue;
            }
            if (parts[i] === "..") {
              current_path = PATH.dirname(current_path);
              if (FS.isRoot(current)) {
                path = current_path + "/" + parts.slice(i + 1).join("/");
                continue linkloop;
              } else {
                current = current.parent;
              }
              continue;
            }
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              if (e?.errno === 44 && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + "/" + link;
              }
              path = link + "/" + parts.slice(i + 1).join("/");
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
      getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
      hashName(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
          hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
        }
        return (parentid + hash >>> 0) % FS.nameTable.length;
      },
      hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
      hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
      lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        return FS.lookup(parent, name);
      },
      createNode(parent, name, mode, rdev) {
        assert2(typeof parent == "object");
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node;
      },
      destroyNode(node) {
        FS.hashRemoveNode(node);
      },
      isRoot(node) {
        return node === node.parent;
      },
      isMountpoint(node) {
        return !!node.mounted;
      },
      isFile(mode) {
        return (mode & 61440) === 32768;
      },
      isDir(mode) {
        return (mode & 61440) === 16384;
      },
      isLink(mode) {
        return (mode & 61440) === 40960;
      },
      isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
      isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
      isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
      isSocket(mode) {
        return (mode & 49152) === 49152;
      },
      flagsToPermissionString(flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
          perms += "w";
        }
        return perms;
      },
      nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        if (perms.includes("r") && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes("w") && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes("x") && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
      mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, "x");
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
      mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, "wx");
      },
      mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, "wx");
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
      mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== "r" || flags & (512 | 64)) {
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
      checkOpExists(op, err2) {
        if (!op) {
          throw new FS.ErrnoError(err2);
        }
        return op;
      },
      MAX_OPEN_FDS: 4096,
      nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
      getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
      getStream: /* @__PURE__ */ __name((fd) => FS.streams[fd], "getStream"),
      createStream(stream, fd = -1) {
        assert2(fd >= -1);
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
      closeStream(fd) {
        FS.streams[fd] = null;
      },
      dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
      doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63);
        setattr(arg, attr);
      },
      chrdev_stream_ops: {
        open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          stream.stream_ops = device.stream_ops;
          stream.stream_ops.open?.(stream);
        },
        llseek() {
          throw new FS.ErrnoError(70);
        }
      },
      major: /* @__PURE__ */ __name((dev) => dev >> 8, "major"),
      minor: /* @__PURE__ */ __name((dev) => dev & 255, "minor"),
      makedev: /* @__PURE__ */ __name((ma, mi) => ma << 8 | mi, "makedev"),
      registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
      getDevice: /* @__PURE__ */ __name((dev) => FS.devices[dev], "getDevice"),
      getMounts(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
          var m = check.pop();
          mounts.push(m);
          check.push(...m.mounts);
        }
        return mounts;
      },
      syncfs(populate, callback) {
        if (typeof populate == "function") {
          callback = populate;
          populate = false;
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
        function doCallback(errCode) {
          assert2(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
        __name(doCallback, "doCallback");
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        }
        __name(done, "done");
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },
      mount(type, opts, mountpoint) {
        if (typeof type == "string") {
          throw type;
        }
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
          mountpoint = lookup.path;
          node = lookup.node;
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
        var mount = { type, opts, mountpoint, mounts: [] };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          node.mounted = mount;
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
        return mountRoot;
      },
      unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
          while (current) {
            var next = current.name_next;
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
            current = next;
          }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        assert2(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
      lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
      mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === "." || name === "..") {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
      statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
      },
      statfsStream(stream) {
        return FS.statfsNode(stream.node);
      },
      statfsNode(node) {
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255
        };
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
      create(path, mode = 438) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
      mkdir(path, mode = 511) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
      mkdirTree(path, mode) {
        var dirs = path.split("/");
        var d = "";
        for (var dir of dirs) {
          if (!dir) continue;
          if (d || PATH.isAbs(path)) d += "/";
          d += dir;
          try {
            FS.mkdir(d, mode);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
        }
      },
      mkdev(path, mode, dev) {
        if (typeof dev == "undefined") {
          dev = mode;
          mode = 438;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
      symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
      rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
          throw new FS.ErrnoError(28);
        }
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
          throw new FS.ErrnoError(55);
        }
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (old_node === new_node) {
          return;
        }
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
          throw new FS.ErrnoError(10);
        }
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, "w");
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        FS.hashRemoveNode(old_node);
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          FS.hashAddNode(old_node);
        }
      },
      rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
      readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
      unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
      readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
      stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
      fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63);
        return getattr(arg);
      },
      lstat(path) {
        return FS.stat(path, true);
      },
      doChmod(stream, node, mode, dontFollow) {
        FS.doSetAttr(stream, node, {
          mode: mode & 4095 | node.mode & -4096,
          ctime: Date.now(),
          dontFollow
        });
      },
      chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
      lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
      fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
      doChown(stream, node, dontFollow) {
        FS.doSetAttr(stream, node, { timestamp: Date.now(), dontFollow });
      },
      chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
      lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
      fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
      doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, "w");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, { size: len, timestamp: Date.now() });
      },
      truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
      ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
      utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
        setattr(node, { atime, mtime });
      },
      open(path, flags, mode = 438) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
        if (flags & 64) {
          mode = mode & 4095 | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == "object") {
          node = path;
        } else {
          isDirPath = path.endsWith("/");
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        var created = false;
        if (flags & 64) {
          if (node) {
            if (flags & 128) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            node = FS.mknod(path, mode | 511, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (FS.isChrdev(node.mode)) {
          flags &= -513;
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        if (flags & 512 && !created) {
          FS.truncate(node, 0);
        }
        flags &= -131713;
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          ungotten: [],
          error: false
        });
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 511);
        }
        if (Module2["logReadFiles"] && !(flags & 1)) {
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
      close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null;
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
      isClosed(stream) {
        return stream.fd === null;
      },
      llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
      read(stream, buffer, offset, length, position) {
        assert2(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != "undefined";
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
      write(stream, buffer, offset, length, position, canOwn) {
        assert2(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != "undefined";
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
      mmap(stream, length, position, prot, flags) {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
      msync(stream, buffer, offset, length, mmapFlags) {
        assert2(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
      ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
      readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
          throw new Error(`Invalid encoding type "${opts.encoding}"`);
        }
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
          buf = UTF8ArrayToString(buf);
        }
        FS.close(stream);
        return buf;
      },
      writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == "string") {
          data = new Uint8Array(intArrayFromString(data));
        }
        if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
        } else {
          throw new Error("Unsupported data type");
        }
        FS.close(stream);
      },
      cwd: /* @__PURE__ */ __name(() => FS.currentPath, "cwd"),
      chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, "x");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
      createDefaultDirectories() {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user");
      },
      createDefaultDevices() {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
          read: /* @__PURE__ */ __name(() => 0, "read"),
          write: /* @__PURE__ */ __name((stream, buffer, offset, length, pos) => length, "write"),
          llseek: /* @__PURE__ */ __name(() => 0, "llseek")
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = /* @__PURE__ */ __name(() => {
          if (randomLeft === 0) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        }, "randomByte");
        FS.createDevice("/dev", "random", randomByte);
        FS.createDevice("/dev", "urandom", randomByte);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp");
      },
      createSpecialDirectories() {
        FS.mkdir("/proc");
        var proc_self = FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount(
          {
            mount() {
              var node = FS.createNode(proc_self, "fd", 16895, 73);
              node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
              node.node_ops = {
                lookup(parent, name) {
                  var fd = +name;
                  var stream = FS.getStreamChecked(fd);
                  var ret = {
                    parent: null,
                    mount: { mountpoint: "fake" },
                    node_ops: { readlink: /* @__PURE__ */ __name(() => stream.path, "readlink") },
                    id: fd + 1
                  };
                  ret.parent = ret;
                  return ret;
                },
                readdir() {
                  return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
                }
              };
              return node;
            }
          },
          {},
          "/proc/self/fd"
        );
      },
      createStandardStreams(input, output, error) {
        if (input) {
          FS.createDevice("/dev", "stdin", input);
        } else {
          FS.symlink("/dev/tty", "/dev/stdin");
        }
        if (output) {
          FS.createDevice("/dev", "stdout", null, output);
        } else {
          FS.symlink("/dev/tty", "/dev/stdout");
        }
        if (error) {
          FS.createDevice("/dev", "stderr", null, error);
        } else {
          FS.symlink("/dev/tty1", "/dev/stderr");
        }
        var stdin2 = FS.open("/dev/stdin", 0);
        var stdout2 = FS.open("/dev/stdout", 1);
        var stderr2 = FS.open("/dev/stderr", 1);
        assert2(stdin2.fd === 0, `invalid handle for stdin (${stdin2.fd})`);
        assert2(stdout2.fd === 1, `invalid handle for stdout (${stdout2.fd})`);
        assert2(stderr2.fd === 2, `invalid handle for stderr (${stderr2.fd})`);
      },
      staticInit() {
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = { MEMFS };
      },
      init(input, output, error) {
        assert2(
          !FS.initialized,
          "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)"
        );
        FS.initialized = true;
        input ??= Module2["stdin"];
        output ??= Module2["stdout"];
        error ??= Module2["stderr"];
        FS.createStandardStreams(input, output, error);
      },
      quit() {
        FS.initialized = false;
        _fflush(0);
        for (var stream of FS.streams) {
          if (stream) {
            FS.close(stream);
          }
        }
      },
      findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
      analyzePath(path, dontResolveLastLink) {
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === "/";
        } catch (e) {
          ret.error = e.errno;
        }
        return ret;
      },
      createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
      createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
      createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == "string" ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == "string") {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
      createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === void 0 && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === void 0) break;
              bytesRead++;
              buffer[offset + i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset + i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
      forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != "undefined") {
          throw new Error(
            "Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread."
          );
        } else {
          try {
            obj.contents = readBinary(obj.url);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
      createLazyFile(parent, name, url, canRead, canWrite) {
        class LazyUint8Array {
          static {
            __name(this, "LazyUint8Array");
          }
          lengthKnown = false;
          chunks = [];
          get(idx) {
            if (idx > this.length - 1 || idx < 0) {
              return void 0;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            var xhr = new XMLHttpRequest();
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
              throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing) chunkSize = datalength;
            var doXHR = /* @__PURE__ */ __name((from, to) => {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
              var xhr2 = new XMLHttpRequest();
              xhr2.open("GET", url, false);
              if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
              xhr2.responseType = "arraybuffer";
              if (xhr2.overrideMimeType) {
                xhr2.overrideMimeType("text/plain; charset=x-user-defined");
              }
              xhr2.send(null);
              if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304))
                throw new Error("Couldn't load " + url + ". Status: " + xhr2.status);
              if (xhr2.response !== void 0) {
                return new Uint8Array(xhr2.response || []);
              }
              return intArrayFromString(xhr2.responseText || "");
            }, "doXHR");
            var lazyArray2 = this;
            lazyArray2.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum + 1) * chunkSize - 1;
              end = Math.min(end, datalength - 1);
              if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
                lazyArray2.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray2.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
              return lazyArray2.chunks[chunkNum];
            });
            if (usesGzip || !datalength) {
              chunkSize = datalength = 1;
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
        if (typeof XMLHttpRequest != "undefined") {
          if (!ENVIRONMENT_IS_WORKER)
            throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url };
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        Object.defineProperties(node, {
          usedBytes: {
            get: /* @__PURE__ */ __name(function() {
              return this.contents.length;
            }, "get")
          }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length) return 0;
          var size = Math.min(contents.length - position, length);
          assert2(size >= 0);
          if (contents.slice) {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        __name(writeChunks, "writeChunks");
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position);
        };
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
      absolutePath() {
        abort2("FS.absolutePath has been removed; use PATH_FS.resolve instead");
      },
      createFolder() {
        abort2("FS.createFolder has been removed; use FS.mkdir instead");
      },
      createLink() {
        abort2("FS.createLink has been removed; use FS.symlink instead");
      },
      joinPath() {
        abort2("FS.joinPath has been removed; use PATH.join instead");
      },
      mmapAlloc() {
        abort2("FS.mmapAlloc has been replaced by the top level function mmapAlloc");
      },
      standardizePath() {
        abort2("FS.standardizePath has been removed; use PATH.normalize instead");
      }
    };
    var SYSCALLS = {
      DEFAULT_POLLMASK: 5,
      calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);
          }
          return dir;
        }
        return dir + "/" + path;
      },
      writeStat(buf, stat) {
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = stat.mode;
        HEAPU32[buf + 8 >> 2] = stat.nlink;
        HEAP32[buf + 12 >> 2] = stat.uid;
        HEAP32[buf + 16 >> 2] = stat.gid;
        HEAP32[buf + 20 >> 2] = stat.rdev;
        HEAP64[buf + 24 >> 3] = BigInt(stat.size);
        HEAP32[buf + 32 >> 2] = 4096;
        HEAP32[buf + 36 >> 2] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
        HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
        HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
        HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
        return 0;
      },
      writeStatFs(buf, stats) {
        HEAP32[buf + 4 >> 2] = stats.bsize;
        HEAP32[buf + 40 >> 2] = stats.bsize;
        HEAP32[buf + 8 >> 2] = stats.blocks;
        HEAP32[buf + 12 >> 2] = stats.bfree;
        HEAP32[buf + 16 >> 2] = stats.bavail;
        HEAP32[buf + 20 >> 2] = stats.files;
        HEAP32[buf + 24 >> 2] = stats.ffree;
        HEAP32[buf + 28 >> 2] = stats.fsid;
        HEAP32[buf + 44 >> 2] = stats.flags;
        HEAP32[buf + 36 >> 2] = stats.namelen;
      },
      doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
      getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
      varargs: void 0,
      getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      }
    };
    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = syscallGetVarargI();
            if (arg < 0) {
              return -28;
            }
            while (FS.streams[arg]) {
              arg++;
            }
            var newStream;
            newStream = FS.dupStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = syscallGetVarargI();
            stream.flags |= arg;
            return 0;
          }
          case 12: {
            var arg = syscallGetVarargP();
            var offset = 0;
            HEAP16[arg + offset >> 1] = 2;
            return 0;
          }
          case 13:
          case 14:
            return 0;
        }
        return -28;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_fcntl64, "___syscall_fcntl64");
    function ___syscall_fstat64(fd, buf) {
      try {
        return SYSCALLS.writeStat(buf, FS.fstat(fd));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_fstat64, "___syscall_fstat64");
    var INT53_MAX = 9007199254740992;
    var INT53_MIN = -9007199254740992;
    var bigintToI53Checked = /* @__PURE__ */ __name((num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num), "bigintToI53Checked");
    function ___syscall_ftruncate64(fd, length) {
      length = bigintToI53Checked(length);
      try {
        if (isNaN(length)) return -61;
        FS.ftruncate(fd, length);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_ftruncate64, "___syscall_ftruncate64");
    var stringToUTF82 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => {
      assert2(
        typeof maxBytesToWrite == "number",
        "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!"
      );
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }, "stringToUTF8");
    function ___syscall_getdents64(fd, dirp, count) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        stream.getdents ||= FS.readdir(stream.path);
        var struct_size = 280;
        var pos = 0;
        var off2 = FS.llseek(stream, 0, 1);
        var startIdx = Math.floor(off2 / struct_size);
        var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / struct_size));
        for (var idx = startIdx; idx < endIdx; idx++) {
          var id;
          var type;
          var name = stream.getdents[idx];
          if (name === ".") {
            id = stream.node.id;
            type = 4;
          } else if (name === "..") {
            var lookup = FS.lookupPath(stream.path, { parent: true });
            id = lookup.node.id;
            type = 4;
          } else {
            var child;
            try {
              child = FS.lookupNode(stream.node, name);
            } catch (e) {
              if (e?.errno === 28) {
                continue;
              }
              throw e;
            }
            id = child.id;
            type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
          }
          assert2(id);
          HEAP64[dirp + pos >> 3] = BigInt(id);
          HEAP64[dirp + pos + 8 >> 3] = BigInt((idx + 1) * struct_size);
          HEAP16[dirp + pos + 16 >> 1] = 280;
          HEAP8[dirp + pos + 18] = type;
          stringToUTF82(name, dirp + pos + 19, 256);
          pos += struct_size;
        }
        FS.llseek(stream, idx * struct_size, 0);
        return pos;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_getdents64, "___syscall_getdents64");
    function ___syscall_ioctl(fd, op, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
          case 21509: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21505: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcgets) {
              var termios = stream.tty.ops.ioctl_tcgets(stream);
              var argp = syscallGetVarargP();
              HEAP32[argp >> 2] = termios.c_iflag || 0;
              HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
              HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
              HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
              for (var i = 0; i < 32; i++) {
                HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
              }
              return 0;
            }
            return 0;
          }
          case 21510:
          case 21511:
          case 21512: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcsets) {
              var argp = syscallGetVarargP();
              var c_iflag = HEAP32[argp >> 2];
              var c_oflag = HEAP32[argp + 4 >> 2];
              var c_cflag = HEAP32[argp + 8 >> 2];
              var c_lflag = HEAP32[argp + 12 >> 2];
              var c_cc = [];
              for (var i = 0; i < 32; i++) {
                c_cc.push(HEAP8[argp + i + 17]);
              }
              return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
                c_iflag,
                c_oflag,
                c_cflag,
                c_lflag,
                c_cc
              });
            }
            return 0;
          }
          case 21519: {
            if (!stream.tty) return -59;
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = 0;
            return 0;
          }
          case 21520: {
            if (!stream.tty) return -59;
            return -28;
          }
          case 21531: {
            var argp = syscallGetVarargP();
            return FS.ioctl(stream, op, argp);
          }
          case 21523: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tiocgwinsz) {
              var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
              var argp = syscallGetVarargP();
              HEAP16[argp >> 1] = winsize[0];
              HEAP16[argp + 2 >> 1] = winsize[1];
            }
            return 0;
          }
          case 21524: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21515: {
            if (!stream.tty) return -59;
            return 0;
          }
          default:
            return -28;
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_ioctl, "___syscall_ioctl");
    function ___syscall_lstat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.writeStat(buf, FS.lstat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_lstat64, "___syscall_lstat64");
    function ___syscall_newfstatat(dirfd, path, buf, flags) {
      try {
        path = SYSCALLS.getStr(path);
        var nofollow = flags & 256;
        var allowEmpty = flags & 4096;
        flags = flags & ~6400;
        assert2(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
        path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
        return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_newfstatat, "___syscall_newfstatat");
    function ___syscall_openat(dirfd, path, flags, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? syscallGetVarargI() : 0;
        return FS.open(path, flags, mode).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_openat, "___syscall_openat");
    function ___syscall_rmdir(path) {
      try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_rmdir, "___syscall_rmdir");
    function ___syscall_stat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.writeStat(buf, FS.stat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_stat64, "___syscall_stat64");
    function ___syscall_unlinkat(dirfd, path, flags) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (!flags) {
          FS.unlink(path);
        } else if (flags === 512) {
          FS.rmdir(path);
        } else {
          return -28;
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    __name(___syscall_unlinkat, "___syscall_unlinkat");
    var __abort_js = /* @__PURE__ */ __name(() => abort2("native code called abort()"), "__abort_js");
    var __emscripten_throw_longjmp = /* @__PURE__ */ __name(() => {
      throw Infinity;
    }, "__emscripten_throw_longjmp");
    function __gmtime_js(time, tmPtr) {
      time = bigintToI53Checked(time);
      var date = new Date(time * 1e3);
      HEAP32[tmPtr >> 2] = date.getUTCSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
      HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
      HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
    }
    __name(__gmtime_js, "__gmtime_js");
    var isLeapYear = /* @__PURE__ */ __name((year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0), "isLeapYear");
    var MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    var MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var ydayFromDate = /* @__PURE__ */ __name((date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
      return yday;
    }, "ydayFromDate");
    function __localtime_js(time, tmPtr) {
      time = bigintToI53Checked(time);
      var date = new Date(time * 1e3);
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = ydayFromDate(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
      HEAP32[tmPtr + 32 >> 2] = dst;
    }
    __name(__localtime_js, "__localtime_js");
    var __tzset_js = /* @__PURE__ */ __name((timezone, daylight, std_name, dst_name) => {
      var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
      var extractZone = /* @__PURE__ */ __name((timezoneOffset) => {
        var sign = timezoneOffset >= 0 ? "-" : "+";
        var absOffset = Math.abs(timezoneOffset);
        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        var minutes = String(absOffset % 60).padStart(2, "0");
        return `UTC${sign}${hours}${minutes}`;
      }, "extractZone");
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      assert2(winterName);
      assert2(summerName);
      assert2(lengthBytesUTF82(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
      assert2(lengthBytesUTF82(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
      if (summerOffset < winterOffset) {
        stringToUTF82(winterName, std_name, 17);
        stringToUTF82(summerName, dst_name, 17);
      } else {
        stringToUTF82(winterName, dst_name, 17);
        stringToUTF82(summerName, std_name, 17);
      }
    }, "__tzset_js");
    var _emscripten_date_now = /* @__PURE__ */ __name(() => Date.now(), "_emscripten_date_now");
    var getHeapMax = /* @__PURE__ */ __name(() => 2147483648, "getHeapMax");
    var growMemory = /* @__PURE__ */ __name((size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
        err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
      }
    }, "growMemory");
    var _emscripten_resize_heap = /* @__PURE__ */ __name((requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      assert2(requestedSize > oldSize);
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
      return false;
    }, "_emscripten_resize_heap");
    var ENV = {};
    var getExecutableName = /* @__PURE__ */ __name(() => thisProgram || "./this.program", "getExecutableName");
    var getEnvStrings = /* @__PURE__ */ __name(() => {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.language || "C").replace("-", "_") + ".UTF-8";
        var env2 = {
          USER: "web_user",
          LOGNAME: "web_user",
          PATH: "/",
          PWD: "/",
          HOME: "/home/web_user",
          LANG: lang,
          _: getExecutableName()
        };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env2[x];
          else env2[x] = ENV[x];
        }
        var strings = [];
        for (var x in env2) {
          strings.push(`${x}=${env2[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    }, "getEnvStrings");
    var _environ_get = /* @__PURE__ */ __name((__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + envp >> 2] = ptr;
        bufSize += stringToUTF82(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    }, "_environ_get");
    var _environ_sizes_get = /* @__PURE__ */ __name((penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF82(string) + 1;
      }
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    }, "_environ_sizes_get");
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    __name(_fd_close, "_fd_close");
    var doReadv = /* @__PURE__ */ __name((stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
      }
      return ret;
    }, "doReadv");
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    __name(_fd_read, "_fd_read");
    function _fd_seek(fd, offset, whence, newOffset) {
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        HEAP64[newOffset >> 3] = BigInt(stream.position);
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    __name(_fd_seek, "_fd_seek");
    function _fd_sync(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (stream.stream_ops?.fsync) {
          return stream.stream_ops.fsync(stream);
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    __name(_fd_sync, "_fd_sync");
    var doWritev = /* @__PURE__ */ __name((stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) {
          break;
        }
      }
      return ret;
    }, "doWritev");
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    __name(_fd_write, "_fd_write");
    var wasmTableMirror = [];
    var wasmTable;
    var getWasmTableEntry = /* @__PURE__ */ __name((funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      assert2(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
      return func;
    }, "getWasmTableEntry");
    var getCFunc = /* @__PURE__ */ __name((ident) => {
      var func = Module2["_" + ident];
      assert2(func, "Cannot call unknown function " + ident + ", make sure it is exported");
      return func;
    }, "getCFunc");
    var writeArrayToMemory = /* @__PURE__ */ __name((array, buffer) => {
      assert2(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
      HEAP8.set(array, buffer);
    }, "writeArrayToMemory");
    var stackAlloc = /* @__PURE__ */ __name((sz) => __emscripten_stack_alloc(sz), "stackAlloc");
    var stringToUTF8OnStack = /* @__PURE__ */ __name((str) => {
      var size = lengthBytesUTF82(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF82(str, ret, size);
      return ret;
    }, "stringToUTF8OnStack");
    var ccall = /* @__PURE__ */ __name((ident, returnType, argTypes, args, opts) => {
      var toC = {
        string: /* @__PURE__ */ __name((str) => {
          var ret2 = 0;
          if (str !== null && str !== void 0 && str !== 0) {
            ret2 = stringToUTF8OnStack(str);
          }
          return ret2;
        }, "string"),
        array: /* @__PURE__ */ __name((arr) => {
          var ret2 = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret2);
          return ret2;
        }, "array")
      };
      function convertReturnValue(ret2) {
        if (returnType === "string") {
          return UTF8ToString(ret2);
        }
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      __name(convertReturnValue, "convertReturnValue");
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert2(returnType !== "array", 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret2) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      __name(onDone, "onDone");
      ret = onDone(ret);
      return ret;
    }, "ccall");
    var cwrap = /* @__PURE__ */ __name((ident, returnType, argTypes, opts) => (...args) => ccall(ident, returnType, argTypes, args), "cwrap");
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.staticInit();
    {
      if (Module2["noExitRuntime"]) Module2["noExitRuntime"];
      if (Module2["preloadPlugins"]) preloadPlugins = Module2["preloadPlugins"];
      if (Module2["print"]) out = Module2["print"];
      if (Module2["printErr"]) err = Module2["printErr"];
      if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
      checkIncomingModuleAPI();
      if (Module2["arguments"]) Module2["arguments"];
      if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
      assert2(
        typeof Module2["memoryInitializerPrefixURL"] == "undefined",
        "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead"
      );
      assert2(
        typeof Module2["pthreadMainPrefixURL"] == "undefined",
        "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead"
      );
      assert2(
        typeof Module2["cdInitializerPrefixURL"] == "undefined",
        "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead"
      );
      assert2(
        typeof Module2["filePackagePrefixURL"] == "undefined",
        "Module.filePackagePrefixURL option was removed, use Module.locateFile instead"
      );
      assert2(typeof Module2["read"] == "undefined", "Module.read option was removed");
      assert2(typeof Module2["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
      assert2(
        typeof Module2["readBinary"] == "undefined",
        "Module.readBinary option was removed (modify readBinary in JS)"
      );
      assert2(
        typeof Module2["setWindowTitle"] == "undefined",
        "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)"
      );
      assert2(
        typeof Module2["TOTAL_MEMORY"] == "undefined",
        "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY"
      );
      assert2(
        typeof Module2["ENVIRONMENT"] == "undefined",
        "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)"
      );
      assert2(
        typeof Module2["STACK_SIZE"] == "undefined",
        "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time"
      );
      assert2(
        typeof Module2["wasmMemory"] == "undefined",
        "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally"
      );
      assert2(
        typeof Module2["INITIAL_MEMORY"] == "undefined",
        "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically"
      );
    }
    Module2["wasmExports"] = wasmExports;
    Module2["ccall"] = ccall;
    Module2["cwrap"] = cwrap;
    var missingLibrarySymbols = [
      "writeI53ToI64",
      "writeI53ToI64Clamped",
      "writeI53ToI64Signaling",
      "writeI53ToU64Clamped",
      "writeI53ToU64Signaling",
      "readI53FromI64",
      "readI53FromU64",
      "convertI32PairToI53",
      "convertI32PairToI53Checked",
      "convertU32PairToI53",
      "getTempRet0",
      "setTempRet0",
      "exitJS",
      "withStackSave",
      "inetPton4",
      "inetNtop4",
      "inetPton6",
      "inetNtop6",
      "readSockaddr",
      "writeSockaddr",
      "emscriptenLog",
      "readEmAsmArgs",
      "jstoi_q",
      "autoResumeAudioContext",
      "getDynCaller",
      "dynCall",
      "handleException",
      "keepRuntimeAlive",
      "runtimeKeepalivePush",
      "runtimeKeepalivePop",
      "callUserCallback",
      "maybeExit",
      "asmjsMangle",
      "HandleAllocator",
      "getNativeTypeSize",
      "addOnInit",
      "addOnPostCtor",
      "addOnPreMain",
      "addOnExit",
      "STACK_SIZE",
      "STACK_ALIGN",
      "POINTER_SIZE",
      "ASSERTIONS",
      "uleb128Encode",
      "sigToWasmTypes",
      "generateFuncType",
      "convertJsFunctionToWasm",
      "getEmptyTableSlot",
      "updateTableMap",
      "getFunctionAddress",
      "addFunction",
      "removeFunction",
      "reallyNegative",
      "unSign",
      "strLen",
      "reSign",
      "formatString",
      "intArrayToString",
      "AsciiToString",
      "stringToAscii",
      "UTF16ToString",
      "stringToUTF16",
      "lengthBytesUTF16",
      "UTF32ToString",
      "stringToUTF32",
      "lengthBytesUTF32",
      "stringToNewUTF8",
      "registerKeyEventCallback",
      "maybeCStringToJsString",
      "findEventTarget",
      "getBoundingClientRect",
      "fillMouseEventData",
      "registerMouseEventCallback",
      "registerWheelEventCallback",
      "registerUiEventCallback",
      "registerFocusEventCallback",
      "fillDeviceOrientationEventData",
      "registerDeviceOrientationEventCallback",
      "fillDeviceMotionEventData",
      "registerDeviceMotionEventCallback",
      "screenOrientation",
      "fillOrientationChangeEventData",
      "registerOrientationChangeEventCallback",
      "fillFullscreenChangeEventData",
      "registerFullscreenChangeEventCallback",
      "JSEvents_requestFullscreen",
      "JSEvents_resizeCanvasForFullscreen",
      "registerRestoreOldStyle",
      "hideEverythingExceptGivenElement",
      "restoreHiddenElements",
      "setLetterbox",
      "softFullscreenResizeWebGLRenderTarget",
      "doRequestFullscreen",
      "fillPointerlockChangeEventData",
      "registerPointerlockChangeEventCallback",
      "registerPointerlockErrorEventCallback",
      "requestPointerLock",
      "fillVisibilityChangeEventData",
      "registerVisibilityChangeEventCallback",
      "registerTouchEventCallback",
      "fillGamepadEventData",
      "registerGamepadEventCallback",
      "registerBeforeUnloadEventCallback",
      "fillBatteryEventData",
      "battery",
      "registerBatteryEventCallback",
      "setCanvasElementSize",
      "getCanvasElementSize",
      "jsStackTrace",
      "getCallstack",
      "convertPCtoSourceLocation",
      "checkWasiClock",
      "wasiRightsToMuslOFlags",
      "wasiOFlagsToMuslOFlags",
      "safeSetTimeout",
      "setImmediateWrapped",
      "safeRequestAnimationFrame",
      "clearImmediateWrapped",
      "registerPostMainLoop",
      "registerPreMainLoop",
      "getPromise",
      "makePromise",
      "idsToPromises",
      "makePromiseCallback",
      "ExceptionInfo",
      "findMatchingCatch",
      "Browser_asyncPrepareDataCounter",
      "arraySum",
      "addDays",
      "getSocketFromFD",
      "getSocketAddress",
      "FS_mkdirTree",
      "_setNetworkCallback",
      "heapObjectForWebGLType",
      "toTypedArrayIndex",
      "webgl_enable_ANGLE_instanced_arrays",
      "webgl_enable_OES_vertex_array_object",
      "webgl_enable_WEBGL_draw_buffers",
      "webgl_enable_WEBGL_multi_draw",
      "webgl_enable_EXT_polygon_offset_clamp",
      "webgl_enable_EXT_clip_control",
      "webgl_enable_WEBGL_polygon_mode",
      "emscriptenWebGLGet",
      "computeUnpackAlignedImageSize",
      "colorChannelsInGlTextureFormat",
      "emscriptenWebGLGetTexPixelData",
      "emscriptenWebGLGetUniform",
      "webglGetUniformLocation",
      "webglPrepareUniformLocationsBeforeFirstUse",
      "webglGetLeftBracePos",
      "emscriptenWebGLGetVertexAttrib",
      "__glGetActiveAttribOrUniform",
      "writeGLArray",
      "registerWebGlEventCallback",
      "runAndAbortIfError",
      "ALLOC_NORMAL",
      "ALLOC_STACK",
      "allocate",
      "writeStringToMemory",
      "writeAsciiToMemory",
      "demangle",
      "stackTrace"
    ];
    missingLibrarySymbols.forEach(missingLibrarySymbol);
    var unexportedSymbols = [
      "run",
      "addRunDependency",
      "removeRunDependency",
      "out",
      "err",
      "callMain",
      "abort",
      "wasmMemory",
      "HEAP64",
      "HEAPU64",
      "writeStackCookie",
      "checkStackCookie",
      "INT53_MAX",
      "INT53_MIN",
      "bigintToI53Checked",
      "stackSave",
      "stackRestore",
      "stackAlloc",
      "ptrToString",
      "zeroMemory",
      "getHeapMax",
      "growMemory",
      "ENV",
      "ERRNO_CODES",
      "strError",
      "DNS",
      "Protocols",
      "Sockets",
      "timers",
      "warnOnce",
      "readEmAsmArgsArray",
      "getExecutableName",
      "asyncLoad",
      "alignMemory",
      "mmapAlloc",
      "wasmTable",
      "getUniqueRunDependency",
      "noExitRuntime",
      "addOnPreRun",
      "addOnPostRun",
      "freeTableIndexes",
      "functionsInTableMap",
      "setValue",
      "getValue",
      "PATH",
      "PATH_FS",
      "UTF8Decoder",
      "UTF8ArrayToString",
      "UTF8ToString",
      "stringToUTF8Array",
      "stringToUTF8",
      "lengthBytesUTF8",
      "intArrayFromString",
      "UTF16Decoder",
      "stringToUTF8OnStack",
      "writeArrayToMemory",
      "JSEvents",
      "specialHTMLTargets",
      "findCanvasEventTarget",
      "currentFullscreenStrategy",
      "restoreOldWindowedStyle",
      "UNWIND_CACHE",
      "ExitStatus",
      "getEnvStrings",
      "doReadv",
      "doWritev",
      "initRandomFill",
      "randomFill",
      "emSetImmediate",
      "emClearImmediate_deps",
      "emClearImmediate",
      "promiseMap",
      "uncaughtExceptionCount",
      "exceptionLast",
      "exceptionCaught",
      "Browser",
      "requestFullscreen",
      "requestFullScreen",
      "setCanvasSize",
      "getUserMedia",
      "createContext",
      "getPreloadedImageData__data",
      "wget",
      "MONTH_DAYS_REGULAR",
      "MONTH_DAYS_LEAP",
      "MONTH_DAYS_REGULAR_CUMULATIVE",
      "MONTH_DAYS_LEAP_CUMULATIVE",
      "isLeapYear",
      "ydayFromDate",
      "SYSCALLS",
      "preloadPlugins",
      "FS_createPreloadedFile",
      "FS_modeStringToFlags",
      "FS_getMode",
      "FS_stdin_getChar_buffer",
      "FS_stdin_getChar",
      "FS_unlink",
      "FS_createPath",
      "FS_createDevice",
      "FS_readFile",
      "FS",
      "FS_root",
      "FS_mounts",
      "FS_devices",
      "FS_streams",
      "FS_nextInode",
      "FS_nameTable",
      "FS_currentPath",
      "FS_initialized",
      "FS_ignorePermissions",
      "FS_filesystems",
      "FS_syncFSRequests",
      "FS_readFiles",
      "FS_lookupPath",
      "FS_getPath",
      "FS_hashName",
      "FS_hashAddNode",
      "FS_hashRemoveNode",
      "FS_lookupNode",
      "FS_createNode",
      "FS_destroyNode",
      "FS_isRoot",
      "FS_isMountpoint",
      "FS_isFile",
      "FS_isDir",
      "FS_isLink",
      "FS_isChrdev",
      "FS_isBlkdev",
      "FS_isFIFO",
      "FS_isSocket",
      "FS_flagsToPermissionString",
      "FS_nodePermissions",
      "FS_mayLookup",
      "FS_mayCreate",
      "FS_mayDelete",
      "FS_mayOpen",
      "FS_checkOpExists",
      "FS_nextfd",
      "FS_getStreamChecked",
      "FS_getStream",
      "FS_createStream",
      "FS_closeStream",
      "FS_dupStream",
      "FS_doSetAttr",
      "FS_chrdev_stream_ops",
      "FS_major",
      "FS_minor",
      "FS_makedev",
      "FS_registerDevice",
      "FS_getDevice",
      "FS_getMounts",
      "FS_syncfs",
      "FS_mount",
      "FS_unmount",
      "FS_lookup",
      "FS_mknod",
      "FS_statfs",
      "FS_statfsStream",
      "FS_statfsNode",
      "FS_create",
      "FS_mkdir",
      "FS_mkdev",
      "FS_symlink",
      "FS_rename",
      "FS_rmdir",
      "FS_readdir",
      "FS_readlink",
      "FS_stat",
      "FS_fstat",
      "FS_lstat",
      "FS_doChmod",
      "FS_chmod",
      "FS_lchmod",
      "FS_fchmod",
      "FS_doChown",
      "FS_chown",
      "FS_lchown",
      "FS_fchown",
      "FS_doTruncate",
      "FS_truncate",
      "FS_ftruncate",
      "FS_utime",
      "FS_open",
      "FS_close",
      "FS_isClosed",
      "FS_llseek",
      "FS_read",
      "FS_write",
      "FS_mmap",
      "FS_msync",
      "FS_ioctl",
      "FS_writeFile",
      "FS_cwd",
      "FS_chdir",
      "FS_createDefaultDirectories",
      "FS_createDefaultDevices",
      "FS_createSpecialDirectories",
      "FS_createStandardStreams",
      "FS_staticInit",
      "FS_init",
      "FS_quit",
      "FS_findObject",
      "FS_analyzePath",
      "FS_createFile",
      "FS_createDataFile",
      "FS_forceLoadFile",
      "FS_createLazyFile",
      "FS_absolutePath",
      "FS_createFolder",
      "FS_createLink",
      "FS_joinPath",
      "FS_mmapAlloc",
      "FS_standardizePath",
      "MEMFS",
      "TTY",
      "PIPEFS",
      "SOCKFS",
      "tempFixedLengthArray",
      "miniTempWebGLFloatBuffers",
      "miniTempWebGLIntBuffers",
      "GL",
      "AL",
      "GLUT",
      "EGL",
      "GLEW",
      "IDBStore",
      "SDL",
      "SDL_gfx",
      "allocateUTF8",
      "allocateUTF8OnStack",
      "print",
      "printErr",
      "jstoi_s"
    ];
    unexportedSymbols.forEach(unexportedRuntimeSymbol);
    function checkIncomingModuleAPI() {
      ignoredModuleProp("fetchSettings");
    }
    __name(checkIncomingModuleAPI, "checkIncomingModuleAPI");
    Module2["_PDFium_Init"] = makeInvalidEarlyAccess("_PDFium_Init");
    Module2["_FPDF_InitLibraryWithConfig"] = makeInvalidEarlyAccess("_FPDF_InitLibraryWithConfig");
    Module2["_FPDFAnnot_IsSupportedSubtype"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_IsSupportedSubtype"
    );
    Module2["_FPDFPage_CreateAnnot"] = makeInvalidEarlyAccess("_FPDFPage_CreateAnnot");
    Module2["_FPDFPage_GetAnnotCount"] = makeInvalidEarlyAccess("_FPDFPage_GetAnnotCount");
    Module2["_FPDFPage_GetAnnot"] = makeInvalidEarlyAccess("_FPDFPage_GetAnnot");
    Module2["_FPDFPage_GetAnnotIndex"] = makeInvalidEarlyAccess("_FPDFPage_GetAnnotIndex");
    Module2["_FPDFPage_CloseAnnot"] = makeInvalidEarlyAccess("_FPDFPage_CloseAnnot");
    Module2["_FPDFPage_RemoveAnnot"] = makeInvalidEarlyAccess("_FPDFPage_RemoveAnnot");
    Module2["_FPDFAnnot_GetSubtype"] = makeInvalidEarlyAccess("_FPDFAnnot_GetSubtype");
    Module2["_FPDFAnnot_IsObjectSupportedSubtype"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_IsObjectSupportedSubtype"
    );
    Module2["_FPDFAnnot_UpdateObject"] = makeInvalidEarlyAccess("_FPDFAnnot_UpdateObject");
    Module2["_FPDFAnnot_AddInkStroke"] = makeInvalidEarlyAccess("_FPDFAnnot_AddInkStroke");
    Module2["_FPDFAnnot_RemoveInkList"] = makeInvalidEarlyAccess("_FPDFAnnot_RemoveInkList");
    Module2["_FPDFAnnot_AppendObject"] = makeInvalidEarlyAccess("_FPDFAnnot_AppendObject");
    Module2["_FPDFAnnot_GetObjectCount"] = makeInvalidEarlyAccess("_FPDFAnnot_GetObjectCount");
    Module2["_FPDFAnnot_GetObject"] = makeInvalidEarlyAccess("_FPDFAnnot_GetObject");
    Module2["_FPDFAnnot_RemoveObject"] = makeInvalidEarlyAccess("_FPDFAnnot_RemoveObject");
    Module2["_FPDFAnnot_SetColor"] = makeInvalidEarlyAccess("_FPDFAnnot_SetColor");
    Module2["_FPDFAnnot_GetColor"] = makeInvalidEarlyAccess("_FPDFAnnot_GetColor");
    Module2["_FPDFAnnot_HasAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_HasAttachmentPoints"
    );
    Module2["_FPDFAnnot_SetAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_SetAttachmentPoints"
    );
    Module2["_FPDFAnnot_AppendAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_AppendAttachmentPoints"
    );
    Module2["_FPDFAnnot_CountAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_CountAttachmentPoints"
    );
    Module2["_FPDFAnnot_GetAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetAttachmentPoints"
    );
    Module2["_FPDFAnnot_SetRect"] = makeInvalidEarlyAccess("_FPDFAnnot_SetRect");
    Module2["_FPDFAnnot_GetRect"] = makeInvalidEarlyAccess("_FPDFAnnot_GetRect");
    Module2["_FPDFAnnot_GetVertices"] = makeInvalidEarlyAccess("_FPDFAnnot_GetVertices");
    Module2["_FPDFAnnot_GetInkListCount"] = makeInvalidEarlyAccess("_FPDFAnnot_GetInkListCount");
    Module2["_FPDFAnnot_GetInkListPath"] = makeInvalidEarlyAccess("_FPDFAnnot_GetInkListPath");
    Module2["_FPDFAnnot_GetLine"] = makeInvalidEarlyAccess("_FPDFAnnot_GetLine");
    Module2["_FPDFAnnot_SetBorder"] = makeInvalidEarlyAccess("_FPDFAnnot_SetBorder");
    Module2["_FPDFAnnot_GetBorder"] = makeInvalidEarlyAccess("_FPDFAnnot_GetBorder");
    Module2["_FPDFAnnot_HasKey"] = makeInvalidEarlyAccess("_FPDFAnnot_HasKey");
    Module2["_FPDFAnnot_GetValueType"] = makeInvalidEarlyAccess("_FPDFAnnot_GetValueType");
    Module2["_FPDFAnnot_SetStringValue"] = makeInvalidEarlyAccess("_FPDFAnnot_SetStringValue");
    Module2["_FPDFAnnot_GetStringValue"] = makeInvalidEarlyAccess("_FPDFAnnot_GetStringValue");
    Module2["_FPDFAnnot_GetNumberValue"] = makeInvalidEarlyAccess("_FPDFAnnot_GetNumberValue");
    Module2["_FPDFAnnot_SetAP"] = makeInvalidEarlyAccess("_FPDFAnnot_SetAP");
    Module2["_FPDFAnnot_GetAP"] = makeInvalidEarlyAccess("_FPDFAnnot_GetAP");
    Module2["_FPDFAnnot_GetLinkedAnnot"] = makeInvalidEarlyAccess("_FPDFAnnot_GetLinkedAnnot");
    Module2["_FPDFAnnot_GetFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFlags");
    Module2["_FPDFAnnot_SetFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_SetFlags");
    Module2["_FPDFAnnot_GetFormFieldFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldFlags");
    Module2["_FPDFAnnot_SetFormFieldFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_SetFormFieldFlags");
    Module2["_FPDFAnnot_GetFormFieldAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormFieldAtPoint"
    );
    Module2["_FPDFAnnot_GetFormFieldName"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldName");
    Module2["_FPDFAnnot_GetFormFieldType"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldType");
    Module2["_FPDFAnnot_GetFormAdditionalActionJavaScript"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormAdditionalActionJavaScript");
    Module2["_FPDFAnnot_GetFormFieldAlternateName"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormFieldAlternateName"
    );
    Module2["_FPDFAnnot_GetFormFieldValue"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldValue");
    Module2["_FPDFAnnot_GetOptionCount"] = makeInvalidEarlyAccess("_FPDFAnnot_GetOptionCount");
    Module2["_FPDFAnnot_GetOptionLabel"] = makeInvalidEarlyAccess("_FPDFAnnot_GetOptionLabel");
    Module2["_FPDFAnnot_IsOptionSelected"] = makeInvalidEarlyAccess("_FPDFAnnot_IsOptionSelected");
    Module2["_FPDFAnnot_GetFontSize"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFontSize");
    Module2["_FPDFAnnot_SetFontColor"] = makeInvalidEarlyAccess("_FPDFAnnot_SetFontColor");
    Module2["_FPDFAnnot_GetFontColor"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFontColor");
    Module2["_FPDFAnnot_IsChecked"] = makeInvalidEarlyAccess("_FPDFAnnot_IsChecked");
    Module2["_FPDFAnnot_SetFocusableSubtypes"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_SetFocusableSubtypes"
    );
    Module2["_FPDFAnnot_GetFocusableSubtypesCount"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFocusableSubtypesCount"
    );
    Module2["_FPDFAnnot_GetFocusableSubtypes"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFocusableSubtypes"
    );
    Module2["_FPDFAnnot_GetLink"] = makeInvalidEarlyAccess("_FPDFAnnot_GetLink");
    Module2["_FPDFAnnot_GetFormControlCount"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormControlCount"
    );
    Module2["_FPDFAnnot_GetFormControlIndex"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormControlIndex"
    );
    Module2["_FPDFAnnot_GetFormFieldExportValue"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormFieldExportValue"
    );
    Module2["_FPDFAnnot_SetURI"] = makeInvalidEarlyAccess("_FPDFAnnot_SetURI");
    Module2["_FPDFAnnot_GetFileAttachment"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFileAttachment");
    Module2["_FPDFAnnot_AddFileAttachment"] = makeInvalidEarlyAccess("_FPDFAnnot_AddFileAttachment");
    Module2["_FPDFDoc_GetAttachmentCount"] = makeInvalidEarlyAccess("_FPDFDoc_GetAttachmentCount");
    Module2["_FPDFDoc_AddAttachment"] = makeInvalidEarlyAccess("_FPDFDoc_AddAttachment");
    Module2["_FPDFDoc_GetAttachment"] = makeInvalidEarlyAccess("_FPDFDoc_GetAttachment");
    Module2["_FPDFDoc_DeleteAttachment"] = makeInvalidEarlyAccess("_FPDFDoc_DeleteAttachment");
    Module2["_FPDFAttachment_GetName"] = makeInvalidEarlyAccess("_FPDFAttachment_GetName");
    Module2["_FPDFAttachment_HasKey"] = makeInvalidEarlyAccess("_FPDFAttachment_HasKey");
    Module2["_FPDFAttachment_GetValueType"] = makeInvalidEarlyAccess("_FPDFAttachment_GetValueType");
    Module2["_FPDFAttachment_SetStringValue"] = makeInvalidEarlyAccess(
      "_FPDFAttachment_SetStringValue"
    );
    Module2["_FPDFAttachment_GetStringValue"] = makeInvalidEarlyAccess(
      "_FPDFAttachment_GetStringValue"
    );
    Module2["_FPDFAttachment_SetFile"] = makeInvalidEarlyAccess("_FPDFAttachment_SetFile");
    Module2["_FPDFAttachment_GetFile"] = makeInvalidEarlyAccess("_FPDFAttachment_GetFile");
    Module2["_FPDFAttachment_GetSubtype"] = makeInvalidEarlyAccess("_FPDFAttachment_GetSubtype");
    Module2["_FPDFCatalog_IsTagged"] = makeInvalidEarlyAccess("_FPDFCatalog_IsTagged");
    Module2["_FPDFCatalog_SetLanguage"] = makeInvalidEarlyAccess("_FPDFCatalog_SetLanguage");
    Module2["_FPDFAvail_Create"] = makeInvalidEarlyAccess("_FPDFAvail_Create");
    Module2["_FPDFAvail_Destroy"] = makeInvalidEarlyAccess("_FPDFAvail_Destroy");
    Module2["_FPDFAvail_IsDocAvail"] = makeInvalidEarlyAccess("_FPDFAvail_IsDocAvail");
    Module2["_FPDFAvail_GetDocument"] = makeInvalidEarlyAccess("_FPDFAvail_GetDocument");
    Module2["_FPDFAvail_GetFirstPageNum"] = makeInvalidEarlyAccess("_FPDFAvail_GetFirstPageNum");
    Module2["_FPDFAvail_IsPageAvail"] = makeInvalidEarlyAccess("_FPDFAvail_IsPageAvail");
    Module2["_FPDFAvail_IsFormAvail"] = makeInvalidEarlyAccess("_FPDFAvail_IsFormAvail");
    Module2["_FPDFAvail_IsLinearized"] = makeInvalidEarlyAccess("_FPDFAvail_IsLinearized");
    Module2["_FPDFBookmark_GetFirstChild"] = makeInvalidEarlyAccess("_FPDFBookmark_GetFirstChild");
    Module2["_FPDFBookmark_GetNextSibling"] = makeInvalidEarlyAccess("_FPDFBookmark_GetNextSibling");
    Module2["_FPDFBookmark_GetTitle"] = makeInvalidEarlyAccess("_FPDFBookmark_GetTitle");
    Module2["_FPDFBookmark_GetCount"] = makeInvalidEarlyAccess("_FPDFBookmark_GetCount");
    Module2["_FPDFBookmark_Find"] = makeInvalidEarlyAccess("_FPDFBookmark_Find");
    Module2["_FPDFBookmark_GetDest"] = makeInvalidEarlyAccess("_FPDFBookmark_GetDest");
    Module2["_FPDFBookmark_GetAction"] = makeInvalidEarlyAccess("_FPDFBookmark_GetAction");
    Module2["_FPDFAction_GetType"] = makeInvalidEarlyAccess("_FPDFAction_GetType");
    Module2["_FPDFAction_GetDest"] = makeInvalidEarlyAccess("_FPDFAction_GetDest");
    Module2["_FPDFAction_GetFilePath"] = makeInvalidEarlyAccess("_FPDFAction_GetFilePath");
    Module2["_FPDFAction_GetURIPath"] = makeInvalidEarlyAccess("_FPDFAction_GetURIPath");
    Module2["_FPDFDest_GetDestPageIndex"] = makeInvalidEarlyAccess("_FPDFDest_GetDestPageIndex");
    Module2["_FPDFDest_GetView"] = makeInvalidEarlyAccess("_FPDFDest_GetView");
    Module2["_FPDFDest_GetLocationInPage"] = makeInvalidEarlyAccess("_FPDFDest_GetLocationInPage");
    Module2["_FPDFLink_GetLinkAtPoint"] = makeInvalidEarlyAccess("_FPDFLink_GetLinkAtPoint");
    Module2["_FPDFLink_GetLinkZOrderAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFLink_GetLinkZOrderAtPoint"
    );
    Module2["_FPDFLink_GetDest"] = makeInvalidEarlyAccess("_FPDFLink_GetDest");
    Module2["_FPDFLink_GetAction"] = makeInvalidEarlyAccess("_FPDFLink_GetAction");
    Module2["_FPDFLink_Enumerate"] = makeInvalidEarlyAccess("_FPDFLink_Enumerate");
    Module2["_FPDFLink_GetAnnot"] = makeInvalidEarlyAccess("_FPDFLink_GetAnnot");
    Module2["_FPDFLink_GetAnnotRect"] = makeInvalidEarlyAccess("_FPDFLink_GetAnnotRect");
    Module2["_FPDFLink_CountQuadPoints"] = makeInvalidEarlyAccess("_FPDFLink_CountQuadPoints");
    Module2["_FPDFLink_GetQuadPoints"] = makeInvalidEarlyAccess("_FPDFLink_GetQuadPoints");
    Module2["_FPDF_GetPageAAction"] = makeInvalidEarlyAccess("_FPDF_GetPageAAction");
    Module2["_FPDF_GetFileIdentifier"] = makeInvalidEarlyAccess("_FPDF_GetFileIdentifier");
    Module2["_FPDF_GetMetaText"] = makeInvalidEarlyAccess("_FPDF_GetMetaText");
    Module2["_FPDF_GetPageLabel"] = makeInvalidEarlyAccess("_FPDF_GetPageLabel");
    Module2["_FPDFPageObj_NewImageObj"] = makeInvalidEarlyAccess("_FPDFPageObj_NewImageObj");
    Module2["_FPDFImageObj_LoadJpegFile"] = makeInvalidEarlyAccess("_FPDFImageObj_LoadJpegFile");
    Module2["_FPDFImageObj_LoadJpegFileInline"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_LoadJpegFileInline"
    );
    Module2["_FPDFImageObj_SetMatrix"] = makeInvalidEarlyAccess("_FPDFImageObj_SetMatrix");
    Module2["_FPDFImageObj_SetBitmap"] = makeInvalidEarlyAccess("_FPDFImageObj_SetBitmap");
    Module2["_FPDFImageObj_GetBitmap"] = makeInvalidEarlyAccess("_FPDFImageObj_GetBitmap");
    Module2["_FPDFImageObj_GetRenderedBitmap"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetRenderedBitmap"
    );
    Module2["_FPDFImageObj_GetImageDataDecoded"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageDataDecoded"
    );
    Module2["_FPDFImageObj_GetImageDataRaw"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageDataRaw"
    );
    Module2["_FPDFImageObj_GetImageFilterCount"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageFilterCount"
    );
    Module2["_FPDFImageObj_GetImageFilter"] = makeInvalidEarlyAccess("_FPDFImageObj_GetImageFilter");
    Module2["_FPDFImageObj_GetImageMetadata"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageMetadata"
    );
    Module2["_FPDFImageObj_GetImagePixelSize"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImagePixelSize"
    );
    Module2["_FPDFImageObj_GetIccProfileDataDecoded"] = makeInvalidEarlyAccess("_FPDFImageObj_GetIccProfileDataDecoded");
    Module2["_FPDF_CreateNewDocument"] = makeInvalidEarlyAccess("_FPDF_CreateNewDocument");
    Module2["_FPDFPage_Delete"] = makeInvalidEarlyAccess("_FPDFPage_Delete");
    Module2["_FPDF_MovePages"] = makeInvalidEarlyAccess("_FPDF_MovePages");
    Module2["_FPDFPage_New"] = makeInvalidEarlyAccess("_FPDFPage_New");
    Module2["_FPDFPage_GetRotation"] = makeInvalidEarlyAccess("_FPDFPage_GetRotation");
    Module2["_FPDFPage_InsertObject"] = makeInvalidEarlyAccess("_FPDFPage_InsertObject");
    Module2["_FPDFPage_InsertObjectAtIndex"] = makeInvalidEarlyAccess(
      "_FPDFPage_InsertObjectAtIndex"
    );
    Module2["_FPDFPage_RemoveObject"] = makeInvalidEarlyAccess("_FPDFPage_RemoveObject");
    Module2["_FPDFPage_CountObjects"] = makeInvalidEarlyAccess("_FPDFPage_CountObjects");
    Module2["_FPDFPage_GetObject"] = makeInvalidEarlyAccess("_FPDFPage_GetObject");
    Module2["_FPDFPage_HasTransparency"] = makeInvalidEarlyAccess("_FPDFPage_HasTransparency");
    Module2["_FPDFPageObj_Destroy"] = makeInvalidEarlyAccess("_FPDFPageObj_Destroy");
    Module2["_FPDFPageObj_GetMarkedContentID"] = makeInvalidEarlyAccess(
      "_FPDFPageObj_GetMarkedContentID"
    );
    Module2["_FPDFPageObj_CountMarks"] = makeInvalidEarlyAccess("_FPDFPageObj_CountMarks");
    Module2["_FPDFPageObj_GetMark"] = makeInvalidEarlyAccess("_FPDFPageObj_GetMark");
    Module2["_FPDFPageObj_AddMark"] = makeInvalidEarlyAccess("_FPDFPageObj_AddMark");
    Module2["_FPDFPageObj_RemoveMark"] = makeInvalidEarlyAccess("_FPDFPageObj_RemoveMark");
    Module2["_FPDFPageObjMark_GetName"] = makeInvalidEarlyAccess("_FPDFPageObjMark_GetName");
    Module2["_FPDFPageObjMark_CountParams"] = makeInvalidEarlyAccess("_FPDFPageObjMark_CountParams");
    Module2["_FPDFPageObjMark_GetParamKey"] = makeInvalidEarlyAccess("_FPDFPageObjMark_GetParamKey");
    Module2["_FPDFPageObjMark_GetParamValueType"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamValueType"
    );
    Module2["_FPDFPageObjMark_GetParamIntValue"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamIntValue"
    );
    Module2["_FPDFPageObjMark_GetParamStringValue"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamStringValue"
    );
    Module2["_FPDFPageObjMark_GetParamBlobValue"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamBlobValue"
    );
    Module2["_FPDFPageObj_HasTransparency"] = makeInvalidEarlyAccess("_FPDFPageObj_HasTransparency");
    Module2["_FPDFPageObjMark_SetIntParam"] = makeInvalidEarlyAccess("_FPDFPageObjMark_SetIntParam");
    Module2["_FPDFPageObjMark_SetStringParam"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_SetStringParam"
    );
    Module2["_FPDFPageObjMark_SetBlobParam"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_SetBlobParam"
    );
    Module2["_FPDFPageObjMark_RemoveParam"] = makeInvalidEarlyAccess("_FPDFPageObjMark_RemoveParam");
    Module2["_FPDFPageObj_GetType"] = makeInvalidEarlyAccess("_FPDFPageObj_GetType");
    Module2["_FPDFPageObj_GetIsActive"] = makeInvalidEarlyAccess("_FPDFPageObj_GetIsActive");
    Module2["_FPDFPageObj_SetIsActive"] = makeInvalidEarlyAccess("_FPDFPageObj_SetIsActive");
    Module2["_FPDFPage_GenerateContent"] = makeInvalidEarlyAccess("_FPDFPage_GenerateContent");
    Module2["_FPDFPageObj_Transform"] = makeInvalidEarlyAccess("_FPDFPageObj_Transform");
    Module2["_FPDFPageObj_TransformF"] = makeInvalidEarlyAccess("_FPDFPageObj_TransformF");
    Module2["_FPDFPageObj_GetMatrix"] = makeInvalidEarlyAccess("_FPDFPageObj_GetMatrix");
    Module2["_FPDFPageObj_SetMatrix"] = makeInvalidEarlyAccess("_FPDFPageObj_SetMatrix");
    Module2["_FPDFPageObj_SetBlendMode"] = makeInvalidEarlyAccess("_FPDFPageObj_SetBlendMode");
    Module2["_FPDFPage_TransformAnnots"] = makeInvalidEarlyAccess("_FPDFPage_TransformAnnots");
    Module2["_FPDFPage_SetRotation"] = makeInvalidEarlyAccess("_FPDFPage_SetRotation");
    Module2["_FPDFPageObj_SetFillColor"] = makeInvalidEarlyAccess("_FPDFPageObj_SetFillColor");
    Module2["_FPDFPageObj_GetFillColor"] = makeInvalidEarlyAccess("_FPDFPageObj_GetFillColor");
    Module2["_FPDFPageObj_GetBounds"] = makeInvalidEarlyAccess("_FPDFPageObj_GetBounds");
    Module2["_FPDFPageObj_GetRotatedBounds"] = makeInvalidEarlyAccess(
      "_FPDFPageObj_GetRotatedBounds"
    );
    Module2["_FPDFPageObj_SetStrokeColor"] = makeInvalidEarlyAccess("_FPDFPageObj_SetStrokeColor");
    Module2["_FPDFPageObj_GetStrokeColor"] = makeInvalidEarlyAccess("_FPDFPageObj_GetStrokeColor");
    Module2["_FPDFPageObj_SetStrokeWidth"] = makeInvalidEarlyAccess("_FPDFPageObj_SetStrokeWidth");
    Module2["_FPDFPageObj_GetStrokeWidth"] = makeInvalidEarlyAccess("_FPDFPageObj_GetStrokeWidth");
    Module2["_FPDFPageObj_GetLineJoin"] = makeInvalidEarlyAccess("_FPDFPageObj_GetLineJoin");
    Module2["_FPDFPageObj_SetLineJoin"] = makeInvalidEarlyAccess("_FPDFPageObj_SetLineJoin");
    Module2["_FPDFPageObj_GetLineCap"] = makeInvalidEarlyAccess("_FPDFPageObj_GetLineCap");
    Module2["_FPDFPageObj_SetLineCap"] = makeInvalidEarlyAccess("_FPDFPageObj_SetLineCap");
    Module2["_FPDFPageObj_GetDashPhase"] = makeInvalidEarlyAccess("_FPDFPageObj_GetDashPhase");
    Module2["_FPDFPageObj_SetDashPhase"] = makeInvalidEarlyAccess("_FPDFPageObj_SetDashPhase");
    Module2["_FPDFPageObj_GetDashCount"] = makeInvalidEarlyAccess("_FPDFPageObj_GetDashCount");
    Module2["_FPDFPageObj_GetDashArray"] = makeInvalidEarlyAccess("_FPDFPageObj_GetDashArray");
    Module2["_FPDFPageObj_SetDashArray"] = makeInvalidEarlyAccess("_FPDFPageObj_SetDashArray");
    Module2["_FPDFFormObj_CountObjects"] = makeInvalidEarlyAccess("_FPDFFormObj_CountObjects");
    Module2["_FPDFFormObj_GetObject"] = makeInvalidEarlyAccess("_FPDFFormObj_GetObject");
    Module2["_FPDFFormObj_RemoveObject"] = makeInvalidEarlyAccess("_FPDFFormObj_RemoveObject");
    Module2["_FPDFPageObj_CreateNewPath"] = makeInvalidEarlyAccess("_FPDFPageObj_CreateNewPath");
    Module2["_FPDFPageObj_CreateNewRect"] = makeInvalidEarlyAccess("_FPDFPageObj_CreateNewRect");
    Module2["_FPDFPath_CountSegments"] = makeInvalidEarlyAccess("_FPDFPath_CountSegments");
    Module2["_FPDFPath_GetPathSegment"] = makeInvalidEarlyAccess("_FPDFPath_GetPathSegment");
    Module2["_FPDFPath_MoveTo"] = makeInvalidEarlyAccess("_FPDFPath_MoveTo");
    Module2["_FPDFPath_LineTo"] = makeInvalidEarlyAccess("_FPDFPath_LineTo");
    Module2["_FPDFPath_BezierTo"] = makeInvalidEarlyAccess("_FPDFPath_BezierTo");
    Module2["_FPDFPath_Close"] = makeInvalidEarlyAccess("_FPDFPath_Close");
    Module2["_FPDFPath_SetDrawMode"] = makeInvalidEarlyAccess("_FPDFPath_SetDrawMode");
    Module2["_FPDFPath_GetDrawMode"] = makeInvalidEarlyAccess("_FPDFPath_GetDrawMode");
    Module2["_FPDFPathSegment_GetPoint"] = makeInvalidEarlyAccess("_FPDFPathSegment_GetPoint");
    Module2["_FPDFPathSegment_GetType"] = makeInvalidEarlyAccess("_FPDFPathSegment_GetType");
    Module2["_FPDFPathSegment_GetClose"] = makeInvalidEarlyAccess("_FPDFPathSegment_GetClose");
    Module2["_FPDFPageObj_NewTextObj"] = makeInvalidEarlyAccess("_FPDFPageObj_NewTextObj");
    Module2["_FPDFText_SetText"] = makeInvalidEarlyAccess("_FPDFText_SetText");
    Module2["_FPDFText_SetCharcodes"] = makeInvalidEarlyAccess("_FPDFText_SetCharcodes");
    Module2["_FPDFText_LoadFont"] = makeInvalidEarlyAccess("_FPDFText_LoadFont");
    Module2["_FPDFText_LoadStandardFont"] = makeInvalidEarlyAccess("_FPDFText_LoadStandardFont");
    Module2["_FPDFText_LoadCidType2Font"] = makeInvalidEarlyAccess("_FPDFText_LoadCidType2Font");
    Module2["_FPDFTextObj_GetFontSize"] = makeInvalidEarlyAccess("_FPDFTextObj_GetFontSize");
    Module2["_FPDFTextObj_GetText"] = makeInvalidEarlyAccess("_FPDFTextObj_GetText");
    Module2["_FPDFTextObj_GetRenderedBitmap"] = makeInvalidEarlyAccess(
      "_FPDFTextObj_GetRenderedBitmap"
    );
    Module2["_FPDFFont_Close"] = makeInvalidEarlyAccess("_FPDFFont_Close");
    Module2["_FPDFPageObj_CreateTextObj"] = makeInvalidEarlyAccess("_FPDFPageObj_CreateTextObj");
    Module2["_FPDFTextObj_GetTextRenderMode"] = makeInvalidEarlyAccess(
      "_FPDFTextObj_GetTextRenderMode"
    );
    Module2["_FPDFTextObj_SetTextRenderMode"] = makeInvalidEarlyAccess(
      "_FPDFTextObj_SetTextRenderMode"
    );
    Module2["_FPDFTextObj_GetFont"] = makeInvalidEarlyAccess("_FPDFTextObj_GetFont");
    Module2["_FPDFFont_GetBaseFontName"] = makeInvalidEarlyAccess("_FPDFFont_GetBaseFontName");
    Module2["_FPDFFont_GetFamilyName"] = makeInvalidEarlyAccess("_FPDFFont_GetFamilyName");
    Module2["_FPDFFont_GetFontData"] = makeInvalidEarlyAccess("_FPDFFont_GetFontData");
    Module2["_FPDFFont_GetIsEmbedded"] = makeInvalidEarlyAccess("_FPDFFont_GetIsEmbedded");
    Module2["_FPDFFont_GetFlags"] = makeInvalidEarlyAccess("_FPDFFont_GetFlags");
    Module2["_FPDFFont_GetWeight"] = makeInvalidEarlyAccess("_FPDFFont_GetWeight");
    Module2["_FPDFFont_GetItalicAngle"] = makeInvalidEarlyAccess("_FPDFFont_GetItalicAngle");
    Module2["_FPDFFont_GetAscent"] = makeInvalidEarlyAccess("_FPDFFont_GetAscent");
    Module2["_FPDFFont_GetDescent"] = makeInvalidEarlyAccess("_FPDFFont_GetDescent");
    Module2["_FPDFFont_GetGlyphWidth"] = makeInvalidEarlyAccess("_FPDFFont_GetGlyphWidth");
    Module2["_FPDFFont_GetGlyphPath"] = makeInvalidEarlyAccess("_FPDFFont_GetGlyphPath");
    Module2["_FPDFGlyphPath_CountGlyphSegments"] = makeInvalidEarlyAccess(
      "_FPDFGlyphPath_CountGlyphSegments"
    );
    Module2["_FPDFGlyphPath_GetGlyphPathSegment"] = makeInvalidEarlyAccess(
      "_FPDFGlyphPath_GetGlyphPathSegment"
    );
    Module2["_FSDK_SetUnSpObjProcessHandler"] = makeInvalidEarlyAccess(
      "_FSDK_SetUnSpObjProcessHandler"
    );
    Module2["_FSDK_SetTimeFunction"] = makeInvalidEarlyAccess("_FSDK_SetTimeFunction");
    Module2["_FSDK_SetLocaltimeFunction"] = makeInvalidEarlyAccess("_FSDK_SetLocaltimeFunction");
    Module2["_FPDFDoc_GetPageMode"] = makeInvalidEarlyAccess("_FPDFDoc_GetPageMode");
    Module2["_FPDFPage_Flatten"] = makeInvalidEarlyAccess("_FPDFPage_Flatten");
    Module2["_FPDFPage_HasFormFieldAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFPage_HasFormFieldAtPoint"
    );
    Module2["_FPDFPage_FormFieldZOrderAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFPage_FormFieldZOrderAtPoint"
    );
    Module2["_FPDFDOC_InitFormFillEnvironment"] = makeInvalidEarlyAccess(
      "_FPDFDOC_InitFormFillEnvironment"
    );
    Module2["_FPDFDOC_ExitFormFillEnvironment"] = makeInvalidEarlyAccess(
      "_FPDFDOC_ExitFormFillEnvironment"
    );
    Module2["_FORM_OnMouseMove"] = makeInvalidEarlyAccess("_FORM_OnMouseMove");
    Module2["_FORM_OnMouseWheel"] = makeInvalidEarlyAccess("_FORM_OnMouseWheel");
    Module2["_FORM_OnFocus"] = makeInvalidEarlyAccess("_FORM_OnFocus");
    Module2["_FORM_OnLButtonDown"] = makeInvalidEarlyAccess("_FORM_OnLButtonDown");
    Module2["_FORM_OnLButtonUp"] = makeInvalidEarlyAccess("_FORM_OnLButtonUp");
    Module2["_FORM_OnLButtonDoubleClick"] = makeInvalidEarlyAccess("_FORM_OnLButtonDoubleClick");
    Module2["_FORM_OnRButtonDown"] = makeInvalidEarlyAccess("_FORM_OnRButtonDown");
    Module2["_FORM_OnRButtonUp"] = makeInvalidEarlyAccess("_FORM_OnRButtonUp");
    Module2["_FORM_OnKeyDown"] = makeInvalidEarlyAccess("_FORM_OnKeyDown");
    Module2["_FORM_OnKeyUp"] = makeInvalidEarlyAccess("_FORM_OnKeyUp");
    Module2["_FORM_OnChar"] = makeInvalidEarlyAccess("_FORM_OnChar");
    Module2["_FORM_GetFocusedText"] = makeInvalidEarlyAccess("_FORM_GetFocusedText");
    Module2["_FORM_GetSelectedText"] = makeInvalidEarlyAccess("_FORM_GetSelectedText");
    Module2["_FORM_ReplaceAndKeepSelection"] = makeInvalidEarlyAccess(
      "_FORM_ReplaceAndKeepSelection"
    );
    Module2["_FORM_ReplaceSelection"] = makeInvalidEarlyAccess("_FORM_ReplaceSelection");
    Module2["_FORM_SelectAllText"] = makeInvalidEarlyAccess("_FORM_SelectAllText");
    Module2["_FORM_CanUndo"] = makeInvalidEarlyAccess("_FORM_CanUndo");
    Module2["_FORM_CanRedo"] = makeInvalidEarlyAccess("_FORM_CanRedo");
    Module2["_FORM_Undo"] = makeInvalidEarlyAccess("_FORM_Undo");
    Module2["_FORM_Redo"] = makeInvalidEarlyAccess("_FORM_Redo");
    Module2["_FORM_ForceToKillFocus"] = makeInvalidEarlyAccess("_FORM_ForceToKillFocus");
    Module2["_FORM_GetFocusedAnnot"] = makeInvalidEarlyAccess("_FORM_GetFocusedAnnot");
    Module2["_FORM_SetFocusedAnnot"] = makeInvalidEarlyAccess("_FORM_SetFocusedAnnot");
    Module2["_FPDF_FFLDraw"] = makeInvalidEarlyAccess("_FPDF_FFLDraw");
    Module2["_FPDF_SetFormFieldHighlightColor"] = makeInvalidEarlyAccess(
      "_FPDF_SetFormFieldHighlightColor"
    );
    Module2["_FPDF_SetFormFieldHighlightAlpha"] = makeInvalidEarlyAccess(
      "_FPDF_SetFormFieldHighlightAlpha"
    );
    Module2["_FPDF_RemoveFormFieldHighlight"] = makeInvalidEarlyAccess(
      "_FPDF_RemoveFormFieldHighlight"
    );
    Module2["_FORM_OnAfterLoadPage"] = makeInvalidEarlyAccess("_FORM_OnAfterLoadPage");
    Module2["_FORM_OnBeforeClosePage"] = makeInvalidEarlyAccess("_FORM_OnBeforeClosePage");
    Module2["_FORM_DoDocumentJSAction"] = makeInvalidEarlyAccess("_FORM_DoDocumentJSAction");
    Module2["_FORM_DoDocumentOpenAction"] = makeInvalidEarlyAccess("_FORM_DoDocumentOpenAction");
    Module2["_FORM_DoDocumentAAction"] = makeInvalidEarlyAccess("_FORM_DoDocumentAAction");
    Module2["_FORM_DoPageAAction"] = makeInvalidEarlyAccess("_FORM_DoPageAAction");
    Module2["_FORM_SetIndexSelected"] = makeInvalidEarlyAccess("_FORM_SetIndexSelected");
    Module2["_FORM_IsIndexSelected"] = makeInvalidEarlyAccess("_FORM_IsIndexSelected");
    Module2["_FPDFDoc_GetJavaScriptActionCount"] = makeInvalidEarlyAccess(
      "_FPDFDoc_GetJavaScriptActionCount"
    );
    Module2["_FPDFDoc_GetJavaScriptAction"] = makeInvalidEarlyAccess("_FPDFDoc_GetJavaScriptAction");
    Module2["_FPDFDoc_CloseJavaScriptAction"] = makeInvalidEarlyAccess(
      "_FPDFDoc_CloseJavaScriptAction"
    );
    Module2["_FPDFJavaScriptAction_GetName"] = makeInvalidEarlyAccess(
      "_FPDFJavaScriptAction_GetName"
    );
    Module2["_FPDFJavaScriptAction_GetScript"] = makeInvalidEarlyAccess(
      "_FPDFJavaScriptAction_GetScript"
    );
    Module2["_FPDF_ImportPagesByIndex"] = makeInvalidEarlyAccess("_FPDF_ImportPagesByIndex");
    Module2["_FPDF_ImportPages"] = makeInvalidEarlyAccess("_FPDF_ImportPages");
    Module2["_FPDF_ImportNPagesToOne"] = makeInvalidEarlyAccess("_FPDF_ImportNPagesToOne");
    Module2["_FPDF_NewXObjectFromPage"] = makeInvalidEarlyAccess("_FPDF_NewXObjectFromPage");
    Module2["_FPDF_CloseXObject"] = makeInvalidEarlyAccess("_FPDF_CloseXObject");
    Module2["_FPDF_NewFormObjectFromXObject"] = makeInvalidEarlyAccess(
      "_FPDF_NewFormObjectFromXObject"
    );
    Module2["_FPDF_CopyViewerPreferences"] = makeInvalidEarlyAccess("_FPDF_CopyViewerPreferences");
    Module2["_FPDF_RenderPageBitmapWithColorScheme_Start"] = makeInvalidEarlyAccess("_FPDF_RenderPageBitmapWithColorScheme_Start");
    Module2["_FPDF_RenderPageBitmap_Start"] = makeInvalidEarlyAccess("_FPDF_RenderPageBitmap_Start");
    Module2["_FPDF_RenderPage_Continue"] = makeInvalidEarlyAccess("_FPDF_RenderPage_Continue");
    Module2["_FPDF_RenderPage_Close"] = makeInvalidEarlyAccess("_FPDF_RenderPage_Close");
    Module2["_FPDF_SaveAsCopy"] = makeInvalidEarlyAccess("_FPDF_SaveAsCopy");
    Module2["_FPDF_SaveWithVersion"] = makeInvalidEarlyAccess("_FPDF_SaveWithVersion");
    Module2["_FPDFText_GetCharIndexFromTextIndex"] = makeInvalidEarlyAccess(
      "_FPDFText_GetCharIndexFromTextIndex"
    );
    Module2["_FPDFText_GetTextIndexFromCharIndex"] = makeInvalidEarlyAccess(
      "_FPDFText_GetTextIndexFromCharIndex"
    );
    Module2["_FPDF_GetSignatureCount"] = makeInvalidEarlyAccess("_FPDF_GetSignatureCount");
    Module2["_FPDF_GetSignatureObject"] = makeInvalidEarlyAccess("_FPDF_GetSignatureObject");
    Module2["_FPDFSignatureObj_GetContents"] = makeInvalidEarlyAccess(
      "_FPDFSignatureObj_GetContents"
    );
    Module2["_FPDFSignatureObj_GetByteRange"] = makeInvalidEarlyAccess(
      "_FPDFSignatureObj_GetByteRange"
    );
    Module2["_FPDFSignatureObj_GetSubFilter"] = makeInvalidEarlyAccess(
      "_FPDFSignatureObj_GetSubFilter"
    );
    Module2["_FPDFSignatureObj_GetReason"] = makeInvalidEarlyAccess("_FPDFSignatureObj_GetReason");
    Module2["_FPDFSignatureObj_GetTime"] = makeInvalidEarlyAccess("_FPDFSignatureObj_GetTime");
    Module2["_FPDFSignatureObj_GetDocMDPPermission"] = makeInvalidEarlyAccess("_FPDFSignatureObj_GetDocMDPPermission");
    Module2["_FPDF_StructTree_GetForPage"] = makeInvalidEarlyAccess("_FPDF_StructTree_GetForPage");
    Module2["_FPDF_StructTree_Close"] = makeInvalidEarlyAccess("_FPDF_StructTree_Close");
    Module2["_FPDF_StructTree_CountChildren"] = makeInvalidEarlyAccess(
      "_FPDF_StructTree_CountChildren"
    );
    Module2["_FPDF_StructTree_GetChildAtIndex"] = makeInvalidEarlyAccess(
      "_FPDF_StructTree_GetChildAtIndex"
    );
    Module2["_FPDF_StructElement_GetAltText"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetAltText"
    );
    Module2["_FPDF_StructElement_GetActualText"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetActualText"
    );
    Module2["_FPDF_StructElement_GetID"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetID");
    Module2["_FPDF_StructElement_GetLang"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetLang");
    Module2["_FPDF_StructElement_GetAttributeCount"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetAttributeCount");
    Module2["_FPDF_StructElement_GetAttributeAtIndex"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetAttributeAtIndex");
    Module2["_FPDF_StructElement_GetStringAttribute"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetStringAttribute");
    Module2["_FPDF_StructElement_GetMarkedContentID"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetMarkedContentID");
    Module2["_FPDF_StructElement_GetType"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetType");
    Module2["_FPDF_StructElement_GetObjType"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetObjType"
    );
    Module2["_FPDF_StructElement_GetTitle"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetTitle");
    Module2["_FPDF_StructElement_CountChildren"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_CountChildren"
    );
    Module2["_FPDF_StructElement_GetChildAtIndex"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetChildAtIndex"
    );
    Module2["_FPDF_StructElement_GetChildMarkedContentID"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetChildMarkedContentID");
    Module2["_FPDF_StructElement_GetParent"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetParent"
    );
    Module2["_FPDF_StructElement_Attr_GetCount"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetCount"
    );
    Module2["_FPDF_StructElement_Attr_GetName"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetName"
    );
    Module2["_FPDF_StructElement_Attr_GetValue"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetValue"
    );
    Module2["_FPDF_StructElement_Attr_GetType"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetType"
    );
    Module2["_FPDF_StructElement_Attr_GetBooleanValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetBooleanValue");
    Module2["_FPDF_StructElement_Attr_GetNumberValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetNumberValue");
    Module2["_FPDF_StructElement_Attr_GetStringValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetStringValue");
    Module2["_FPDF_StructElement_Attr_GetBlobValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetBlobValue");
    Module2["_FPDF_StructElement_Attr_CountChildren"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_CountChildren");
    Module2["_FPDF_StructElement_Attr_GetChildAtIndex"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetChildAtIndex");
    Module2["_FPDF_StructElement_GetMarkedContentIdCount"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetMarkedContentIdCount");
    Module2["_FPDF_StructElement_GetMarkedContentIdAtIndex"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetMarkedContentIdAtIndex");
    Module2["_FPDF_AddInstalledFont"] = makeInvalidEarlyAccess("_FPDF_AddInstalledFont");
    Module2["_FPDF_SetSystemFontInfo"] = makeInvalidEarlyAccess("_FPDF_SetSystemFontInfo");
    Module2["_FPDF_GetDefaultTTFMap"] = makeInvalidEarlyAccess("_FPDF_GetDefaultTTFMap");
    Module2["_FPDF_GetDefaultTTFMapCount"] = makeInvalidEarlyAccess("_FPDF_GetDefaultTTFMapCount");
    Module2["_FPDF_GetDefaultTTFMapEntry"] = makeInvalidEarlyAccess("_FPDF_GetDefaultTTFMapEntry");
    Module2["_FPDF_GetDefaultSystemFontInfo"] = makeInvalidEarlyAccess(
      "_FPDF_GetDefaultSystemFontInfo"
    );
    Module2["_FPDF_FreeDefaultSystemFontInfo"] = makeInvalidEarlyAccess(
      "_FPDF_FreeDefaultSystemFontInfo"
    );
    Module2["_FPDFText_LoadPage"] = makeInvalidEarlyAccess("_FPDFText_LoadPage");
    Module2["_FPDFText_ClosePage"] = makeInvalidEarlyAccess("_FPDFText_ClosePage");
    Module2["_FPDFText_CountChars"] = makeInvalidEarlyAccess("_FPDFText_CountChars");
    Module2["_FPDFText_GetUnicode"] = makeInvalidEarlyAccess("_FPDFText_GetUnicode");
    Module2["_FPDFText_GetTextObject"] = makeInvalidEarlyAccess("_FPDFText_GetTextObject");
    Module2["_FPDFText_IsGenerated"] = makeInvalidEarlyAccess("_FPDFText_IsGenerated");
    Module2["_FPDFText_IsHyphen"] = makeInvalidEarlyAccess("_FPDFText_IsHyphen");
    Module2["_FPDFText_HasUnicodeMapError"] = makeInvalidEarlyAccess("_FPDFText_HasUnicodeMapError");
    Module2["_FPDFText_GetFontSize"] = makeInvalidEarlyAccess("_FPDFText_GetFontSize");
    Module2["_FPDFText_GetFontInfo"] = makeInvalidEarlyAccess("_FPDFText_GetFontInfo");
    Module2["_FPDFText_GetFontWeight"] = makeInvalidEarlyAccess("_FPDFText_GetFontWeight");
    Module2["_FPDFText_GetFillColor"] = makeInvalidEarlyAccess("_FPDFText_GetFillColor");
    Module2["_FPDFText_GetStrokeColor"] = makeInvalidEarlyAccess("_FPDFText_GetStrokeColor");
    Module2["_FPDFText_GetCharAngle"] = makeInvalidEarlyAccess("_FPDFText_GetCharAngle");
    Module2["_FPDFText_GetCharBox"] = makeInvalidEarlyAccess("_FPDFText_GetCharBox");
    Module2["_FPDFText_GetLooseCharBox"] = makeInvalidEarlyAccess("_FPDFText_GetLooseCharBox");
    Module2["_FPDFText_GetMatrix"] = makeInvalidEarlyAccess("_FPDFText_GetMatrix");
    Module2["_FPDFText_GetCharOrigin"] = makeInvalidEarlyAccess("_FPDFText_GetCharOrigin");
    Module2["_FPDFText_GetCharIndexAtPos"] = makeInvalidEarlyAccess("_FPDFText_GetCharIndexAtPos");
    Module2["_FPDFText_GetText"] = makeInvalidEarlyAccess("_FPDFText_GetText");
    Module2["_FPDFText_CountRects"] = makeInvalidEarlyAccess("_FPDFText_CountRects");
    Module2["_FPDFText_GetRect"] = makeInvalidEarlyAccess("_FPDFText_GetRect");
    Module2["_FPDFText_GetBoundedText"] = makeInvalidEarlyAccess("_FPDFText_GetBoundedText");
    Module2["_FPDFText_FindStart"] = makeInvalidEarlyAccess("_FPDFText_FindStart");
    Module2["_FPDFText_FindNext"] = makeInvalidEarlyAccess("_FPDFText_FindNext");
    Module2["_FPDFText_FindPrev"] = makeInvalidEarlyAccess("_FPDFText_FindPrev");
    Module2["_FPDFText_GetSchResultIndex"] = makeInvalidEarlyAccess("_FPDFText_GetSchResultIndex");
    Module2["_FPDFText_GetSchCount"] = makeInvalidEarlyAccess("_FPDFText_GetSchCount");
    Module2["_FPDFText_FindClose"] = makeInvalidEarlyAccess("_FPDFText_FindClose");
    Module2["_FPDFLink_LoadWebLinks"] = makeInvalidEarlyAccess("_FPDFLink_LoadWebLinks");
    Module2["_FPDFLink_CountWebLinks"] = makeInvalidEarlyAccess("_FPDFLink_CountWebLinks");
    Module2["_FPDFLink_GetURL"] = makeInvalidEarlyAccess("_FPDFLink_GetURL");
    Module2["_FPDFLink_CountRects"] = makeInvalidEarlyAccess("_FPDFLink_CountRects");
    Module2["_FPDFLink_GetRect"] = makeInvalidEarlyAccess("_FPDFLink_GetRect");
    Module2["_FPDFLink_GetTextRange"] = makeInvalidEarlyAccess("_FPDFLink_GetTextRange");
    Module2["_FPDFLink_CloseWebLinks"] = makeInvalidEarlyAccess("_FPDFLink_CloseWebLinks");
    Module2["_FPDFPage_GetDecodedThumbnailData"] = makeInvalidEarlyAccess(
      "_FPDFPage_GetDecodedThumbnailData"
    );
    Module2["_FPDFPage_GetRawThumbnailData"] = makeInvalidEarlyAccess(
      "_FPDFPage_GetRawThumbnailData"
    );
    Module2["_FPDFPage_GetThumbnailAsBitmap"] = makeInvalidEarlyAccess(
      "_FPDFPage_GetThumbnailAsBitmap"
    );
    Module2["_FPDFPage_SetMediaBox"] = makeInvalidEarlyAccess("_FPDFPage_SetMediaBox");
    Module2["_FPDFPage_SetCropBox"] = makeInvalidEarlyAccess("_FPDFPage_SetCropBox");
    Module2["_FPDFPage_SetBleedBox"] = makeInvalidEarlyAccess("_FPDFPage_SetBleedBox");
    Module2["_FPDFPage_SetTrimBox"] = makeInvalidEarlyAccess("_FPDFPage_SetTrimBox");
    Module2["_FPDFPage_SetArtBox"] = makeInvalidEarlyAccess("_FPDFPage_SetArtBox");
    Module2["_FPDFPage_GetMediaBox"] = makeInvalidEarlyAccess("_FPDFPage_GetMediaBox");
    Module2["_FPDFPage_GetCropBox"] = makeInvalidEarlyAccess("_FPDFPage_GetCropBox");
    Module2["_FPDFPage_GetBleedBox"] = makeInvalidEarlyAccess("_FPDFPage_GetBleedBox");
    Module2["_FPDFPage_GetTrimBox"] = makeInvalidEarlyAccess("_FPDFPage_GetTrimBox");
    Module2["_FPDFPage_GetArtBox"] = makeInvalidEarlyAccess("_FPDFPage_GetArtBox");
    Module2["_FPDFPage_TransFormWithClip"] = makeInvalidEarlyAccess("_FPDFPage_TransFormWithClip");
    Module2["_FPDFPageObj_TransformClipPath"] = makeInvalidEarlyAccess(
      "_FPDFPageObj_TransformClipPath"
    );
    Module2["_FPDFPageObj_GetClipPath"] = makeInvalidEarlyAccess("_FPDFPageObj_GetClipPath");
    Module2["_FPDFClipPath_CountPaths"] = makeInvalidEarlyAccess("_FPDFClipPath_CountPaths");
    Module2["_FPDFClipPath_CountPathSegments"] = makeInvalidEarlyAccess(
      "_FPDFClipPath_CountPathSegments"
    );
    Module2["_FPDFClipPath_GetPathSegment"] = makeInvalidEarlyAccess("_FPDFClipPath_GetPathSegment");
    Module2["_FPDF_CreateClipPath"] = makeInvalidEarlyAccess("_FPDF_CreateClipPath");
    Module2["_FPDF_DestroyClipPath"] = makeInvalidEarlyAccess("_FPDF_DestroyClipPath");
    Module2["_FPDFPage_InsertClipPath"] = makeInvalidEarlyAccess("_FPDFPage_InsertClipPath");
    Module2["_FPDF_InitLibrary"] = makeInvalidEarlyAccess("_FPDF_InitLibrary");
    Module2["_malloc"] = makeInvalidEarlyAccess("_malloc");
    Module2["_free"] = makeInvalidEarlyAccess("_free");
    Module2["_FPDF_DestroyLibrary"] = makeInvalidEarlyAccess("_FPDF_DestroyLibrary");
    Module2["_FPDF_SetSandBoxPolicy"] = makeInvalidEarlyAccess("_FPDF_SetSandBoxPolicy");
    Module2["_FPDF_LoadDocument"] = makeInvalidEarlyAccess("_FPDF_LoadDocument");
    Module2["_FPDF_GetFormType"] = makeInvalidEarlyAccess("_FPDF_GetFormType");
    Module2["_FPDF_LoadXFA"] = makeInvalidEarlyAccess("_FPDF_LoadXFA");
    Module2["_FPDF_LoadMemDocument"] = makeInvalidEarlyAccess("_FPDF_LoadMemDocument");
    Module2["_FPDF_LoadMemDocument64"] = makeInvalidEarlyAccess("_FPDF_LoadMemDocument64");
    Module2["_FPDF_LoadCustomDocument"] = makeInvalidEarlyAccess("_FPDF_LoadCustomDocument");
    Module2["_FPDF_GetFileVersion"] = makeInvalidEarlyAccess("_FPDF_GetFileVersion");
    Module2["_FPDF_DocumentHasValidCrossReferenceTable"] = makeInvalidEarlyAccess("_FPDF_DocumentHasValidCrossReferenceTable");
    Module2["_FPDF_GetDocPermissions"] = makeInvalidEarlyAccess("_FPDF_GetDocPermissions");
    Module2["_FPDF_GetDocUserPermissions"] = makeInvalidEarlyAccess("_FPDF_GetDocUserPermissions");
    Module2["_FPDF_GetSecurityHandlerRevision"] = makeInvalidEarlyAccess(
      "_FPDF_GetSecurityHandlerRevision"
    );
    Module2["_FPDF_GetPageCount"] = makeInvalidEarlyAccess("_FPDF_GetPageCount");
    Module2["_FPDF_LoadPage"] = makeInvalidEarlyAccess("_FPDF_LoadPage");
    Module2["_FPDF_GetPageWidthF"] = makeInvalidEarlyAccess("_FPDF_GetPageWidthF");
    Module2["_FPDF_GetPageWidth"] = makeInvalidEarlyAccess("_FPDF_GetPageWidth");
    Module2["_FPDF_GetPageHeightF"] = makeInvalidEarlyAccess("_FPDF_GetPageHeightF");
    Module2["_FPDF_GetPageHeight"] = makeInvalidEarlyAccess("_FPDF_GetPageHeight");
    Module2["_FPDF_GetPageBoundingBox"] = makeInvalidEarlyAccess("_FPDF_GetPageBoundingBox");
    Module2["_FPDF_RenderPageBitmap"] = makeInvalidEarlyAccess("_FPDF_RenderPageBitmap");
    Module2["_FPDF_RenderPageBitmapWithMatrix"] = makeInvalidEarlyAccess(
      "_FPDF_RenderPageBitmapWithMatrix"
    );
    Module2["_FPDF_ClosePage"] = makeInvalidEarlyAccess("_FPDF_ClosePage");
    Module2["_FPDF_CloseDocument"] = makeInvalidEarlyAccess("_FPDF_CloseDocument");
    Module2["_FPDF_GetLastError"] = makeInvalidEarlyAccess("_FPDF_GetLastError");
    Module2["_FPDF_DeviceToPage"] = makeInvalidEarlyAccess("_FPDF_DeviceToPage");
    Module2["_FPDF_PageToDevice"] = makeInvalidEarlyAccess("_FPDF_PageToDevice");
    Module2["_FPDFBitmap_Create"] = makeInvalidEarlyAccess("_FPDFBitmap_Create");
    Module2["_FPDFBitmap_CreateEx"] = makeInvalidEarlyAccess("_FPDFBitmap_CreateEx");
    Module2["_FPDFBitmap_GetFormat"] = makeInvalidEarlyAccess("_FPDFBitmap_GetFormat");
    Module2["_FPDFBitmap_FillRect"] = makeInvalidEarlyAccess("_FPDFBitmap_FillRect");
    Module2["_FPDFBitmap_GetBuffer"] = makeInvalidEarlyAccess("_FPDFBitmap_GetBuffer");
    Module2["_FPDFBitmap_GetWidth"] = makeInvalidEarlyAccess("_FPDFBitmap_GetWidth");
    Module2["_FPDFBitmap_GetHeight"] = makeInvalidEarlyAccess("_FPDFBitmap_GetHeight");
    Module2["_FPDFBitmap_GetStride"] = makeInvalidEarlyAccess("_FPDFBitmap_GetStride");
    Module2["_FPDFBitmap_Destroy"] = makeInvalidEarlyAccess("_FPDFBitmap_Destroy");
    Module2["_FPDF_GetPageSizeByIndexF"] = makeInvalidEarlyAccess("_FPDF_GetPageSizeByIndexF");
    Module2["_FPDF_GetPageSizeByIndex"] = makeInvalidEarlyAccess("_FPDF_GetPageSizeByIndex");
    Module2["_FPDF_VIEWERREF_GetPrintScaling"] = makeInvalidEarlyAccess(
      "_FPDF_VIEWERREF_GetPrintScaling"
    );
    Module2["_FPDF_VIEWERREF_GetNumCopies"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetNumCopies");
    Module2["_FPDF_VIEWERREF_GetPrintPageRange"] = makeInvalidEarlyAccess(
      "_FPDF_VIEWERREF_GetPrintPageRange"
    );
    Module2["_FPDF_VIEWERREF_GetPrintPageRangeCount"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetPrintPageRangeCount");
    Module2["_FPDF_VIEWERREF_GetPrintPageRangeElement"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetPrintPageRangeElement");
    Module2["_FPDF_VIEWERREF_GetDuplex"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetDuplex");
    Module2["_FPDF_VIEWERREF_GetName"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetName");
    Module2["_FPDF_CountNamedDests"] = makeInvalidEarlyAccess("_FPDF_CountNamedDests");
    Module2["_FPDF_GetNamedDestByName"] = makeInvalidEarlyAccess("_FPDF_GetNamedDestByName");
    Module2["_FPDF_GetNamedDest"] = makeInvalidEarlyAccess("_FPDF_GetNamedDest");
    Module2["_FPDF_GetXFAPacketCount"] = makeInvalidEarlyAccess("_FPDF_GetXFAPacketCount");
    Module2["_FPDF_GetXFAPacketName"] = makeInvalidEarlyAccess("_FPDF_GetXFAPacketName");
    Module2["_FPDF_GetXFAPacketContent"] = makeInvalidEarlyAccess("_FPDF_GetXFAPacketContent");
    Module2["_FPDF_GetTrailerEnds"] = makeInvalidEarlyAccess("_FPDF_GetTrailerEnds");
    var _fflush = makeInvalidEarlyAccess("_fflush");
    var _emscripten_stack_get_end = makeInvalidEarlyAccess("_emscripten_stack_get_end");
    var _emscripten_builtin_memalign = makeInvalidEarlyAccess("_emscripten_builtin_memalign");
    var _strerror = makeInvalidEarlyAccess("_strerror");
    var _setThrew = makeInvalidEarlyAccess("_setThrew");
    var _emscripten_stack_init = makeInvalidEarlyAccess("_emscripten_stack_init");
    var __emscripten_stack_restore = makeInvalidEarlyAccess("__emscripten_stack_restore");
    var __emscripten_stack_alloc = makeInvalidEarlyAccess("__emscripten_stack_alloc");
    var _emscripten_stack_get_current = makeInvalidEarlyAccess("_emscripten_stack_get_current");
    function assignWasmExports(wasmExports2) {
      Module2["_PDFium_Init"] = createExportWrapper("PDFium_Init", 0);
      Module2["_FPDF_InitLibraryWithConfig"] = createExportWrapper(
        "FPDF_InitLibraryWithConfig",
        1
      );
      Module2["_FPDFAnnot_IsSupportedSubtype"] = createExportWrapper(
        "FPDFAnnot_IsSupportedSubtype",
        1
      );
      Module2["_FPDFPage_CreateAnnot"] = createExportWrapper("FPDFPage_CreateAnnot", 2);
      Module2["_FPDFPage_GetAnnotCount"] = createExportWrapper("FPDFPage_GetAnnotCount", 1);
      Module2["_FPDFPage_GetAnnot"] = createExportWrapper("FPDFPage_GetAnnot", 2);
      Module2["_FPDFPage_GetAnnotIndex"] = createExportWrapper("FPDFPage_GetAnnotIndex", 2);
      Module2["_FPDFPage_CloseAnnot"] = createExportWrapper("FPDFPage_CloseAnnot", 1);
      Module2["_FPDFPage_RemoveAnnot"] = createExportWrapper("FPDFPage_RemoveAnnot", 2);
      Module2["_FPDFAnnot_GetSubtype"] = createExportWrapper("FPDFAnnot_GetSubtype", 1);
      Module2["_FPDFAnnot_IsObjectSupportedSubtype"] = createExportWrapper(
        "FPDFAnnot_IsObjectSupportedSubtype",
        1
      );
      Module2["_FPDFAnnot_UpdateObject"] = createExportWrapper("FPDFAnnot_UpdateObject", 2);
      Module2["_FPDFAnnot_AddInkStroke"] = createExportWrapper("FPDFAnnot_AddInkStroke", 3);
      Module2["_FPDFAnnot_RemoveInkList"] = createExportWrapper("FPDFAnnot_RemoveInkList", 1);
      Module2["_FPDFAnnot_AppendObject"] = createExportWrapper("FPDFAnnot_AppendObject", 2);
      Module2["_FPDFAnnot_GetObjectCount"] = createExportWrapper(
        "FPDFAnnot_GetObjectCount",
        1
      );
      Module2["_FPDFAnnot_GetObject"] = createExportWrapper("FPDFAnnot_GetObject", 2);
      Module2["_FPDFAnnot_RemoveObject"] = createExportWrapper("FPDFAnnot_RemoveObject", 2);
      Module2["_FPDFAnnot_SetColor"] = createExportWrapper("FPDFAnnot_SetColor", 6);
      Module2["_FPDFAnnot_GetColor"] = createExportWrapper("FPDFAnnot_GetColor", 6);
      Module2["_FPDFAnnot_HasAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_HasAttachmentPoints",
        1
      );
      Module2["_FPDFAnnot_SetAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_SetAttachmentPoints",
        3
      );
      Module2["_FPDFAnnot_AppendAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_AppendAttachmentPoints",
        2
      );
      Module2["_FPDFAnnot_CountAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_CountAttachmentPoints",
        1
      );
      Module2["_FPDFAnnot_GetAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_GetAttachmentPoints",
        3
      );
      Module2["_FPDFAnnot_SetRect"] = createExportWrapper("FPDFAnnot_SetRect", 2);
      Module2["_FPDFAnnot_GetRect"] = createExportWrapper("FPDFAnnot_GetRect", 2);
      Module2["_FPDFAnnot_GetVertices"] = createExportWrapper("FPDFAnnot_GetVertices", 3);
      Module2["_FPDFAnnot_GetInkListCount"] = createExportWrapper(
        "FPDFAnnot_GetInkListCount",
        1
      );
      Module2["_FPDFAnnot_GetInkListPath"] = createExportWrapper(
        "FPDFAnnot_GetInkListPath",
        4
      );
      Module2["_FPDFAnnot_GetLine"] = createExportWrapper("FPDFAnnot_GetLine", 3);
      Module2["_FPDFAnnot_SetBorder"] = createExportWrapper("FPDFAnnot_SetBorder", 4);
      Module2["_FPDFAnnot_GetBorder"] = createExportWrapper("FPDFAnnot_GetBorder", 4);
      Module2["_FPDFAnnot_HasKey"] = createExportWrapper("FPDFAnnot_HasKey", 2);
      Module2["_FPDFAnnot_GetValueType"] = createExportWrapper("FPDFAnnot_GetValueType", 2);
      Module2["_FPDFAnnot_SetStringValue"] = createExportWrapper(
        "FPDFAnnot_SetStringValue",
        3
      );
      Module2["_FPDFAnnot_GetStringValue"] = createExportWrapper(
        "FPDFAnnot_GetStringValue",
        4
      );
      Module2["_FPDFAnnot_GetNumberValue"] = createExportWrapper(
        "FPDFAnnot_GetNumberValue",
        3
      );
      Module2["_FPDFAnnot_SetAP"] = createExportWrapper("FPDFAnnot_SetAP", 3);
      Module2["_FPDFAnnot_GetAP"] = createExportWrapper("FPDFAnnot_GetAP", 4);
      Module2["_FPDFAnnot_GetLinkedAnnot"] = createExportWrapper(
        "FPDFAnnot_GetLinkedAnnot",
        2
      );
      Module2["_FPDFAnnot_GetFlags"] = createExportWrapper("FPDFAnnot_GetFlags", 1);
      Module2["_FPDFAnnot_SetFlags"] = createExportWrapper("FPDFAnnot_SetFlags", 2);
      Module2["_FPDFAnnot_GetFormFieldFlags"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldFlags",
        2
      );
      Module2["_FPDFAnnot_SetFormFieldFlags"] = createExportWrapper(
        "FPDFAnnot_SetFormFieldFlags",
        3
      );
      Module2["_FPDFAnnot_GetFormFieldAtPoint"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldAtPoint",
        3
      );
      Module2["_FPDFAnnot_GetFormFieldName"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldName",
        4
      );
      Module2["_FPDFAnnot_GetFormFieldType"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldType",
        2
      );
      Module2["_FPDFAnnot_GetFormAdditionalActionJavaScript"] = createExportWrapper("FPDFAnnot_GetFormAdditionalActionJavaScript", 5);
      Module2["_FPDFAnnot_GetFormFieldAlternateName"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldAlternateName",
        4
      );
      Module2["_FPDFAnnot_GetFormFieldValue"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldValue",
        4
      );
      Module2["_FPDFAnnot_GetOptionCount"] = createExportWrapper(
        "FPDFAnnot_GetOptionCount",
        2
      );
      Module2["_FPDFAnnot_GetOptionLabel"] = createExportWrapper(
        "FPDFAnnot_GetOptionLabel",
        5
      );
      Module2["_FPDFAnnot_IsOptionSelected"] = createExportWrapper(
        "FPDFAnnot_IsOptionSelected",
        3
      );
      Module2["_FPDFAnnot_GetFontSize"] = createExportWrapper("FPDFAnnot_GetFontSize", 3);
      Module2["_FPDFAnnot_SetFontColor"] = createExportWrapper("FPDFAnnot_SetFontColor", 5);
      Module2["_FPDFAnnot_GetFontColor"] = createExportWrapper("FPDFAnnot_GetFontColor", 5);
      Module2["_FPDFAnnot_IsChecked"] = createExportWrapper("FPDFAnnot_IsChecked", 2);
      Module2["_FPDFAnnot_SetFocusableSubtypes"] = createExportWrapper(
        "FPDFAnnot_SetFocusableSubtypes",
        3
      );
      Module2["_FPDFAnnot_GetFocusableSubtypesCount"] = createExportWrapper(
        "FPDFAnnot_GetFocusableSubtypesCount",
        1
      );
      Module2["_FPDFAnnot_GetFocusableSubtypes"] = createExportWrapper(
        "FPDFAnnot_GetFocusableSubtypes",
        3
      );
      Module2["_FPDFAnnot_GetLink"] = createExportWrapper("FPDFAnnot_GetLink", 1);
      Module2["_FPDFAnnot_GetFormControlCount"] = createExportWrapper(
        "FPDFAnnot_GetFormControlCount",
        2
      );
      Module2["_FPDFAnnot_GetFormControlIndex"] = createExportWrapper(
        "FPDFAnnot_GetFormControlIndex",
        2
      );
      Module2["_FPDFAnnot_GetFormFieldExportValue"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldExportValue",
        4
      );
      Module2["_FPDFAnnot_SetURI"] = createExportWrapper("FPDFAnnot_SetURI", 2);
      Module2["_FPDFAnnot_GetFileAttachment"] = createExportWrapper(
        "FPDFAnnot_GetFileAttachment",
        1
      );
      Module2["_FPDFAnnot_AddFileAttachment"] = createExportWrapper(
        "FPDFAnnot_AddFileAttachment",
        2
      );
      Module2["_FPDFDoc_GetAttachmentCount"] = createExportWrapper(
        "FPDFDoc_GetAttachmentCount",
        1
      );
      Module2["_FPDFDoc_AddAttachment"] = createExportWrapper("FPDFDoc_AddAttachment", 2);
      Module2["_FPDFDoc_GetAttachment"] = createExportWrapper("FPDFDoc_GetAttachment", 2);
      Module2["_FPDFDoc_DeleteAttachment"] = createExportWrapper(
        "FPDFDoc_DeleteAttachment",
        2
      );
      Module2["_FPDFAttachment_GetName"] = createExportWrapper("FPDFAttachment_GetName", 3);
      Module2["_FPDFAttachment_HasKey"] = createExportWrapper("FPDFAttachment_HasKey", 2);
      Module2["_FPDFAttachment_GetValueType"] = createExportWrapper(
        "FPDFAttachment_GetValueType",
        2
      );
      Module2["_FPDFAttachment_SetStringValue"] = createExportWrapper(
        "FPDFAttachment_SetStringValue",
        3
      );
      Module2["_FPDFAttachment_GetStringValue"] = createExportWrapper(
        "FPDFAttachment_GetStringValue",
        4
      );
      Module2["_FPDFAttachment_SetFile"] = createExportWrapper("FPDFAttachment_SetFile", 4);
      Module2["_FPDFAttachment_GetFile"] = createExportWrapper("FPDFAttachment_GetFile", 4);
      Module2["_FPDFAttachment_GetSubtype"] = createExportWrapper(
        "FPDFAttachment_GetSubtype",
        3
      );
      Module2["_FPDFCatalog_IsTagged"] = createExportWrapper("FPDFCatalog_IsTagged", 1);
      Module2["_FPDFCatalog_SetLanguage"] = createExportWrapper("FPDFCatalog_SetLanguage", 2);
      Module2["_FPDFAvail_Create"] = createExportWrapper("FPDFAvail_Create", 2);
      Module2["_FPDFAvail_Destroy"] = createExportWrapper("FPDFAvail_Destroy", 1);
      Module2["_FPDFAvail_IsDocAvail"] = createExportWrapper("FPDFAvail_IsDocAvail", 2);
      Module2["_FPDFAvail_GetDocument"] = createExportWrapper("FPDFAvail_GetDocument", 2);
      Module2["_FPDFAvail_GetFirstPageNum"] = createExportWrapper(
        "FPDFAvail_GetFirstPageNum",
        1
      );
      Module2["_FPDFAvail_IsPageAvail"] = createExportWrapper("FPDFAvail_IsPageAvail", 3);
      Module2["_FPDFAvail_IsFormAvail"] = createExportWrapper("FPDFAvail_IsFormAvail", 2);
      Module2["_FPDFAvail_IsLinearized"] = createExportWrapper("FPDFAvail_IsLinearized", 1);
      Module2["_FPDFBookmark_GetFirstChild"] = createExportWrapper(
        "FPDFBookmark_GetFirstChild",
        2
      );
      Module2["_FPDFBookmark_GetNextSibling"] = createExportWrapper(
        "FPDFBookmark_GetNextSibling",
        2
      );
      Module2["_FPDFBookmark_GetTitle"] = createExportWrapper("FPDFBookmark_GetTitle", 3);
      Module2["_FPDFBookmark_GetCount"] = createExportWrapper("FPDFBookmark_GetCount", 1);
      Module2["_FPDFBookmark_Find"] = createExportWrapper("FPDFBookmark_Find", 2);
      Module2["_FPDFBookmark_GetDest"] = createExportWrapper("FPDFBookmark_GetDest", 2);
      Module2["_FPDFBookmark_GetAction"] = createExportWrapper("FPDFBookmark_GetAction", 1);
      Module2["_FPDFAction_GetType"] = createExportWrapper("FPDFAction_GetType", 1);
      Module2["_FPDFAction_GetDest"] = createExportWrapper("FPDFAction_GetDest", 2);
      Module2["_FPDFAction_GetFilePath"] = createExportWrapper("FPDFAction_GetFilePath", 3);
      Module2["_FPDFAction_GetURIPath"] = createExportWrapper("FPDFAction_GetURIPath", 4);
      Module2["_FPDFDest_GetDestPageIndex"] = createExportWrapper(
        "FPDFDest_GetDestPageIndex",
        2
      );
      Module2["_FPDFDest_GetView"] = createExportWrapper("FPDFDest_GetView", 3);
      Module2["_FPDFDest_GetLocationInPage"] = createExportWrapper(
        "FPDFDest_GetLocationInPage",
        7
      );
      Module2["_FPDFLink_GetLinkAtPoint"] = createExportWrapper("FPDFLink_GetLinkAtPoint", 3);
      Module2["_FPDFLink_GetLinkZOrderAtPoint"] = createExportWrapper(
        "FPDFLink_GetLinkZOrderAtPoint",
        3
      );
      Module2["_FPDFLink_GetDest"] = createExportWrapper("FPDFLink_GetDest", 2);
      Module2["_FPDFLink_GetAction"] = createExportWrapper("FPDFLink_GetAction", 1);
      Module2["_FPDFLink_Enumerate"] = createExportWrapper("FPDFLink_Enumerate", 3);
      Module2["_FPDFLink_GetAnnot"] = createExportWrapper("FPDFLink_GetAnnot", 2);
      Module2["_FPDFLink_GetAnnotRect"] = createExportWrapper("FPDFLink_GetAnnotRect", 2);
      Module2["_FPDFLink_CountQuadPoints"] = createExportWrapper(
        "FPDFLink_CountQuadPoints",
        1
      );
      Module2["_FPDFLink_GetQuadPoints"] = createExportWrapper("FPDFLink_GetQuadPoints", 3);
      Module2["_FPDF_GetPageAAction"] = createExportWrapper("FPDF_GetPageAAction", 2);
      Module2["_FPDF_GetFileIdentifier"] = createExportWrapper("FPDF_GetFileIdentifier", 4);
      Module2["_FPDF_GetMetaText"] = createExportWrapper("FPDF_GetMetaText", 4);
      Module2["_FPDF_GetPageLabel"] = createExportWrapper("FPDF_GetPageLabel", 4);
      Module2["_FPDFPageObj_NewImageObj"] = createExportWrapper("FPDFPageObj_NewImageObj", 1);
      Module2["_FPDFImageObj_LoadJpegFile"] = createExportWrapper(
        "FPDFImageObj_LoadJpegFile",
        4
      );
      Module2["_FPDFImageObj_LoadJpegFileInline"] = createExportWrapper(
        "FPDFImageObj_LoadJpegFileInline",
        4
      );
      Module2["_FPDFImageObj_SetMatrix"] = createExportWrapper("FPDFImageObj_SetMatrix", 7);
      Module2["_FPDFImageObj_SetBitmap"] = createExportWrapper("FPDFImageObj_SetBitmap", 4);
      Module2["_FPDFImageObj_GetBitmap"] = createExportWrapper("FPDFImageObj_GetBitmap", 1);
      Module2["_FPDFImageObj_GetRenderedBitmap"] = createExportWrapper(
        "FPDFImageObj_GetRenderedBitmap",
        3
      );
      Module2["_FPDFImageObj_GetImageDataDecoded"] = createExportWrapper(
        "FPDFImageObj_GetImageDataDecoded",
        3
      );
      Module2["_FPDFImageObj_GetImageDataRaw"] = createExportWrapper(
        "FPDFImageObj_GetImageDataRaw",
        3
      );
      Module2["_FPDFImageObj_GetImageFilterCount"] = createExportWrapper(
        "FPDFImageObj_GetImageFilterCount",
        1
      );
      Module2["_FPDFImageObj_GetImageFilter"] = createExportWrapper(
        "FPDFImageObj_GetImageFilter",
        4
      );
      Module2["_FPDFImageObj_GetImageMetadata"] = createExportWrapper(
        "FPDFImageObj_GetImageMetadata",
        3
      );
      Module2["_FPDFImageObj_GetImagePixelSize"] = createExportWrapper(
        "FPDFImageObj_GetImagePixelSize",
        3
      );
      Module2["_FPDFImageObj_GetIccProfileDataDecoded"] = createExportWrapper(
        "FPDFImageObj_GetIccProfileDataDecoded",
        5
      );
      Module2["_FPDF_CreateNewDocument"] = createExportWrapper("FPDF_CreateNewDocument", 0);
      Module2["_FPDFPage_Delete"] = createExportWrapper("FPDFPage_Delete", 2);
      Module2["_FPDF_MovePages"] = createExportWrapper("FPDF_MovePages", 4);
      Module2["_FPDFPage_New"] = createExportWrapper("FPDFPage_New", 4);
      Module2["_FPDFPage_GetRotation"] = createExportWrapper("FPDFPage_GetRotation", 1);
      Module2["_FPDFPage_InsertObject"] = createExportWrapper("FPDFPage_InsertObject", 2);
      Module2["_FPDFPage_InsertObjectAtIndex"] = createExportWrapper(
        "FPDFPage_InsertObjectAtIndex",
        3
      );
      Module2["_FPDFPage_RemoveObject"] = createExportWrapper("FPDFPage_RemoveObject", 2);
      Module2["_FPDFPage_CountObjects"] = createExportWrapper("FPDFPage_CountObjects", 1);
      Module2["_FPDFPage_GetObject"] = createExportWrapper("FPDFPage_GetObject", 2);
      Module2["_FPDFPage_HasTransparency"] = createExportWrapper(
        "FPDFPage_HasTransparency",
        1
      );
      Module2["_FPDFPageObj_Destroy"] = createExportWrapper("FPDFPageObj_Destroy", 1);
      Module2["_FPDFPageObj_GetMarkedContentID"] = createExportWrapper(
        "FPDFPageObj_GetMarkedContentID",
        1
      );
      Module2["_FPDFPageObj_CountMarks"] = createExportWrapper("FPDFPageObj_CountMarks", 1);
      Module2["_FPDFPageObj_GetMark"] = createExportWrapper("FPDFPageObj_GetMark", 2);
      Module2["_FPDFPageObj_AddMark"] = createExportWrapper("FPDFPageObj_AddMark", 2);
      Module2["_FPDFPageObj_RemoveMark"] = createExportWrapper("FPDFPageObj_RemoveMark", 2);
      Module2["_FPDFPageObjMark_GetName"] = createExportWrapper("FPDFPageObjMark_GetName", 4);
      Module2["_FPDFPageObjMark_CountParams"] = createExportWrapper(
        "FPDFPageObjMark_CountParams",
        1
      );
      Module2["_FPDFPageObjMark_GetParamKey"] = createExportWrapper(
        "FPDFPageObjMark_GetParamKey",
        5
      );
      Module2["_FPDFPageObjMark_GetParamValueType"] = createExportWrapper(
        "FPDFPageObjMark_GetParamValueType",
        2
      );
      Module2["_FPDFPageObjMark_GetParamIntValue"] = createExportWrapper(
        "FPDFPageObjMark_GetParamIntValue",
        3
      );
      Module2["_FPDFPageObjMark_GetParamStringValue"] = createExportWrapper(
        "FPDFPageObjMark_GetParamStringValue",
        5
      );
      Module2["_FPDFPageObjMark_GetParamBlobValue"] = createExportWrapper(
        "FPDFPageObjMark_GetParamBlobValue",
        5
      );
      Module2["_FPDFPageObj_HasTransparency"] = createExportWrapper(
        "FPDFPageObj_HasTransparency",
        1
      );
      Module2["_FPDFPageObjMark_SetIntParam"] = createExportWrapper(
        "FPDFPageObjMark_SetIntParam",
        5
      );
      Module2["_FPDFPageObjMark_SetStringParam"] = createExportWrapper(
        "FPDFPageObjMark_SetStringParam",
        5
      );
      Module2["_FPDFPageObjMark_SetBlobParam"] = createExportWrapper(
        "FPDFPageObjMark_SetBlobParam",
        6
      );
      Module2["_FPDFPageObjMark_RemoveParam"] = createExportWrapper(
        "FPDFPageObjMark_RemoveParam",
        3
      );
      Module2["_FPDFPageObj_GetType"] = createExportWrapper("FPDFPageObj_GetType", 1);
      Module2["_FPDFPageObj_GetIsActive"] = createExportWrapper("FPDFPageObj_GetIsActive", 2);
      Module2["_FPDFPageObj_SetIsActive"] = createExportWrapper("FPDFPageObj_SetIsActive", 2);
      Module2["_FPDFPage_GenerateContent"] = createExportWrapper(
        "FPDFPage_GenerateContent",
        1
      );
      Module2["_FPDFPageObj_Transform"] = createExportWrapper("FPDFPageObj_Transform", 7);
      Module2["_FPDFPageObj_TransformF"] = createExportWrapper("FPDFPageObj_TransformF", 2);
      Module2["_FPDFPageObj_GetMatrix"] = createExportWrapper("FPDFPageObj_GetMatrix", 2);
      Module2["_FPDFPageObj_SetMatrix"] = createExportWrapper("FPDFPageObj_SetMatrix", 2);
      Module2["_FPDFPageObj_SetBlendMode"] = createExportWrapper(
        "FPDFPageObj_SetBlendMode",
        2
      );
      Module2["_FPDFPage_TransformAnnots"] = createExportWrapper(
        "FPDFPage_TransformAnnots",
        7
      );
      Module2["_FPDFPage_SetRotation"] = createExportWrapper("FPDFPage_SetRotation", 2);
      Module2["_FPDFPageObj_SetFillColor"] = createExportWrapper(
        "FPDFPageObj_SetFillColor",
        5
      );
      Module2["_FPDFPageObj_GetFillColor"] = createExportWrapper(
        "FPDFPageObj_GetFillColor",
        5
      );
      Module2["_FPDFPageObj_GetBounds"] = createExportWrapper("FPDFPageObj_GetBounds", 5);
      Module2["_FPDFPageObj_GetRotatedBounds"] = createExportWrapper(
        "FPDFPageObj_GetRotatedBounds",
        2
      );
      Module2["_FPDFPageObj_SetStrokeColor"] = createExportWrapper(
        "FPDFPageObj_SetStrokeColor",
        5
      );
      Module2["_FPDFPageObj_GetStrokeColor"] = createExportWrapper(
        "FPDFPageObj_GetStrokeColor",
        5
      );
      Module2["_FPDFPageObj_SetStrokeWidth"] = createExportWrapper(
        "FPDFPageObj_SetStrokeWidth",
        2
      );
      Module2["_FPDFPageObj_GetStrokeWidth"] = createExportWrapper(
        "FPDFPageObj_GetStrokeWidth",
        2
      );
      Module2["_FPDFPageObj_GetLineJoin"] = createExportWrapper("FPDFPageObj_GetLineJoin", 1);
      Module2["_FPDFPageObj_SetLineJoin"] = createExportWrapper("FPDFPageObj_SetLineJoin", 2);
      Module2["_FPDFPageObj_GetLineCap"] = createExportWrapper("FPDFPageObj_GetLineCap", 1);
      Module2["_FPDFPageObj_SetLineCap"] = createExportWrapper("FPDFPageObj_SetLineCap", 2);
      Module2["_FPDFPageObj_GetDashPhase"] = createExportWrapper(
        "FPDFPageObj_GetDashPhase",
        2
      );
      Module2["_FPDFPageObj_SetDashPhase"] = createExportWrapper(
        "FPDFPageObj_SetDashPhase",
        2
      );
      Module2["_FPDFPageObj_GetDashCount"] = createExportWrapper(
        "FPDFPageObj_GetDashCount",
        1
      );
      Module2["_FPDFPageObj_GetDashArray"] = createExportWrapper(
        "FPDFPageObj_GetDashArray",
        3
      );
      Module2["_FPDFPageObj_SetDashArray"] = createExportWrapper(
        "FPDFPageObj_SetDashArray",
        4
      );
      Module2["_FPDFFormObj_CountObjects"] = createExportWrapper(
        "FPDFFormObj_CountObjects",
        1
      );
      Module2["_FPDFFormObj_GetObject"] = createExportWrapper("FPDFFormObj_GetObject", 2);
      Module2["_FPDFFormObj_RemoveObject"] = createExportWrapper(
        "FPDFFormObj_RemoveObject",
        2
      );
      Module2["_FPDFPageObj_CreateNewPath"] = createExportWrapper(
        "FPDFPageObj_CreateNewPath",
        2
      );
      Module2["_FPDFPageObj_CreateNewRect"] = createExportWrapper(
        "FPDFPageObj_CreateNewRect",
        4
      );
      Module2["_FPDFPath_CountSegments"] = createExportWrapper("FPDFPath_CountSegments", 1);
      Module2["_FPDFPath_GetPathSegment"] = createExportWrapper("FPDFPath_GetPathSegment", 2);
      Module2["_FPDFPath_MoveTo"] = createExportWrapper("FPDFPath_MoveTo", 3);
      Module2["_FPDFPath_LineTo"] = createExportWrapper("FPDFPath_LineTo", 3);
      Module2["_FPDFPath_BezierTo"] = createExportWrapper("FPDFPath_BezierTo", 7);
      Module2["_FPDFPath_Close"] = createExportWrapper("FPDFPath_Close", 1);
      Module2["_FPDFPath_SetDrawMode"] = createExportWrapper("FPDFPath_SetDrawMode", 3);
      Module2["_FPDFPath_GetDrawMode"] = createExportWrapper("FPDFPath_GetDrawMode", 3);
      Module2["_FPDFPathSegment_GetPoint"] = createExportWrapper(
        "FPDFPathSegment_GetPoint",
        3
      );
      Module2["_FPDFPathSegment_GetType"] = createExportWrapper("FPDFPathSegment_GetType", 1);
      Module2["_FPDFPathSegment_GetClose"] = createExportWrapper(
        "FPDFPathSegment_GetClose",
        1
      );
      Module2["_FPDFPageObj_NewTextObj"] = createExportWrapper("FPDFPageObj_NewTextObj", 3);
      Module2["_FPDFText_SetText"] = createExportWrapper("FPDFText_SetText", 2);
      Module2["_FPDFText_SetCharcodes"] = createExportWrapper("FPDFText_SetCharcodes", 3);
      Module2["_FPDFText_LoadFont"] = createExportWrapper("FPDFText_LoadFont", 5);
      Module2["_FPDFText_LoadStandardFont"] = createExportWrapper(
        "FPDFText_LoadStandardFont",
        2
      );
      Module2["_FPDFText_LoadCidType2Font"] = createExportWrapper(
        "FPDFText_LoadCidType2Font",
        6
      );
      Module2["_FPDFTextObj_GetFontSize"] = createExportWrapper("FPDFTextObj_GetFontSize", 2);
      Module2["_FPDFTextObj_GetText"] = createExportWrapper("FPDFTextObj_GetText", 4);
      Module2["_FPDFTextObj_GetRenderedBitmap"] = createExportWrapper(
        "FPDFTextObj_GetRenderedBitmap",
        4
      );
      Module2["_FPDFFont_Close"] = createExportWrapper("FPDFFont_Close", 1);
      Module2["_FPDFPageObj_CreateTextObj"] = createExportWrapper(
        "FPDFPageObj_CreateTextObj",
        3
      );
      Module2["_FPDFTextObj_GetTextRenderMode"] = createExportWrapper(
        "FPDFTextObj_GetTextRenderMode",
        1
      );
      Module2["_FPDFTextObj_SetTextRenderMode"] = createExportWrapper(
        "FPDFTextObj_SetTextRenderMode",
        2
      );
      Module2["_FPDFTextObj_GetFont"] = createExportWrapper("FPDFTextObj_GetFont", 1);
      Module2["_FPDFFont_GetBaseFontName"] = createExportWrapper(
        "FPDFFont_GetBaseFontName",
        3
      );
      Module2["_FPDFFont_GetFamilyName"] = createExportWrapper("FPDFFont_GetFamilyName", 3);
      Module2["_FPDFFont_GetFontData"] = createExportWrapper("FPDFFont_GetFontData", 4);
      Module2["_FPDFFont_GetIsEmbedded"] = createExportWrapper("FPDFFont_GetIsEmbedded", 1);
      Module2["_FPDFFont_GetFlags"] = createExportWrapper("FPDFFont_GetFlags", 1);
      Module2["_FPDFFont_GetWeight"] = createExportWrapper("FPDFFont_GetWeight", 1);
      Module2["_FPDFFont_GetItalicAngle"] = createExportWrapper("FPDFFont_GetItalicAngle", 2);
      Module2["_FPDFFont_GetAscent"] = createExportWrapper("FPDFFont_GetAscent", 3);
      Module2["_FPDFFont_GetDescent"] = createExportWrapper("FPDFFont_GetDescent", 3);
      Module2["_FPDFFont_GetGlyphWidth"] = createExportWrapper("FPDFFont_GetGlyphWidth", 4);
      Module2["_FPDFFont_GetGlyphPath"] = createExportWrapper("FPDFFont_GetGlyphPath", 3);
      Module2["_FPDFGlyphPath_CountGlyphSegments"] = createExportWrapper(
        "FPDFGlyphPath_CountGlyphSegments",
        1
      );
      Module2["_FPDFGlyphPath_GetGlyphPathSegment"] = createExportWrapper(
        "FPDFGlyphPath_GetGlyphPathSegment",
        2
      );
      Module2["_FSDK_SetUnSpObjProcessHandler"] = createExportWrapper(
        "FSDK_SetUnSpObjProcessHandler",
        1
      );
      Module2["_FSDK_SetTimeFunction"] = createExportWrapper("FSDK_SetTimeFunction", 1);
      Module2["_FSDK_SetLocaltimeFunction"] = createExportWrapper(
        "FSDK_SetLocaltimeFunction",
        1
      );
      Module2["_FPDFDoc_GetPageMode"] = createExportWrapper("FPDFDoc_GetPageMode", 1);
      Module2["_FPDFPage_Flatten"] = createExportWrapper("FPDFPage_Flatten", 2);
      Module2["_FPDFPage_HasFormFieldAtPoint"] = createExportWrapper(
        "FPDFPage_HasFormFieldAtPoint",
        4
      );
      Module2["_FPDFPage_FormFieldZOrderAtPoint"] = createExportWrapper(
        "FPDFPage_FormFieldZOrderAtPoint",
        4
      );
      Module2["_FPDFDOC_InitFormFillEnvironment"] = createExportWrapper(
        "FPDFDOC_InitFormFillEnvironment",
        2
      );
      Module2["_FPDFDOC_ExitFormFillEnvironment"] = createExportWrapper(
        "FPDFDOC_ExitFormFillEnvironment",
        1
      );
      Module2["_FORM_OnMouseMove"] = createExportWrapper("FORM_OnMouseMove", 5);
      Module2["_FORM_OnMouseWheel"] = createExportWrapper("FORM_OnMouseWheel", 6);
      Module2["_FORM_OnFocus"] = createExportWrapper("FORM_OnFocus", 5);
      Module2["_FORM_OnLButtonDown"] = createExportWrapper("FORM_OnLButtonDown", 5);
      Module2["_FORM_OnLButtonUp"] = createExportWrapper("FORM_OnLButtonUp", 5);
      Module2["_FORM_OnLButtonDoubleClick"] = createExportWrapper(
        "FORM_OnLButtonDoubleClick",
        5
      );
      Module2["_FORM_OnRButtonDown"] = createExportWrapper("FORM_OnRButtonDown", 5);
      Module2["_FORM_OnRButtonUp"] = createExportWrapper("FORM_OnRButtonUp", 5);
      Module2["_FORM_OnKeyDown"] = createExportWrapper("FORM_OnKeyDown", 4);
      Module2["_FORM_OnKeyUp"] = createExportWrapper("FORM_OnKeyUp", 4);
      Module2["_FORM_OnChar"] = createExportWrapper("FORM_OnChar", 4);
      Module2["_FORM_GetFocusedText"] = createExportWrapper("FORM_GetFocusedText", 4);
      Module2["_FORM_GetSelectedText"] = createExportWrapper("FORM_GetSelectedText", 4);
      Module2["_FORM_ReplaceAndKeepSelection"] = createExportWrapper(
        "FORM_ReplaceAndKeepSelection",
        3
      );
      Module2["_FORM_ReplaceSelection"] = createExportWrapper("FORM_ReplaceSelection", 3);
      Module2["_FORM_SelectAllText"] = createExportWrapper("FORM_SelectAllText", 2);
      Module2["_FORM_CanUndo"] = createExportWrapper("FORM_CanUndo", 2);
      Module2["_FORM_CanRedo"] = createExportWrapper("FORM_CanRedo", 2);
      Module2["_FORM_Undo"] = createExportWrapper("FORM_Undo", 2);
      Module2["_FORM_Redo"] = createExportWrapper("FORM_Redo", 2);
      Module2["_FORM_ForceToKillFocus"] = createExportWrapper("FORM_ForceToKillFocus", 1);
      Module2["_FORM_GetFocusedAnnot"] = createExportWrapper("FORM_GetFocusedAnnot", 3);
      Module2["_FORM_SetFocusedAnnot"] = createExportWrapper("FORM_SetFocusedAnnot", 2);
      Module2["_FPDF_FFLDraw"] = createExportWrapper("FPDF_FFLDraw", 9);
      Module2["_FPDF_SetFormFieldHighlightColor"] = createExportWrapper(
        "FPDF_SetFormFieldHighlightColor",
        3
      );
      Module2["_FPDF_SetFormFieldHighlightAlpha"] = createExportWrapper(
        "FPDF_SetFormFieldHighlightAlpha",
        2
      );
      Module2["_FPDF_RemoveFormFieldHighlight"] = createExportWrapper(
        "FPDF_RemoveFormFieldHighlight",
        1
      );
      Module2["_FORM_OnAfterLoadPage"] = createExportWrapper("FORM_OnAfterLoadPage", 2);
      Module2["_FORM_OnBeforeClosePage"] = createExportWrapper("FORM_OnBeforeClosePage", 2);
      Module2["_FORM_DoDocumentJSAction"] = createExportWrapper("FORM_DoDocumentJSAction", 1);
      Module2["_FORM_DoDocumentOpenAction"] = createExportWrapper(
        "FORM_DoDocumentOpenAction",
        1
      );
      Module2["_FORM_DoDocumentAAction"] = createExportWrapper("FORM_DoDocumentAAction", 2);
      Module2["_FORM_DoPageAAction"] = createExportWrapper("FORM_DoPageAAction", 3);
      Module2["_FORM_SetIndexSelected"] = createExportWrapper("FORM_SetIndexSelected", 4);
      Module2["_FORM_IsIndexSelected"] = createExportWrapper("FORM_IsIndexSelected", 3);
      Module2["_FPDFDoc_GetJavaScriptActionCount"] = createExportWrapper(
        "FPDFDoc_GetJavaScriptActionCount",
        1
      );
      Module2["_FPDFDoc_GetJavaScriptAction"] = createExportWrapper(
        "FPDFDoc_GetJavaScriptAction",
        2
      );
      Module2["_FPDFDoc_CloseJavaScriptAction"] = createExportWrapper(
        "FPDFDoc_CloseJavaScriptAction",
        1
      );
      Module2["_FPDFJavaScriptAction_GetName"] = createExportWrapper(
        "FPDFJavaScriptAction_GetName",
        3
      );
      Module2["_FPDFJavaScriptAction_GetScript"] = createExportWrapper(
        "FPDFJavaScriptAction_GetScript",
        3
      );
      Module2["_FPDF_ImportPagesByIndex"] = createExportWrapper("FPDF_ImportPagesByIndex", 5);
      Module2["_FPDF_ImportPages"] = createExportWrapper("FPDF_ImportPages", 4);
      Module2["_FPDF_ImportNPagesToOne"] = createExportWrapper("FPDF_ImportNPagesToOne", 5);
      Module2["_FPDF_NewXObjectFromPage"] = createExportWrapper("FPDF_NewXObjectFromPage", 3);
      Module2["_FPDF_CloseXObject"] = createExportWrapper("FPDF_CloseXObject", 1);
      Module2["_FPDF_NewFormObjectFromXObject"] = createExportWrapper(
        "FPDF_NewFormObjectFromXObject",
        1
      );
      Module2["_FPDF_CopyViewerPreferences"] = createExportWrapper(
        "FPDF_CopyViewerPreferences",
        2
      );
      Module2["_FPDF_RenderPageBitmapWithColorScheme_Start"] = createExportWrapper("FPDF_RenderPageBitmapWithColorScheme_Start", 10);
      Module2["_FPDF_RenderPageBitmap_Start"] = createExportWrapper(
        "FPDF_RenderPageBitmap_Start",
        9
      );
      Module2["_FPDF_RenderPage_Continue"] = createExportWrapper(
        "FPDF_RenderPage_Continue",
        2
      );
      Module2["_FPDF_RenderPage_Close"] = createExportWrapper("FPDF_RenderPage_Close", 1);
      Module2["_FPDF_SaveAsCopy"] = createExportWrapper("FPDF_SaveAsCopy", 3);
      Module2["_FPDF_SaveWithVersion"] = createExportWrapper("FPDF_SaveWithVersion", 4);
      Module2["_FPDFText_GetCharIndexFromTextIndex"] = createExportWrapper(
        "FPDFText_GetCharIndexFromTextIndex",
        2
      );
      Module2["_FPDFText_GetTextIndexFromCharIndex"] = createExportWrapper(
        "FPDFText_GetTextIndexFromCharIndex",
        2
      );
      Module2["_FPDF_GetSignatureCount"] = createExportWrapper("FPDF_GetSignatureCount", 1);
      Module2["_FPDF_GetSignatureObject"] = createExportWrapper("FPDF_GetSignatureObject", 2);
      Module2["_FPDFSignatureObj_GetContents"] = createExportWrapper(
        "FPDFSignatureObj_GetContents",
        3
      );
      Module2["_FPDFSignatureObj_GetByteRange"] = createExportWrapper(
        "FPDFSignatureObj_GetByteRange",
        3
      );
      Module2["_FPDFSignatureObj_GetSubFilter"] = createExportWrapper(
        "FPDFSignatureObj_GetSubFilter",
        3
      );
      Module2["_FPDFSignatureObj_GetReason"] = createExportWrapper(
        "FPDFSignatureObj_GetReason",
        3
      );
      Module2["_FPDFSignatureObj_GetTime"] = createExportWrapper(
        "FPDFSignatureObj_GetTime",
        3
      );
      Module2["_FPDFSignatureObj_GetDocMDPPermission"] = createExportWrapper(
        "FPDFSignatureObj_GetDocMDPPermission",
        1
      );
      Module2["_FPDF_StructTree_GetForPage"] = createExportWrapper(
        "FPDF_StructTree_GetForPage",
        1
      );
      Module2["_FPDF_StructTree_Close"] = createExportWrapper("FPDF_StructTree_Close", 1);
      Module2["_FPDF_StructTree_CountChildren"] = createExportWrapper(
        "FPDF_StructTree_CountChildren",
        1
      );
      Module2["_FPDF_StructTree_GetChildAtIndex"] = createExportWrapper(
        "FPDF_StructTree_GetChildAtIndex",
        2
      );
      Module2["_FPDF_StructElement_GetAltText"] = createExportWrapper(
        "FPDF_StructElement_GetAltText",
        3
      );
      Module2["_FPDF_StructElement_GetActualText"] = createExportWrapper(
        "FPDF_StructElement_GetActualText",
        3
      );
      Module2["_FPDF_StructElement_GetID"] = createExportWrapper(
        "FPDF_StructElement_GetID",
        3
      );
      Module2["_FPDF_StructElement_GetLang"] = createExportWrapper(
        "FPDF_StructElement_GetLang",
        3
      );
      Module2["_FPDF_StructElement_GetAttributeCount"] = createExportWrapper(
        "FPDF_StructElement_GetAttributeCount",
        1
      );
      Module2["_FPDF_StructElement_GetAttributeAtIndex"] = createExportWrapper(
        "FPDF_StructElement_GetAttributeAtIndex",
        2
      );
      Module2["_FPDF_StructElement_GetStringAttribute"] = createExportWrapper(
        "FPDF_StructElement_GetStringAttribute",
        4
      );
      Module2["_FPDF_StructElement_GetMarkedContentID"] = createExportWrapper(
        "FPDF_StructElement_GetMarkedContentID",
        1
      );
      Module2["_FPDF_StructElement_GetType"] = createExportWrapper(
        "FPDF_StructElement_GetType",
        3
      );
      Module2["_FPDF_StructElement_GetObjType"] = createExportWrapper(
        "FPDF_StructElement_GetObjType",
        3
      );
      Module2["_FPDF_StructElement_GetTitle"] = createExportWrapper(
        "FPDF_StructElement_GetTitle",
        3
      );
      Module2["_FPDF_StructElement_CountChildren"] = createExportWrapper(
        "FPDF_StructElement_CountChildren",
        1
      );
      Module2["_FPDF_StructElement_GetChildAtIndex"] = createExportWrapper(
        "FPDF_StructElement_GetChildAtIndex",
        2
      );
      Module2["_FPDF_StructElement_GetChildMarkedContentID"] = createExportWrapper("FPDF_StructElement_GetChildMarkedContentID", 2);
      Module2["_FPDF_StructElement_GetParent"] = createExportWrapper(
        "FPDF_StructElement_GetParent",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetCount"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetCount",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetName"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetName",
        5
      );
      Module2["_FPDF_StructElement_Attr_GetValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetValue",
        2
      );
      Module2["_FPDF_StructElement_Attr_GetType"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetType",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetBooleanValue"] = createExportWrapper("FPDF_StructElement_Attr_GetBooleanValue", 2);
      Module2["_FPDF_StructElement_Attr_GetNumberValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetNumberValue",
        2
      );
      Module2["_FPDF_StructElement_Attr_GetStringValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetStringValue",
        4
      );
      Module2["_FPDF_StructElement_Attr_GetBlobValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetBlobValue",
        4
      );
      Module2["_FPDF_StructElement_Attr_CountChildren"] = createExportWrapper(
        "FPDF_StructElement_Attr_CountChildren",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetChildAtIndex"] = createExportWrapper("FPDF_StructElement_Attr_GetChildAtIndex", 2);
      Module2["_FPDF_StructElement_GetMarkedContentIdCount"] = createExportWrapper("FPDF_StructElement_GetMarkedContentIdCount", 1);
      Module2["_FPDF_StructElement_GetMarkedContentIdAtIndex"] = createExportWrapper("FPDF_StructElement_GetMarkedContentIdAtIndex", 2);
      Module2["_FPDF_AddInstalledFont"] = createExportWrapper("FPDF_AddInstalledFont", 3);
      Module2["_FPDF_SetSystemFontInfo"] = createExportWrapper("FPDF_SetSystemFontInfo", 1);
      Module2["_FPDF_GetDefaultTTFMap"] = createExportWrapper("FPDF_GetDefaultTTFMap", 0);
      Module2["_FPDF_GetDefaultTTFMapCount"] = createExportWrapper(
        "FPDF_GetDefaultTTFMapCount",
        0
      );
      Module2["_FPDF_GetDefaultTTFMapEntry"] = createExportWrapper(
        "FPDF_GetDefaultTTFMapEntry",
        1
      );
      Module2["_FPDF_GetDefaultSystemFontInfo"] = createExportWrapper(
        "FPDF_GetDefaultSystemFontInfo",
        0
      );
      Module2["_FPDF_FreeDefaultSystemFontInfo"] = createExportWrapper(
        "FPDF_FreeDefaultSystemFontInfo",
        1
      );
      Module2["_FPDFText_LoadPage"] = createExportWrapper("FPDFText_LoadPage", 1);
      Module2["_FPDFText_ClosePage"] = createExportWrapper("FPDFText_ClosePage", 1);
      Module2["_FPDFText_CountChars"] = createExportWrapper("FPDFText_CountChars", 1);
      Module2["_FPDFText_GetUnicode"] = createExportWrapper("FPDFText_GetUnicode", 2);
      Module2["_FPDFText_GetTextObject"] = createExportWrapper("FPDFText_GetTextObject", 2);
      Module2["_FPDFText_IsGenerated"] = createExportWrapper("FPDFText_IsGenerated", 2);
      Module2["_FPDFText_IsHyphen"] = createExportWrapper("FPDFText_IsHyphen", 2);
      Module2["_FPDFText_HasUnicodeMapError"] = createExportWrapper(
        "FPDFText_HasUnicodeMapError",
        2
      );
      Module2["_FPDFText_GetFontSize"] = createExportWrapper("FPDFText_GetFontSize", 2);
      Module2["_FPDFText_GetFontInfo"] = createExportWrapper("FPDFText_GetFontInfo", 5);
      Module2["_FPDFText_GetFontWeight"] = createExportWrapper("FPDFText_GetFontWeight", 2);
      Module2["_FPDFText_GetFillColor"] = createExportWrapper("FPDFText_GetFillColor", 6);
      Module2["_FPDFText_GetStrokeColor"] = createExportWrapper("FPDFText_GetStrokeColor", 6);
      Module2["_FPDFText_GetCharAngle"] = createExportWrapper("FPDFText_GetCharAngle", 2);
      Module2["_FPDFText_GetCharBox"] = createExportWrapper("FPDFText_GetCharBox", 6);
      Module2["_FPDFText_GetLooseCharBox"] = createExportWrapper(
        "FPDFText_GetLooseCharBox",
        3
      );
      Module2["_FPDFText_GetMatrix"] = createExportWrapper("FPDFText_GetMatrix", 3);
      Module2["_FPDFText_GetCharOrigin"] = createExportWrapper("FPDFText_GetCharOrigin", 4);
      Module2["_FPDFText_GetCharIndexAtPos"] = createExportWrapper(
        "FPDFText_GetCharIndexAtPos",
        5
      );
      Module2["_FPDFText_GetText"] = createExportWrapper("FPDFText_GetText", 4);
      Module2["_FPDFText_CountRects"] = createExportWrapper("FPDFText_CountRects", 3);
      Module2["_FPDFText_GetRect"] = createExportWrapper("FPDFText_GetRect", 6);
      Module2["_FPDFText_GetBoundedText"] = createExportWrapper("FPDFText_GetBoundedText", 7);
      Module2["_FPDFText_FindStart"] = createExportWrapper("FPDFText_FindStart", 4);
      Module2["_FPDFText_FindNext"] = createExportWrapper("FPDFText_FindNext", 1);
      Module2["_FPDFText_FindPrev"] = createExportWrapper("FPDFText_FindPrev", 1);
      Module2["_FPDFText_GetSchResultIndex"] = createExportWrapper(
        "FPDFText_GetSchResultIndex",
        1
      );
      Module2["_FPDFText_GetSchCount"] = createExportWrapper("FPDFText_GetSchCount", 1);
      Module2["_FPDFText_FindClose"] = createExportWrapper("FPDFText_FindClose", 1);
      Module2["_FPDFLink_LoadWebLinks"] = createExportWrapper("FPDFLink_LoadWebLinks", 1);
      Module2["_FPDFLink_CountWebLinks"] = createExportWrapper("FPDFLink_CountWebLinks", 1);
      Module2["_FPDFLink_GetURL"] = createExportWrapper("FPDFLink_GetURL", 4);
      Module2["_FPDFLink_CountRects"] = createExportWrapper("FPDFLink_CountRects", 2);
      Module2["_FPDFLink_GetRect"] = createExportWrapper("FPDFLink_GetRect", 7);
      Module2["_FPDFLink_GetTextRange"] = createExportWrapper("FPDFLink_GetTextRange", 4);
      Module2["_FPDFLink_CloseWebLinks"] = createExportWrapper("FPDFLink_CloseWebLinks", 1);
      Module2["_FPDFPage_GetDecodedThumbnailData"] = createExportWrapper(
        "FPDFPage_GetDecodedThumbnailData",
        3
      );
      Module2["_FPDFPage_GetRawThumbnailData"] = createExportWrapper(
        "FPDFPage_GetRawThumbnailData",
        3
      );
      Module2["_FPDFPage_GetThumbnailAsBitmap"] = createExportWrapper(
        "FPDFPage_GetThumbnailAsBitmap",
        1
      );
      Module2["_FPDFPage_SetMediaBox"] = createExportWrapper("FPDFPage_SetMediaBox", 5);
      Module2["_FPDFPage_SetCropBox"] = createExportWrapper("FPDFPage_SetCropBox", 5);
      Module2["_FPDFPage_SetBleedBox"] = createExportWrapper("FPDFPage_SetBleedBox", 5);
      Module2["_FPDFPage_SetTrimBox"] = createExportWrapper("FPDFPage_SetTrimBox", 5);
      Module2["_FPDFPage_SetArtBox"] = createExportWrapper("FPDFPage_SetArtBox", 5);
      Module2["_FPDFPage_GetMediaBox"] = createExportWrapper("FPDFPage_GetMediaBox", 5);
      Module2["_FPDFPage_GetCropBox"] = createExportWrapper("FPDFPage_GetCropBox", 5);
      Module2["_FPDFPage_GetBleedBox"] = createExportWrapper("FPDFPage_GetBleedBox", 5);
      Module2["_FPDFPage_GetTrimBox"] = createExportWrapper("FPDFPage_GetTrimBox", 5);
      Module2["_FPDFPage_GetArtBox"] = createExportWrapper("FPDFPage_GetArtBox", 5);
      Module2["_FPDFPage_TransFormWithClip"] = createExportWrapper(
        "FPDFPage_TransFormWithClip",
        3
      );
      Module2["_FPDFPageObj_TransformClipPath"] = createExportWrapper(
        "FPDFPageObj_TransformClipPath",
        7
      );
      Module2["_FPDFPageObj_GetClipPath"] = createExportWrapper("FPDFPageObj_GetClipPath", 1);
      Module2["_FPDFClipPath_CountPaths"] = createExportWrapper("FPDFClipPath_CountPaths", 1);
      Module2["_FPDFClipPath_CountPathSegments"] = createExportWrapper(
        "FPDFClipPath_CountPathSegments",
        2
      );
      Module2["_FPDFClipPath_GetPathSegment"] = createExportWrapper(
        "FPDFClipPath_GetPathSegment",
        3
      );
      Module2["_FPDF_CreateClipPath"] = createExportWrapper("FPDF_CreateClipPath", 4);
      Module2["_FPDF_DestroyClipPath"] = createExportWrapper("FPDF_DestroyClipPath", 1);
      Module2["_FPDFPage_InsertClipPath"] = createExportWrapper("FPDFPage_InsertClipPath", 2);
      Module2["_FPDF_InitLibrary"] = createExportWrapper("FPDF_InitLibrary", 0);
      Module2["_malloc"] = createExportWrapper("malloc", 1);
      Module2["_free"] = createExportWrapper("free", 1);
      Module2["_FPDF_DestroyLibrary"] = createExportWrapper("FPDF_DestroyLibrary", 0);
      Module2["_FPDF_SetSandBoxPolicy"] = createExportWrapper("FPDF_SetSandBoxPolicy", 2);
      Module2["_FPDF_LoadDocument"] = createExportWrapper("FPDF_LoadDocument", 2);
      Module2["_FPDF_GetFormType"] = createExportWrapper("FPDF_GetFormType", 1);
      Module2["_FPDF_LoadXFA"] = createExportWrapper("FPDF_LoadXFA", 1);
      Module2["_FPDF_LoadMemDocument"] = createExportWrapper("FPDF_LoadMemDocument", 3);
      Module2["_FPDF_LoadMemDocument64"] = createExportWrapper("FPDF_LoadMemDocument64", 3);
      Module2["_FPDF_LoadCustomDocument"] = createExportWrapper("FPDF_LoadCustomDocument", 2);
      Module2["_FPDF_GetFileVersion"] = createExportWrapper("FPDF_GetFileVersion", 2);
      Module2["_FPDF_DocumentHasValidCrossReferenceTable"] = createExportWrapper("FPDF_DocumentHasValidCrossReferenceTable", 1);
      Module2["_FPDF_GetDocPermissions"] = createExportWrapper("FPDF_GetDocPermissions", 1);
      Module2["_FPDF_GetDocUserPermissions"] = createExportWrapper(
        "FPDF_GetDocUserPermissions",
        1
      );
      Module2["_FPDF_GetSecurityHandlerRevision"] = createExportWrapper(
        "FPDF_GetSecurityHandlerRevision",
        1
      );
      Module2["_FPDF_GetPageCount"] = createExportWrapper("FPDF_GetPageCount", 1);
      Module2["_FPDF_LoadPage"] = createExportWrapper("FPDF_LoadPage", 2);
      Module2["_FPDF_GetPageWidthF"] = createExportWrapper("FPDF_GetPageWidthF", 1);
      Module2["_FPDF_GetPageWidth"] = createExportWrapper("FPDF_GetPageWidth", 1);
      Module2["_FPDF_GetPageHeightF"] = createExportWrapper("FPDF_GetPageHeightF", 1);
      Module2["_FPDF_GetPageHeight"] = createExportWrapper("FPDF_GetPageHeight", 1);
      Module2["_FPDF_GetPageBoundingBox"] = createExportWrapper("FPDF_GetPageBoundingBox", 2);
      Module2["_FPDF_RenderPageBitmap"] = createExportWrapper("FPDF_RenderPageBitmap", 8);
      Module2["_FPDF_RenderPageBitmapWithMatrix"] = createExportWrapper(
        "FPDF_RenderPageBitmapWithMatrix",
        5
      );
      Module2["_FPDF_ClosePage"] = createExportWrapper("FPDF_ClosePage", 1);
      Module2["_FPDF_CloseDocument"] = createExportWrapper("FPDF_CloseDocument", 1);
      Module2["_FPDF_GetLastError"] = createExportWrapper("FPDF_GetLastError", 0);
      Module2["_FPDF_DeviceToPage"] = createExportWrapper("FPDF_DeviceToPage", 10);
      Module2["_FPDF_PageToDevice"] = createExportWrapper("FPDF_PageToDevice", 10);
      Module2["_FPDFBitmap_Create"] = createExportWrapper("FPDFBitmap_Create", 3);
      Module2["_FPDFBitmap_CreateEx"] = createExportWrapper("FPDFBitmap_CreateEx", 5);
      Module2["_FPDFBitmap_GetFormat"] = createExportWrapper("FPDFBitmap_GetFormat", 1);
      Module2["_FPDFBitmap_FillRect"] = createExportWrapper("FPDFBitmap_FillRect", 6);
      Module2["_FPDFBitmap_GetBuffer"] = createExportWrapper("FPDFBitmap_GetBuffer", 1);
      Module2["_FPDFBitmap_GetWidth"] = createExportWrapper("FPDFBitmap_GetWidth", 1);
      Module2["_FPDFBitmap_GetHeight"] = createExportWrapper("FPDFBitmap_GetHeight", 1);
      Module2["_FPDFBitmap_GetStride"] = createExportWrapper("FPDFBitmap_GetStride", 1);
      Module2["_FPDFBitmap_Destroy"] = createExportWrapper("FPDFBitmap_Destroy", 1);
      Module2["_FPDF_GetPageSizeByIndexF"] = createExportWrapper(
        "FPDF_GetPageSizeByIndexF",
        3
      );
      Module2["_FPDF_GetPageSizeByIndex"] = createExportWrapper("FPDF_GetPageSizeByIndex", 4);
      Module2["_FPDF_VIEWERREF_GetPrintScaling"] = createExportWrapper(
        "FPDF_VIEWERREF_GetPrintScaling",
        1
      );
      Module2["_FPDF_VIEWERREF_GetNumCopies"] = createExportWrapper(
        "FPDF_VIEWERREF_GetNumCopies",
        1
      );
      Module2["_FPDF_VIEWERREF_GetPrintPageRange"] = createExportWrapper(
        "FPDF_VIEWERREF_GetPrintPageRange",
        1
      );
      Module2["_FPDF_VIEWERREF_GetPrintPageRangeCount"] = createExportWrapper(
        "FPDF_VIEWERREF_GetPrintPageRangeCount",
        1
      );
      Module2["_FPDF_VIEWERREF_GetPrintPageRangeElement"] = createExportWrapper("FPDF_VIEWERREF_GetPrintPageRangeElement", 2);
      Module2["_FPDF_VIEWERREF_GetDuplex"] = createExportWrapper(
        "FPDF_VIEWERREF_GetDuplex",
        1
      );
      Module2["_FPDF_VIEWERREF_GetName"] = createExportWrapper("FPDF_VIEWERREF_GetName", 4);
      Module2["_FPDF_CountNamedDests"] = createExportWrapper("FPDF_CountNamedDests", 1);
      Module2["_FPDF_GetNamedDestByName"] = createExportWrapper("FPDF_GetNamedDestByName", 2);
      Module2["_FPDF_GetNamedDest"] = createExportWrapper("FPDF_GetNamedDest", 4);
      Module2["_FPDF_GetXFAPacketCount"] = createExportWrapper("FPDF_GetXFAPacketCount", 1);
      Module2["_FPDF_GetXFAPacketName"] = createExportWrapper("FPDF_GetXFAPacketName", 4);
      Module2["_FPDF_GetXFAPacketContent"] = createExportWrapper(
        "FPDF_GetXFAPacketContent",
        5
      );
      Module2["_FPDF_GetTrailerEnds"] = createExportWrapper("FPDF_GetTrailerEnds", 3);
      _fflush = createExportWrapper("fflush", 1);
      _emscripten_stack_get_end = wasmExports2["emscripten_stack_get_end"];
      wasmExports2["emscripten_stack_get_base"];
      _emscripten_builtin_memalign = createExportWrapper("emscripten_builtin_memalign", 2);
      _strerror = createExportWrapper("strerror", 1);
      _setThrew = createExportWrapper("setThrew", 2);
      _emscripten_stack_init = wasmExports2["emscripten_stack_init"];
      wasmExports2["emscripten_stack_get_free"];
      __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
      __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
      _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
    }
    __name(assignWasmExports, "assignWasmExports");
    var wasmImports = {
      __syscall_fcntl64: ___syscall_fcntl64,
      __syscall_fstat64: ___syscall_fstat64,
      __syscall_ftruncate64: ___syscall_ftruncate64,
      __syscall_getdents64: ___syscall_getdents64,
      __syscall_ioctl: ___syscall_ioctl,
      __syscall_lstat64: ___syscall_lstat64,
      __syscall_newfstatat: ___syscall_newfstatat,
      __syscall_openat: ___syscall_openat,
      __syscall_rmdir: ___syscall_rmdir,
      __syscall_stat64: ___syscall_stat64,
      __syscall_unlinkat: ___syscall_unlinkat,
      _abort_js: __abort_js,
      _emscripten_throw_longjmp: __emscripten_throw_longjmp,
      _gmtime_js: __gmtime_js,
      _localtime_js: __localtime_js,
      _tzset_js: __tzset_js,
      emscripten_date_now: _emscripten_date_now,
      emscripten_resize_heap: _emscripten_resize_heap,
      environ_get: _environ_get,
      environ_sizes_get: _environ_sizes_get,
      fd_close: _fd_close,
      fd_read: _fd_read,
      fd_seek: _fd_seek,
      fd_sync: _fd_sync,
      fd_write: _fd_write,
      invoke_ii,
      invoke_iii,
      invoke_iiii,
      invoke_iiiii,
      invoke_v,
      invoke_viii,
      invoke_viiii
    };
    var wasmExports = await createWasm();
    function invoke_viii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viii, "invoke_viii");
    function invoke_ii(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_ii, "invoke_ii");
    function invoke_iii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iii, "invoke_iii");
    function invoke_iiii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiii, "invoke_iiii");
    function invoke_viiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiii, "invoke_viiii");
    function invoke_iiiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiii, "invoke_iiiii");
    function invoke_v(index) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_v, "invoke_v");
    var calledRun;
    function stackCheckInit() {
      _emscripten_stack_init();
      writeStackCookie();
    }
    __name(stackCheckInit, "stackCheckInit");
    function run() {
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      stackCheckInit();
      preRun();
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      function doRun() {
        assert2(!calledRun);
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve?.(Module2);
        Module2["onRuntimeInitialized"]?.();
        consumedModuleProp("onRuntimeInitialized");
        assert2(
          !Module2["_main"],
          'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]'
        );
        postRun();
      }
      __name(doRun, "doRun");
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module2["setStatus"](""), 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
      checkStackCookie();
    }
    __name(run, "run");
    function preInit() {
      if (Module2["preInit"]) {
        if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
        while (Module2["preInit"].length > 0) {
          Module2["preInit"].shift()();
        }
      }
      consumedModuleProp("preInit");
    }
    __name(preInit, "preInit");
    preInit();
    run();
    if (runtimeInitialized) {
      moduleRtn = Module2;
    } else {
      moduleRtn = new Promise((resolve2, reject) => {
        readyPromiseResolve = resolve2;
        readyPromiseReject = reject;
      });
    }
    for (const prop of Object.keys(Module2)) {
      if (!(prop in moduleArg)) {
        Object.defineProperty(moduleArg, prop, {
          configurable: true,
          get() {
            abort2(
              `Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`
            );
          }
        });
      }
    }
    return moduleRtn;
  };
})();
var PDFiumLibrary2 = class extends PDFiumLibrary$1 {
  static {
    __name(this, "PDFiumLibrary");
  }
  static init(options) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield PDFiumLibrary$1.initBase({
        vendor: PDFiumModule,
        wasmBinary: options === null || options === void 0 ? void 0 : options.wasmBinary,
        wasmUrl: options === null || options === void 0 ? void 0 : options.wasmUrl,
        instantiateWasm: options === null || options === void 0 ? void 0 : options.instantiateWasm
      });
    });
  }
};

// node_modules/tesseract-wasm/dist/lib.js
function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}
__name(isMessagePort, "isMessagePort");
function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint))
    endpoint.close();
}
__name(closeEndPoint, "closeEndPoint");
function releaseEndpoint(ep) {
  return requestResponseMessage(ep, {
    type: "RELEASE"
  }).then(() => {
    closeEndPoint(ep);
  });
}
__name(releaseEndpoint, "releaseEndpoint");
var proxyCounter = /* @__PURE__ */ new WeakMap();
var proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((ep) => {
  const newCount = (proxyCounter.get(ep) || 0) - 1;
  proxyCounter.set(ep, newCount);
  if (newCount === 0) {
    releaseEndpoint(ep);
  }
});
function requestResponseMessage(ep, msg, transfers) {
  return new Promise((resolve2) => {
    const id = generateUUID();
    ep.addEventListener("message", /* @__PURE__ */ __name(function l(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }
      ep.removeEventListener("message", l);
      resolve2(ev.data);
    }, "l"));
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id }, msg), transfers);
  });
}
__name(requestResponseMessage, "requestResponseMessage");
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
__name(generateUUID, "generateUUID");
function imageDataFromBitmap(bitmap) {
  let canvas;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  } else if (typeof HTMLCanvasElement !== "undefined") {
    const canvasEl = document.createElement("canvas");
    canvasEl.width = bitmap.width;
    canvasEl.height = bitmap.height;
    canvas = canvasEl;
  } else {
    throw new Error("No canvas implementation available");
  }
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}
__name(imageDataFromBitmap, "imageDataFromBitmap");
var Module = (() => {
  var _scriptDir = import.meta.url;
  return (function(Module2 = {}) {
    var Module2 = typeof Module2 != "undefined" ? Module2 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module2["ready"] = new Promise(function(resolve2, reject) {
      readyPromiseResolve = resolve2;
      readyPromiseReject = reject;
    });
    var moduleOverrides = Object.assign({}, Module2);
    var thisProgram = "./this.program";
    var ENVIRONMENT_IS_WEB = true;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    __name(locateFile, "locateFile");
    var readBinary;
    {
      if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
    }
    var out = Module2["print"] || console.log.bind(console);
    var err = Module2["printErr"] || console.warn.bind(console);
    Object.assign(Module2, moduleOverrides);
    moduleOverrides = null;
    if (Module2["arguments"]) Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    if (Module2["quit"]) Module2["quit"];
    var wasmBinary;
    if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
    Module2["noExitRuntime"] || true;
    if (typeof WebAssembly != "object") {
      abort2("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    function assert2(condition, text) {
      if (!condition) {
        abort2(text);
      }
    }
    __name(assert2, "assert");
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
    function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }
    __name(UTF8ArrayToString, "UTF8ArrayToString");
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    __name(UTF8ToString, "UTF8ToString");
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    __name(stringToUTF8Array, "stringToUTF8Array");
    function stringToUTF82(str, outPtr, maxBytesToWrite) {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    __name(stringToUTF82, "stringToUTF8");
    function lengthBytesUTF82(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    }
    __name(lengthBytesUTF82, "lengthBytesUTF8");
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module2["HEAP8"] = HEAP8 = new Int8Array(b);
      Module2["HEAP16"] = HEAP16 = new Int16Array(b);
      Module2["HEAP32"] = HEAP32 = new Int32Array(b);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module2["HEAPU16"] = HEAPU16 = new Uint16Array(b);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module2["HEAPF32"] = HEAPF32 = new Float32Array(b);
      Module2["HEAPF64"] = HEAPF64 = new Float64Array(b);
    }
    __name(updateMemoryViews, "updateMemoryViews");
    var wasmTable;
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATPOSTRUN__ = [];
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    __name(preRun, "preRun");
    function initRuntime() {
      callRuntimeCallbacks(__ATINIT__);
    }
    __name(initRuntime, "initRuntime");
    function postRun() {
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    __name(postRun, "postRun");
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    __name(addOnPreRun, "addOnPreRun");
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    __name(addOnInit, "addOnInit");
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    __name(addOnPostRun, "addOnPostRun");
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
      runDependencies++;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
    }
    __name(addRunDependency, "addRunDependency");
    function removeRunDependency(id) {
      runDependencies--;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    __name(removeRunDependency, "removeRunDependency");
    function abort2(what) {
      if (Module2["onAbort"]) {
        Module2["onAbort"](what);
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    __name(abort2, "abort");
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    __name(isDataURI, "isDataURI");
    var wasmBinaryFile;
    if (Module2["locateFile"]) {
      wasmBinaryFile = "tesseract-core.wasm";
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL("tesseract-core.wasm", import.meta.url).href;
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) ;
        throw "both async and sync fetching of the wasm failed";
      } catch (err2) {
        abort2(err2);
      }
    }
    __name(getBinary, "getBinary");
    function getBinaryPromise() {
      if (!wasmBinary && ENVIRONMENT_IS_WEB) {
        if (typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(wasmBinaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile);
      });
    }
    __name(getBinaryPromise, "getBinaryPromise");
    function createWasm() {
      var info = { "a": wasmImports };
      function receiveInstance(instance, module) {
        var exports2 = instance.exports;
        Module2["asm"] = exports2;
        wasmMemory = Module2["asm"]["U"];
        updateMemoryViews();
        wasmTable = Module2["asm"]["X"];
        addOnInit(Module2["asm"]["V"]);
        removeRunDependency();
      }
      __name(receiveInstance, "receiveInstance");
      addRunDependency();
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      __name(receiveInstantiationResult, "receiveInstantiationResult");
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(function(instance) {
          return instance;
        }).then(receiver, function(reason) {
          err("failed to asynchronously prepare wasm: " + reason);
          abort2(reason);
        });
      }
      __name(instantiateArrayBuffer, "instantiateArrayBuffer");
      function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(receiveInstantiationResult, function(reason) {
              err("wasm streaming compile failed: " + reason);
              err("falling back to ArrayBuffer instantiation");
              return instantiateArrayBuffer(receiveInstantiationResult);
            });
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiationResult);
        }
      }
      __name(instantiateAsync, "instantiateAsync");
      if (Module2["instantiateWasm"]) {
        try {
          var exports = Module2["instantiateWasm"](info, receiveInstance);
          return exports;
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          readyPromiseReject(e);
        }
      }
      instantiateAsync().catch(readyPromiseReject);
      return {};
    }
    __name(createWasm, "createWasm");
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    }
    __name(callRuntimeCallbacks, "callRuntimeCallbacks");
    function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
      this.set_type = function(type) {
        HEAPU32[this.ptr + 4 >> 2] = type;
      };
      this.get_type = function() {
        return HEAPU32[this.ptr + 4 >> 2];
      };
      this.set_destructor = function(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor;
      };
      this.get_destructor = function() {
        return HEAPU32[this.ptr + 8 >> 2];
      };
      this.set_refcount = function(refcount) {
        HEAP32[this.ptr >> 2] = refcount;
      };
      this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12 >> 0] = caught;
      };
      this.get_caught = function() {
        return HEAP8[this.ptr + 12 >> 0] != 0;
      };
      this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13 >> 0] = rethrown;
      };
      this.get_rethrown = function() {
        return HEAP8[this.ptr + 13 >> 0] != 0;
      };
      this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false);
      };
      this.add_ref = function() {
        var value = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = value + 1;
      };
      this.release_ref = function() {
        var prev = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = prev - 1;
        return prev === 1;
      };
      this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
      };
      this.get_adjusted_ptr = function() {
        return HEAPU32[this.ptr + 16 >> 2];
      };
      this.get_exception_ptr = function() {
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
          return HEAPU32[this.excPtr >> 2];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
      };
    }
    __name(ExceptionInfo, "ExceptionInfo");
    function ___cxa_throw(ptr, type, destructor) {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      throw ptr;
    }
    __name(___cxa_throw, "___cxa_throw");
    function ___syscall_fcntl64(fd, cmd, varargs) {
      return 0;
    }
    __name(___syscall_fcntl64, "___syscall_fcntl64");
    function ___syscall_getcwd(buf, size) {
    }
    __name(___syscall_getcwd, "___syscall_getcwd");
    function ___syscall_ioctl(fd, op, varargs) {
      return 0;
    }
    __name(___syscall_ioctl, "___syscall_ioctl");
    function ___syscall_openat(dirfd, path, flags, varargs) {
    }
    __name(___syscall_openat, "___syscall_openat");
    function ___syscall_rmdir(path) {
    }
    __name(___syscall_rmdir, "___syscall_rmdir");
    function ___syscall_unlinkat(dirfd, path, flags) {
    }
    __name(___syscall_unlinkat, "___syscall_unlinkat");
    var structRegistrations = {};
    function runDestructors(destructors) {
      while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr);
      }
    }
    __name(runDestructors, "runDestructors");
    function simpleReadValueFromPointer(pointer) {
      return this["fromWireType"](HEAP32[pointer >> 2]);
    }
    __name(simpleReadValueFromPointer, "simpleReadValueFromPointer");
    var awaitingDependencies = {};
    var registeredTypes = {};
    var typeDependencies = {};
    var char_0 = 48;
    var char_9 = 57;
    function makeLegalFunctionName(name) {
      if (void 0 === name) {
        return "_unknown";
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, "$");
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
        return "_" + name;
      }
      return name;
    }
    __name(makeLegalFunctionName, "makeLegalFunctionName");
    function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      return function() {
        return body.apply(this, arguments);
      };
    }
    __name(createNamedFunction, "createNamedFunction");
    function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
        this.name = errorName;
        this.message = message;
        var stack = new Error(message).stack;
        if (stack !== void 0) {
          this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
        }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
        if (this.message === void 0) {
          return this.name;
        } else {
          return this.name + ": " + this.message;
        }
      };
      return errorClass;
    }
    __name(extendError, "extendError");
    var InternalError = void 0;
    function throwInternalError(message) {
      throw new InternalError(message);
    }
    __name(throwInternalError, "throwInternalError");
    function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
        typeDependencies[type] = dependentTypes;
      });
      function onComplete(typeConverters2) {
        var myTypeConverters = getTypeConverters(typeConverters2);
        if (myTypeConverters.length !== myTypes.length) {
          throwInternalError("Mismatched type converter count");
        }
        for (var i = 0; i < myTypes.length; ++i) {
          registerType(myTypes[i], myTypeConverters[i]);
        }
      }
      __name(onComplete, "onComplete");
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach((dt, i) => {
        if (registeredTypes.hasOwnProperty(dt)) {
          typeConverters[i] = registeredTypes[dt];
        } else {
          unregisteredTypes.push(dt);
          if (!awaitingDependencies.hasOwnProperty(dt)) {
            awaitingDependencies[dt] = [];
          }
          awaitingDependencies[dt].push(() => {
            typeConverters[i] = registeredTypes[dt];
            ++registered;
            if (registered === unregisteredTypes.length) {
              onComplete(typeConverters);
            }
          });
        }
      });
      if (0 === unregisteredTypes.length) {
        onComplete(typeConverters);
      }
    }
    __name(whenDependentTypesAreResolved, "whenDependentTypesAreResolved");
    function __embind_finalize_value_object(structType) {
      var reg = structRegistrations[structType];
      delete structRegistrations[structType];
      var rawConstructor = reg.rawConstructor;
      var rawDestructor = reg.rawDestructor;
      var fieldRecords = reg.fields;
      var fieldTypes = fieldRecords.map((field) => field.getterReturnType).concat(fieldRecords.map((field) => field.setterArgumentType));
      whenDependentTypesAreResolved([structType], fieldTypes, (fieldTypes2) => {
        var fields = {};
        fieldRecords.forEach((field, i) => {
          var fieldName = field.fieldName;
          var getterReturnType = fieldTypes2[i];
          var getter = field.getter;
          var getterContext = field.getterContext;
          var setterArgumentType = fieldTypes2[i + fieldRecords.length];
          var setter = field.setter;
          var setterContext = field.setterContext;
          fields[fieldName] = { read: /* @__PURE__ */ __name((ptr) => {
            return getterReturnType["fromWireType"](getter(getterContext, ptr));
          }, "read"), write: /* @__PURE__ */ __name((ptr, o) => {
            var destructors = [];
            setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
            runDestructors(destructors);
          }, "write") };
        });
        return [{ name: reg.name, "fromWireType": /* @__PURE__ */ __name(function(ptr) {
          var rv = {};
          for (var i in fields) {
            rv[i] = fields[i].read(ptr);
          }
          rawDestructor(ptr);
          return rv;
        }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, o) {
          for (var fieldName in fields) {
            if (!(fieldName in o)) {
              throw new TypeError('Missing field:  "' + fieldName + '"');
            }
          }
          var ptr = rawConstructor();
          for (fieldName in fields) {
            fields[fieldName].write(ptr, o[fieldName]);
          }
          if (destructors !== null) {
            destructors.push(rawDestructor, ptr);
          }
          return ptr;
        }, "toWireType"), "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: rawDestructor }];
      });
    }
    __name(__embind_finalize_value_object, "__embind_finalize_value_object");
    function __embind_register_bigint(primitiveType, name, size, minRange, maxRange) {
    }
    __name(__embind_register_bigint, "__embind_register_bigint");
    function getShiftFromSize(size) {
      switch (size) {
        case 1:
          return 0;
        case 2:
          return 1;
        case 4:
          return 2;
        case 8:
          return 3;
        default:
          throw new TypeError("Unknown type size: " + size);
      }
    }
    __name(getShiftFromSize, "getShiftFromSize");
    function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
        codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }
    __name(embind_init_charCodes, "embind_init_charCodes");
    var embind_charCodes = void 0;
    function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
        ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
    __name(readLatin1String, "readLatin1String");
    var BindingError = void 0;
    function throwBindingError(message) {
      throw new BindingError(message);
    }
    __name(throwBindingError, "throwBindingError");
    function registerType(rawType, registeredInstance, options = {}) {
      if (!("argPackAdvance" in registeredInstance)) {
        throw new TypeError("registerType registeredInstance requires argPackAdvance");
      }
      var name = registeredInstance.name;
      if (!rawType) {
        throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
          return;
        } else {
          throwBindingError("Cannot register type '" + name + "' twice");
        }
      }
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
      if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((cb) => cb());
      }
    }
    __name(registerType, "registerType");
    function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": /* @__PURE__ */ __name(function(wt) {
        return !!wt;
      }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, o) {
        return o ? trueValue : falseValue;
      }, "toWireType"), "argPackAdvance": 8, "readValueFromPointer": /* @__PURE__ */ __name(function(pointer) {
        var heap;
        if (size === 1) {
          heap = HEAP8;
        } else if (size === 2) {
          heap = HEAP16;
        } else if (size === 4) {
          heap = HEAP32;
        } else {
          throw new TypeError("Unknown boolean type size: " + name);
        }
        return this["fromWireType"](heap[pointer >> shift]);
      }, "readValueFromPointer"), destructorFunction: null });
    }
    __name(__embind_register_bool, "__embind_register_bool");
    function ClassHandle_isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
        return false;
      }
      if (!(other instanceof ClassHandle)) {
        return false;
      }
      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;
      while (leftClass.baseClass) {
        left = leftClass.upcast(left);
        leftClass = leftClass.baseClass;
      }
      while (rightClass.baseClass) {
        right = rightClass.upcast(right);
        rightClass = rightClass.baseClass;
      }
      return leftClass === rightClass && left === right;
    }
    __name(ClassHandle_isAliasOf, "ClassHandle_isAliasOf");
    function shallowCopyInternalPointer(o) {
      return { count: o.count, deleteScheduled: o.deleteScheduled, preservePointerOnDelete: o.preservePointerOnDelete, ptr: o.ptr, ptrType: o.ptrType, smartPtr: o.smartPtr, smartPtrType: o.smartPtrType };
    }
    __name(shallowCopyInternalPointer, "shallowCopyInternalPointer");
    function throwInstanceAlreadyDeleted(obj) {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      __name(getInstanceTypeName, "getInstanceTypeName");
      throwBindingError(getInstanceTypeName(obj) + " instance already deleted");
    }
    __name(throwInstanceAlreadyDeleted, "throwInstanceAlreadyDeleted");
    var finalizationRegistry = false;
    function detachFinalizer(handle) {
    }
    __name(detachFinalizer, "detachFinalizer");
    function runDestructor($$) {
      if ($$.smartPtr) {
        $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
        $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    }
    __name(runDestructor, "runDestructor");
    function releaseClassHandle($$) {
      $$.count.value -= 1;
      var toDelete = 0 === $$.count.value;
      if (toDelete) {
        runDestructor($$);
      }
    }
    __name(releaseClassHandle, "releaseClassHandle");
    function downcastPointer(ptr, ptrClass, desiredClass) {
      if (ptrClass === desiredClass) {
        return ptr;
      }
      if (void 0 === desiredClass.baseClass) {
        return null;
      }
      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
        return null;
      }
      return desiredClass.downcast(rv);
    }
    __name(downcastPointer, "downcastPointer");
    var registeredPointers = {};
    function getInheritedInstanceCount() {
      return Object.keys(registeredInstances).length;
    }
    __name(getInheritedInstanceCount, "getInheritedInstanceCount");
    function getLiveInheritedInstances() {
      var rv = [];
      for (var k in registeredInstances) {
        if (registeredInstances.hasOwnProperty(k)) {
          rv.push(registeredInstances[k]);
        }
      }
      return rv;
    }
    __name(getLiveInheritedInstances, "getLiveInheritedInstances");
    var deletionQueue = [];
    function flushPendingDeletes() {
      while (deletionQueue.length) {
        var obj = deletionQueue.pop();
        obj.$$.deleteScheduled = false;
        obj["delete"]();
      }
    }
    __name(flushPendingDeletes, "flushPendingDeletes");
    var delayFunction = void 0;
    function setDelayFunction(fn) {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
    }
    __name(setDelayFunction, "setDelayFunction");
    function init_embind() {
      Module2["getInheritedInstanceCount"] = getInheritedInstanceCount;
      Module2["getLiveInheritedInstances"] = getLiveInheritedInstances;
      Module2["flushPendingDeletes"] = flushPendingDeletes;
      Module2["setDelayFunction"] = setDelayFunction;
    }
    __name(init_embind, "init_embind");
    var registeredInstances = {};
    function getBasestPointer(class_, ptr) {
      if (ptr === void 0) {
        throwBindingError("ptr should not be undefined");
      }
      while (class_.baseClass) {
        ptr = class_.upcast(ptr);
        class_ = class_.baseClass;
      }
      return ptr;
    }
    __name(getBasestPointer, "getBasestPointer");
    function getInheritedInstance(class_, ptr) {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    }
    __name(getInheritedInstance, "getInheritedInstance");
    function makeClassHandle(prototype, record) {
      if (!record.ptrType || !record.ptr) {
        throwInternalError("makeClassHandle requires ptr and ptrType");
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
        throwInternalError("Both smartPtrType and smartPtr must be specified");
      }
      record.count = { value: 1 };
      return attachFinalizer(Object.create(prototype, { $$: { value: record } }));
    }
    __name(makeClassHandle, "makeClassHandle");
    function RegisteredPointer_fromWireType(ptr) {
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
        this.destructor(ptr);
        return null;
      }
      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (void 0 !== registeredInstance) {
        if (0 === registeredInstance.$$.count.value) {
          registeredInstance.$$.ptr = rawPointer;
          registeredInstance.$$.smartPtr = ptr;
          return registeredInstance["clone"]();
        } else {
          var rv = registeredInstance["clone"]();
          this.destructor(ptr);
          return rv;
        }
      }
      function makeDefaultHandle() {
        if (this.isSmartPointer) {
          return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this.pointeeType, ptr: rawPointer, smartPtrType: this, smartPtr: ptr });
        } else {
          return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this, ptr });
        }
      }
      __name(makeDefaultHandle, "makeDefaultHandle");
      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
        return makeDefaultHandle.call(this);
      }
      var toType;
      if (this.isConst) {
        toType = registeredPointerRecord.constPointerType;
      } else {
        toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
      if (dp === null) {
        return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
        return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp, smartPtrType: this, smartPtr: ptr });
      } else {
        return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp });
      }
    }
    __name(RegisteredPointer_fromWireType, "RegisteredPointer_fromWireType");
    function attachFinalizer(handle) {
      if ("undefined" === typeof FinalizationRegistry) {
        attachFinalizer = /* @__PURE__ */ __name((handle2) => handle2, "attachFinalizer");
        return handle;
      }
      finalizationRegistry = new FinalizationRegistry((info) => {
        releaseClassHandle(info.$$);
      });
      attachFinalizer = /* @__PURE__ */ __name((handle2) => {
        var $$ = handle2.$$;
        var hasSmartPtr = !!$$.smartPtr;
        if (hasSmartPtr) {
          var info = { $$ };
          finalizationRegistry.register(handle2, info, handle2);
        }
        return handle2;
      }, "attachFinalizer");
      detachFinalizer = /* @__PURE__ */ __name((handle2) => finalizationRegistry.unregister(handle2), "detachFinalizer");
      return attachFinalizer(handle);
    }
    __name(attachFinalizer, "attachFinalizer");
    function ClassHandle_clone() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.preservePointerOnDelete) {
        this.$$.count.value += 1;
        return this;
      } else {
        var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), { $$: { value: shallowCopyInternalPointer(this.$$) } }));
        clone.$$.count.value += 1;
        clone.$$.deleteScheduled = false;
        return clone;
      }
    }
    __name(ClassHandle_clone, "ClassHandle_clone");
    function ClassHandle_delete() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion");
      }
      detachFinalizer(this);
      releaseClassHandle(this.$$);
      if (!this.$$.preservePointerOnDelete) {
        this.$$.smartPtr = void 0;
        this.$$.ptr = void 0;
      }
    }
    __name(ClassHandle_delete, "ClassHandle_delete");
    function ClassHandle_isDeleted() {
      return !this.$$.ptr;
    }
    __name(ClassHandle_isDeleted, "ClassHandle_isDeleted");
    function ClassHandle_deleteLater() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion");
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    }
    __name(ClassHandle_deleteLater, "ClassHandle_deleteLater");
    function init_ClassHandle() {
      ClassHandle.prototype["isAliasOf"] = ClassHandle_isAliasOf;
      ClassHandle.prototype["clone"] = ClassHandle_clone;
      ClassHandle.prototype["delete"] = ClassHandle_delete;
      ClassHandle.prototype["isDeleted"] = ClassHandle_isDeleted;
      ClassHandle.prototype["deleteLater"] = ClassHandle_deleteLater;
    }
    __name(init_ClassHandle, "init_ClassHandle");
    function ClassHandle() {
    }
    __name(ClassHandle, "ClassHandle");
    function ensureOverloadTable(proto, methodName, humanName) {
      if (void 0 === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        proto[methodName] = function() {
          if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
            throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
          }
          return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
        };
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }
    __name(ensureOverloadTable, "ensureOverloadTable");
    function exposePublicSymbol(name, value, numArguments) {
      if (Module2.hasOwnProperty(name)) {
        if (void 0 === numArguments || void 0 !== Module2[name].overloadTable && void 0 !== Module2[name].overloadTable[numArguments]) {
          throwBindingError("Cannot register public name '" + name + "' twice");
        }
        ensureOverloadTable(Module2, name, name);
        if (Module2.hasOwnProperty(numArguments)) {
          throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
        }
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        if (void 0 !== numArguments) {
          Module2[name].numArguments = numArguments;
        }
      }
    }
    __name(exposePublicSymbol, "exposePublicSymbol");
    function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }
    __name(RegisteredClass, "RegisteredClass");
    function upcastPointer(ptr, ptrClass, desiredClass) {
      while (ptrClass !== desiredClass) {
        if (!ptrClass.upcast) {
          throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
        }
        ptr = ptrClass.upcast(ptr);
        ptrClass = ptrClass.baseClass;
      }
      return ptr;
    }
    __name(upcastPointer, "upcastPointer");
    function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError("null is not a valid " + this.name);
        }
        return 0;
      }
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
    __name(constNoSmartPtrRawPointerToWireType, "constNoSmartPtrRawPointerToWireType");
    function genericPointerToWireType(destructors, handle) {
      var ptr;
      if (handle === null) {
        if (this.isReference) {
          throwBindingError("null is not a valid " + this.name);
        }
        if (this.isSmartPointer) {
          ptr = this.rawConstructor();
          if (destructors !== null) {
            destructors.push(this.rawDestructor, ptr);
          }
          return ptr;
        } else {
          return 0;
        }
      }
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
        throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      if (this.isSmartPointer) {
        if (void 0 === handle.$$.smartPtr) {
          throwBindingError("Passing raw pointer to smart pointer is illegal");
        }
        switch (this.sharingPolicy) {
          case 0:
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
            }
            break;
          case 1:
            ptr = handle.$$.smartPtr;
            break;
          case 2:
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              var clonedHandle = handle["clone"]();
              ptr = this.rawShare(ptr, Emval.toHandle(function() {
                clonedHandle["delete"]();
              }));
              if (destructors !== null) {
                destructors.push(this.rawDestructor, ptr);
              }
            }
            break;
          default:
            throwBindingError("Unsupporting sharing policy");
        }
      }
      return ptr;
    }
    __name(genericPointerToWireType, "genericPointerToWireType");
    function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError("null is not a valid " + this.name);
        }
        return 0;
      }
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
      }
      if (handle.$$.ptrType.isConst) {
        throwBindingError("Cannot convert argument of type " + handle.$$.ptrType.name + " to parameter type " + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
    __name(nonConstNoSmartPtrRawPointerToWireType, "nonConstNoSmartPtrRawPointerToWireType");
    function RegisteredPointer_getPointee(ptr) {
      if (this.rawGetPointee) {
        ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }
    __name(RegisteredPointer_getPointee, "RegisteredPointer_getPointee");
    function RegisteredPointer_destructor(ptr) {
      if (this.rawDestructor) {
        this.rawDestructor(ptr);
      }
    }
    __name(RegisteredPointer_destructor, "RegisteredPointer_destructor");
    function RegisteredPointer_deleteObject(handle) {
      if (handle !== null) {
        handle["delete"]();
      }
    }
    __name(RegisteredPointer_deleteObject, "RegisteredPointer_deleteObject");
    function init_RegisteredPointer() {
      RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
      RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
      RegisteredPointer.prototype["argPackAdvance"] = 8;
      RegisteredPointer.prototype["readValueFromPointer"] = simpleReadValueFromPointer;
      RegisteredPointer.prototype["deleteObject"] = RegisteredPointer_deleteObject;
      RegisteredPointer.prototype["fromWireType"] = RegisteredPointer_fromWireType;
    }
    __name(init_RegisteredPointer, "init_RegisteredPointer");
    function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;
      if (!isSmartPointer && registeredClass.baseClass === void 0) {
        if (isConst) {
          this["toWireType"] = constNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        } else {
          this["toWireType"] = nonConstNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        }
      } else {
        this["toWireType"] = genericPointerToWireType;
      }
    }
    __name(RegisteredPointer, "RegisteredPointer");
    function replacePublicSymbol(name, value, numArguments) {
      if (!Module2.hasOwnProperty(name)) {
        throwInternalError("Replacing nonexistant public symbol");
      }
      if (void 0 !== Module2[name].overloadTable && void 0 !== numArguments) {
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        Module2[name].argCount = numArguments;
      }
    }
    __name(replacePublicSymbol, "replacePublicSymbol");
    function dynCallLegacy(sig, ptr, args) {
      var f = Module2["dynCall_" + sig];
      return args && args.length ? f.apply(null, [ptr].concat(args)) : f.call(null, ptr);
    }
    __name(dynCallLegacy, "dynCallLegacy");
    function getWasmTableEntry(funcPtr) {
      return wasmTable.get(funcPtr);
    }
    __name(getWasmTableEntry, "getWasmTableEntry");
    function dynCall(sig, ptr, args) {
      if (sig.includes("j")) {
        return dynCallLegacy(sig, ptr, args);
      }
      var rtn = getWasmTableEntry(ptr).apply(null, args);
      return rtn;
    }
    __name(dynCall, "dynCall");
    function getDynCaller(sig, ptr) {
      var argCache = [];
      return function() {
        argCache.length = 0;
        Object.assign(argCache, arguments);
        return dynCall(sig, ptr, argCache);
      };
    }
    __name(getDynCaller, "getDynCaller");
    function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
      function makeDynCaller() {
        if (signature.includes("j")) {
          return getDynCaller(signature, rawFunction);
        }
        return getWasmTableEntry(rawFunction);
      }
      __name(makeDynCaller, "makeDynCaller");
      var fp = makeDynCaller();
      if (typeof fp != "function") {
        throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
    __name(embind__requireFunction, "embind__requireFunction");
    var UnboundTypeError = void 0;
    function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }
    __name(getTypeName, "getTypeName");
    function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
        if (seen[type]) {
          return;
        }
        if (registeredTypes[type]) {
          return;
        }
        if (typeDependencies[type]) {
          typeDependencies[type].forEach(visit);
          return;
        }
        unboundTypes.push(type);
        seen[type] = true;
      }
      __name(visit, "visit");
      types.forEach(visit);
      throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]));
    }
    __name(throwUnboundTypeError, "throwUnboundTypeError");
    function __embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) {
      name = readLatin1String(name);
      getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
      if (upcast) {
        upcast = embind__requireFunction(upcastSignature, upcast);
      }
      if (downcast) {
        downcast = embind__requireFunction(downcastSignature, downcast);
      }
      rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);
      exposePublicSymbol(legalFunctionName, function() {
        throwUnboundTypeError("Cannot construct " + name + " due to unbound types", [baseClassRawType]);
      });
      whenDependentTypesAreResolved([rawType, rawPointerType, rawConstPointerType], baseClassRawType ? [baseClassRawType] : [], function(base) {
        base = base[0];
        var baseClass;
        var basePrototype;
        if (baseClassRawType) {
          baseClass = base.registeredClass;
          basePrototype = baseClass.instancePrototype;
        } else {
          basePrototype = ClassHandle.prototype;
        }
        var constructor = createNamedFunction(legalFunctionName, function() {
          if (Object.getPrototypeOf(this) !== instancePrototype) {
            throw new BindingError("Use 'new' to construct " + name);
          }
          if (void 0 === registeredClass.constructor_body) {
            throw new BindingError(name + " has no accessible constructor");
          }
          var body = registeredClass.constructor_body[arguments.length];
          if (void 0 === body) {
            throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
          }
          return body.apply(this, arguments);
        });
        var instancePrototype = Object.create(basePrototype, { constructor: { value: constructor } });
        constructor.prototype = instancePrototype;
        var registeredClass = new RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast);
        var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
        var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
        var constPointerConverter = new RegisteredPointer(name + " const*", registeredClass, false, true, false);
        registeredPointers[rawType] = { pointerType: pointerConverter, constPointerType: constPointerConverter };
        replacePublicSymbol(legalFunctionName, constructor);
        return [referenceConverter, pointerConverter, constPointerConverter];
      });
    }
    __name(__embind_register_class, "__embind_register_class");
    function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
        array.push(HEAPU32[firstElement + i * 4 >> 2]);
      }
      return array;
    }
    __name(heap32VectorToArray, "heap32VectorToArray");
    function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      var argCount = argTypes.length;
      if (argCount < 2) {
        throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
      var isClassMethodFunc = argTypes[1] !== null && classType !== null;
      var needsDestructorStack = false;
      for (var i = 1; i < argTypes.length; ++i) {
        if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) {
          needsDestructorStack = true;
          break;
        }
      }
      var returns = argTypes[0].name !== "void";
      var expectedArgCount = argCount - 2;
      var argsWired = new Array(expectedArgCount);
      var invokerFuncArgs = [];
      var destructors = [];
      return function() {
        if (arguments.length !== expectedArgCount) {
          throwBindingError("function " + humanName + " called with " + arguments.length + " arguments, expected " + expectedArgCount + " args!");
        }
        destructors.length = 0;
        var thisWired;
        invokerFuncArgs.length = isClassMethodFunc ? 2 : 1;
        invokerFuncArgs[0] = cppTargetFunc;
        if (isClassMethodFunc) {
          thisWired = argTypes[1]["toWireType"](destructors, this);
          invokerFuncArgs[1] = thisWired;
        }
        for (var i2 = 0; i2 < expectedArgCount; ++i2) {
          argsWired[i2] = argTypes[i2 + 2]["toWireType"](destructors, arguments[i2]);
          invokerFuncArgs.push(argsWired[i2]);
        }
        var rv = cppInvokerFunc.apply(null, invokerFuncArgs);
        function onDone(rv2) {
          if (needsDestructorStack) {
            runDestructors(destructors);
          } else {
            for (var i3 = isClassMethodFunc ? 1 : 2; i3 < argTypes.length; i3++) {
              var param = i3 === 1 ? thisWired : argsWired[i3 - 2];
              if (argTypes[i3].destructorFunction !== null) {
                argTypes[i3].destructorFunction(param);
              }
            }
          }
          if (returns) {
            return argTypes[0]["fromWireType"](rv2);
          }
        }
        __name(onDone, "onDone");
        return onDone(rv);
      };
    }
    __name(craftInvokerFunction, "craftInvokerFunction");
    function __embind_register_class_constructor(rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) {
      assert2(argCount > 0);
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      invoker = embind__requireFunction(invokerSignature, invoker);
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
        classType = classType[0];
        var humanName = "constructor " + classType.name;
        if (void 0 === classType.registeredClass.constructor_body) {
          classType.registeredClass.constructor_body = [];
        }
        if (void 0 !== classType.registeredClass.constructor_body[argCount - 1]) {
          throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount - 1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
        }
        classType.registeredClass.constructor_body[argCount - 1] = () => {
          throwUnboundTypeError("Cannot construct " + classType.name + " due to unbound types", rawArgTypes);
        };
        whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
          argTypes.splice(1, 0, null);
          classType.registeredClass.constructor_body[argCount - 1] = craftInvokerFunction(humanName, argTypes, null, invoker, rawConstructor);
          return [];
        });
        return [];
      });
    }
    __name(__embind_register_class_constructor, "__embind_register_class_constructor");
    function __embind_register_class_function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
        classType = classType[0];
        var humanName = classType.name + "." + methodName;
        if (methodName.startsWith("@@")) {
          methodName = Symbol[methodName.substring(2)];
        }
        if (isPureVirtual) {
          classType.registeredClass.pureVirtualFunctions.push(methodName);
        }
        function unboundTypesHandler() {
          throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes);
        }
        __name(unboundTypesHandler, "unboundTypesHandler");
        var proto = classType.registeredClass.instancePrototype;
        var method = proto[methodName];
        if (void 0 === method || void 0 === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
          unboundTypesHandler.argCount = argCount - 2;
          unboundTypesHandler.className = classType.name;
          proto[methodName] = unboundTypesHandler;
        } else {
          ensureOverloadTable(proto, methodName, humanName);
          proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
        }
        whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
          var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
          if (void 0 === proto[methodName].overloadTable) {
            memberFunction.argCount = argCount - 2;
            proto[methodName] = memberFunction;
          } else {
            proto[methodName].overloadTable[argCount - 2] = memberFunction;
          }
          return [];
        });
        return [];
      });
    }
    __name(__embind_register_class_function, "__embind_register_class_function");
    var emval_free_list = [];
    var emval_handle_array = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }];
    function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
        emval_handle_array[handle] = void 0;
        emval_free_list.push(handle);
      }
    }
    __name(__emval_decref, "__emval_decref");
    function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          ++count;
        }
      }
      return count;
    }
    __name(count_emval_handles, "count_emval_handles");
    function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          return emval_handle_array[i];
        }
      }
      return null;
    }
    __name(get_first_emval, "get_first_emval");
    function init_emval() {
      Module2["count_emval_handles"] = count_emval_handles;
      Module2["get_first_emval"] = get_first_emval;
    }
    __name(init_emval, "init_emval");
    var Emval = { toValue: /* @__PURE__ */ __name((handle) => {
      if (!handle) {
        throwBindingError("Cannot use deleted val. handle = " + handle);
      }
      return emval_handle_array[handle].value;
    }, "toValue"), toHandle: /* @__PURE__ */ __name((value) => {
      switch (value) {
        case void 0:
          return 1;
        case null:
          return 2;
        case true:
          return 3;
        case false:
          return 4;
        default: {
          var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
          emval_handle_array[handle] = { refcount: 1, value };
          return handle;
        }
      }
    }, "toHandle") };
    function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": /* @__PURE__ */ __name(function(handle) {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, value) {
        return Emval.toHandle(value);
      }, "toWireType"), "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: null });
    }
    __name(__embind_register_emval, "__embind_register_emval");
    function enumReadValueFromPointer(name, shift, signed) {
      switch (shift) {
        case 0:
          return function(pointer) {
            var heap = signed ? HEAP8 : HEAPU8;
            return this["fromWireType"](heap[pointer]);
          };
        case 1:
          return function(pointer) {
            var heap = signed ? HEAP16 : HEAPU16;
            return this["fromWireType"](heap[pointer >> 1]);
          };
        case 2:
          return function(pointer) {
            var heap = signed ? HEAP32 : HEAPU32;
            return this["fromWireType"](heap[pointer >> 2]);
          };
        default:
          throw new TypeError("Unknown integer type: " + name);
      }
    }
    __name(enumReadValueFromPointer, "enumReadValueFromPointer");
    function __embind_register_enum(rawType, name, size, isSigned) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      function ctor() {
      }
      __name(ctor, "ctor");
      ctor.values = {};
      registerType(rawType, { name, constructor: ctor, "fromWireType": /* @__PURE__ */ __name(function(c) {
        return this.constructor.values[c];
      }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, c) {
        return c.value;
      }, "toWireType"), "argPackAdvance": 8, "readValueFromPointer": enumReadValueFromPointer(name, shift, isSigned), destructorFunction: null });
      exposePublicSymbol(name, ctor);
    }
    __name(__embind_register_enum, "__embind_register_enum");
    function requireRegisteredType(rawType, humanName) {
      var impl = registeredTypes[rawType];
      if (void 0 === impl) {
        throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
      }
      return impl;
    }
    __name(requireRegisteredType, "requireRegisteredType");
    function __embind_register_enum_value(rawEnumType, name, enumValue) {
      var enumType = requireRegisteredType(rawEnumType, "enum");
      name = readLatin1String(name);
      var Enum = enumType.constructor;
      var Value = Object.create(enumType.constructor.prototype, { value: { value: enumValue }, constructor: { value: createNamedFunction(enumType.name + "_" + name, function() {
      }) } });
      Enum.values[enumValue] = Value;
      Enum[name] = Value;
    }
    __name(__embind_register_enum_value, "__embind_register_enum_value");
    function embindRepr(v) {
      if (v === null) {
        return "null";
      }
      var t = typeof v;
      if (t === "object" || t === "array" || t === "function") {
        return v.toString();
      } else {
        return "" + v;
      }
    }
    __name(embindRepr, "embindRepr");
    function floatReadValueFromPointer(name, shift) {
      switch (shift) {
        case 2:
          return function(pointer) {
            return this["fromWireType"](HEAPF32[pointer >> 2]);
          };
        case 3:
          return function(pointer) {
            return this["fromWireType"](HEAPF64[pointer >> 3]);
          };
        default:
          throw new TypeError("Unknown float type: " + name);
      }
    }
    __name(floatReadValueFromPointer, "floatReadValueFromPointer");
    function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": /* @__PURE__ */ __name(function(value) {
        return value;
      }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, value) {
        return value;
      }, "toWireType"), "argPackAdvance": 8, "readValueFromPointer": floatReadValueFromPointer(name, shift), destructorFunction: null });
    }
    __name(__embind_register_float, "__embind_register_float");
    function integerReadValueFromPointer(name, shift, signed) {
      switch (shift) {
        case 0:
          return signed ? /* @__PURE__ */ __name(function readS8FromPointer(pointer) {
            return HEAP8[pointer];
          }, "readS8FromPointer") : /* @__PURE__ */ __name(function readU8FromPointer(pointer) {
            return HEAPU8[pointer];
          }, "readU8FromPointer");
        case 1:
          return signed ? /* @__PURE__ */ __name(function readS16FromPointer(pointer) {
            return HEAP16[pointer >> 1];
          }, "readS16FromPointer") : /* @__PURE__ */ __name(function readU16FromPointer(pointer) {
            return HEAPU16[pointer >> 1];
          }, "readU16FromPointer");
        case 2:
          return signed ? /* @__PURE__ */ __name(function readS32FromPointer(pointer) {
            return HEAP32[pointer >> 2];
          }, "readS32FromPointer") : /* @__PURE__ */ __name(function readU32FromPointer(pointer) {
            return HEAPU32[pointer >> 2];
          }, "readU32FromPointer");
        default:
          throw new TypeError("Unknown integer type: " + name);
      }
    }
    __name(integerReadValueFromPointer, "integerReadValueFromPointer");
    function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      var shift = getShiftFromSize(size);
      var fromWireType = /* @__PURE__ */ __name((value) => value, "fromWireType");
      if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = /* @__PURE__ */ __name((value) => value << bitshift >>> bitshift, "fromWireType");
      }
      var isUnsignedType = name.includes("unsigned");
      var checkAssertions = /* @__PURE__ */ __name((value, toTypeName) => {
      }, "checkAssertions");
      var toWireType;
      if (isUnsignedType) {
        toWireType = /* @__PURE__ */ __name(function(destructors, value) {
          checkAssertions(value, this.name);
          return value >>> 0;
        }, "toWireType");
      } else {
        toWireType = /* @__PURE__ */ __name(function(destructors, value) {
          checkAssertions(value, this.name);
          return value;
        }, "toWireType");
      }
      registerType(primitiveType, { name, "fromWireType": fromWireType, "toWireType": toWireType, "argPackAdvance": 8, "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0), destructorFunction: null });
    }
    __name(__embind_register_integer, "__embind_register_integer");
    function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
      var TA = typeMapping[dataTypeIndex];
      function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle];
        var data = heap[handle + 1];
        return new TA(heap.buffer, data, size);
      }
      __name(decodeMemoryView, "decodeMemoryView");
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": decodeMemoryView, "argPackAdvance": 8, "readValueFromPointer": decodeMemoryView }, { ignoreDuplicateRegistrations: true });
    }
    __name(__embind_register_memory_view, "__embind_register_memory_view");
    function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      var stdStringIsUTF8 = name === "std::string";
      registerType(rawType, { name, "fromWireType": /* @__PURE__ */ __name(function(value) {
        var length = HEAPU32[value >> 2];
        var payload = value + 4;
        var str;
        if (stdStringIsUTF8) {
          var decodeStartPtr = payload;
          for (var i = 0; i <= length; ++i) {
            var currentBytePtr = payload + i;
            if (i == length || HEAPU8[currentBytePtr] == 0) {
              var maxRead = currentBytePtr - decodeStartPtr;
              var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
              if (str === void 0) {
                str = stringSegment;
              } else {
                str += String.fromCharCode(0);
                str += stringSegment;
              }
              decodeStartPtr = currentBytePtr + 1;
            }
          }
        } else {
          var a = new Array(length);
          for (var i = 0; i < length; ++i) {
            a[i] = String.fromCharCode(HEAPU8[payload + i]);
          }
          str = a.join("");
        }
        _free(value);
        return str;
      }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, value) {
        if (value instanceof ArrayBuffer) {
          value = new Uint8Array(value);
        }
        var length;
        var valueIsOfTypeString = typeof value == "string";
        if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
          throwBindingError("Cannot pass non-string to std::string");
        }
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          length = lengthBytesUTF82(value);
        } else {
          length = value.length;
        }
        var base = _malloc(4 + length + 1);
        var ptr = base + 4;
        HEAPU32[base >> 2] = length;
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          stringToUTF82(value, ptr, length + 1);
        } else {
          if (valueIsOfTypeString) {
            for (var i = 0; i < length; ++i) {
              var charCode = value.charCodeAt(i);
              if (charCode > 255) {
                _free(ptr);
                throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
              }
              HEAPU8[ptr + i] = charCode;
            }
          } else {
            for (var i = 0; i < length; ++i) {
              HEAPU8[ptr + i] = value[i];
            }
          }
        }
        if (destructors !== null) {
          destructors.push(_free, base);
        }
        return base;
      }, "toWireType"), "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: /* @__PURE__ */ __name(function(ptr) {
        _free(ptr);
      }, "destructorFunction") });
    }
    __name(__embind_register_std_string, "__embind_register_std_string");
    var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : void 0;
    function UTF16ToString(ptr, maxBytesToRead) {
      var endPtr = ptr;
      var idx = endPtr >> 1;
      var maxIdx = idx + maxBytesToRead / 2;
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
      endPtr = idx << 1;
      if (endPtr - ptr > 32 && UTF16Decoder) return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
      var str = "";
      for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[ptr + i * 2 >> 1];
        if (codeUnit == 0) break;
        str += String.fromCharCode(codeUnit);
      }
      return str;
    }
    __name(UTF16ToString, "UTF16ToString");
    function stringToUTF16(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2;
      }
      HEAP16[outPtr >> 1] = 0;
      return outPtr - startPtr;
    }
    __name(stringToUTF16, "stringToUTF16");
    function lengthBytesUTF16(str) {
      return str.length * 2;
    }
    __name(lengthBytesUTF16, "lengthBytesUTF16");
    function UTF32ToString(ptr, maxBytesToRead) {
      var i = 0;
      var str = "";
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0) break;
        ++i;
        if (utf32 >= 65536) {
          var ch = utf32 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    }
    __name(UTF32ToString, "UTF32ToString");
    function stringToUTF32(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      HEAP32[outPtr >> 2] = 0;
      return outPtr - startPtr;
    }
    __name(stringToUTF32, "stringToUTF32");
    function lengthBytesUTF32(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
        len += 4;
      }
      return len;
    }
    __name(lengthBytesUTF32, "lengthBytesUTF32");
    function __embind_register_std_wstring(rawType, charSize, name) {
      name = readLatin1String(name);
      var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
      if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        getHeap = /* @__PURE__ */ __name(() => HEAPU16, "getHeap");
        shift = 1;
      } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        getHeap = /* @__PURE__ */ __name(() => HEAPU32, "getHeap");
        shift = 2;
      }
      registerType(rawType, { name, "fromWireType": /* @__PURE__ */ __name(function(value) {
        var length = HEAPU32[value >> 2];
        var HEAP = getHeap();
        var str;
        var decodeStartPtr = value + 4;
        for (var i = 0; i <= length; ++i) {
          var currentBytePtr = value + 4 + i * charSize;
          if (i == length || HEAP[currentBytePtr >> shift] == 0) {
            var maxReadBytes = currentBytePtr - decodeStartPtr;
            var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
            if (str === void 0) {
              str = stringSegment;
            } else {
              str += String.fromCharCode(0);
              str += stringSegment;
            }
            decodeStartPtr = currentBytePtr + charSize;
          }
        }
        _free(value);
        return str;
      }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, value) {
        if (!(typeof value == "string")) {
          throwBindingError("Cannot pass non-string to C++ string type " + name);
        }
        var length = lengthBytesUTF(value);
        var ptr = _malloc(4 + length + charSize);
        HEAPU32[ptr >> 2] = length >> shift;
        encodeString(value, ptr + 4, length + charSize);
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      }, "toWireType"), "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: /* @__PURE__ */ __name(function(ptr) {
        _free(ptr);
      }, "destructorFunction") });
    }
    __name(__embind_register_std_wstring, "__embind_register_std_wstring");
    function __embind_register_value_object(rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
      structRegistrations[rawType] = { name: readLatin1String(name), rawConstructor: embind__requireFunction(constructorSignature, rawConstructor), rawDestructor: embind__requireFunction(destructorSignature, rawDestructor), fields: [] };
    }
    __name(__embind_register_value_object, "__embind_register_value_object");
    function __embind_register_value_object_field(structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
      structRegistrations[structType].fields.push({ fieldName: readLatin1String(fieldName), getterReturnType, getter: embind__requireFunction(getterSignature, getter), getterContext, setterArgumentType, setter: embind__requireFunction(setterSignature, setter), setterContext });
    }
    __name(__embind_register_value_object_field, "__embind_register_value_object_field");
    function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { isVoid: true, name, "argPackAdvance": 0, "fromWireType": /* @__PURE__ */ __name(function() {
        return void 0;
      }, "fromWireType"), "toWireType": /* @__PURE__ */ __name(function(destructors, o) {
        return void 0;
      }, "toWireType") });
    }
    __name(__embind_register_void, "__embind_register_void");
    var nowIsMonotonic = true;
    function __emscripten_get_now_is_monotonic() {
      return nowIsMonotonic;
    }
    __name(__emscripten_get_now_is_monotonic, "__emscripten_get_now_is_monotonic");
    function emval_lookupTypes(argCount, argTypes) {
      var a = new Array(argCount);
      for (var i = 0; i < argCount; ++i) {
        a[i] = requireRegisteredType(HEAPU32[argTypes + i * 4 >> 2], "parameter " + i);
      }
      return a;
    }
    __name(emval_lookupTypes, "emval_lookupTypes");
    function __emval_call(handle, argCount, argTypes, argv2) {
      handle = Emval.toValue(handle);
      var types = emval_lookupTypes(argCount, argTypes);
      var args = new Array(argCount);
      for (var i = 0; i < argCount; ++i) {
        var type = types[i];
        args[i] = type["readValueFromPointer"](argv2);
        argv2 += type["argPackAdvance"];
      }
      var rv = handle.apply(void 0, args);
      return Emval.toHandle(rv);
    }
    __name(__emval_call, "__emval_call");
    function __emval_incref(handle) {
      if (handle > 4) {
        emval_handle_array[handle].refcount += 1;
      }
    }
    __name(__emval_incref, "__emval_incref");
    function __emval_take_value(type, arg) {
      type = requireRegisteredType(type, "_emval_take_value");
      var v = type["readValueFromPointer"](arg);
      return Emval.toHandle(v);
    }
    __name(__emval_take_value, "__emval_take_value");
    function readI53FromI64(ptr) {
      return HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
    }
    __name(readI53FromI64, "readI53FromI64");
    function __gmtime_js(time, tmPtr) {
      var date = new Date(readI53FromI64(time) * 1e3);
      HEAP32[tmPtr >> 2] = date.getUTCSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
      HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
      HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
    }
    __name(__gmtime_js, "__gmtime_js");
    function __isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    __name(__isLeapYear, "__isLeapYear");
    var __MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    var __MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function __yday_from_date(date) {
      var isLeapYear = __isLeapYear(date.getFullYear());
      var monthDaysCumulative = isLeapYear ? __MONTH_DAYS_LEAP_CUMULATIVE : __MONTH_DAYS_REGULAR_CUMULATIVE;
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
      return yday;
    }
    __name(__yday_from_date, "__yday_from_date");
    function __localtime_js(time, tmPtr) {
      var date = new Date(readI53FromI64(time) * 1e3);
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = __yday_from_date(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
      HEAP32[tmPtr + 32 >> 2] = dst;
    }
    __name(__localtime_js, "__localtime_js");
    function __mktime_js(tmPtr) {
      var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
      var dst = HEAP32[tmPtr + 32 >> 2];
      var guessedOffset = date.getTimezoneOffset();
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dstOffset = Math.min(winterOffset, summerOffset);
      if (dst < 0) {
        HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
      } else if (dst > 0 != (dstOffset == guessedOffset)) {
        var nonDstOffset = Math.max(winterOffset, summerOffset);
        var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
        date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
      }
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = __yday_from_date(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getYear();
      return date.getTime() / 1e3 | 0;
    }
    __name(__mktime_js, "__mktime_js");
    function allocateUTF8(str) {
      var size = lengthBytesUTF82(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }
    __name(allocateUTF8, "allocateUTF8");
    function __tzset_js(timezone, daylight, tzname) {
      var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : "GMT";
      }
      __name(extractZone, "extractZone");
      var winterName = extractZone(winter);
      var summerName = extractZone(summer);
      var winterNamePtr = allocateUTF8(winterName);
      var summerNamePtr = allocateUTF8(summerName);
      if (summerOffset < winterOffset) {
        HEAPU32[tzname >> 2] = winterNamePtr;
        HEAPU32[tzname + 4 >> 2] = summerNamePtr;
      } else {
        HEAPU32[tzname >> 2] = summerNamePtr;
        HEAPU32[tzname + 4 >> 2] = winterNamePtr;
      }
    }
    __name(__tzset_js, "__tzset_js");
    function _abort() {
      abort2("");
    }
    __name(_abort, "_abort");
    function _emscripten_date_now() {
      return Date.now();
    }
    __name(_emscripten_date_now, "_emscripten_date_now");
    var _emscripten_get_now;
    _emscripten_get_now = /* @__PURE__ */ __name(() => performance.now(), "_emscripten_get_now");
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    __name(_emscripten_memcpy_big, "_emscripten_memcpy_big");
    function getHeapMax() {
      return 1073741824;
    }
    __name(getHeapMax, "getHeapMax");
    function emscripten_realloc_buffer(size) {
      var b = wasmMemory.buffer;
      try {
        wasmMemory.grow(size - b.byteLength + 65535 >>> 16);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    }
    __name(emscripten_realloc_buffer, "emscripten_realloc_buffer");
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      let alignUp = /* @__PURE__ */ __name((x, multiple) => x + (multiple - x % multiple) % multiple, "alignUp");
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    }
    __name(_emscripten_resize_heap, "_emscripten_resize_heap");
    var ENV = {};
    function getExecutableName() {
      return thisProgram || "./this.program";
    }
    __name(getExecutableName, "getExecutableName");
    function getEnvStrings() {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env2 = { "USER": "web_user", "LOGNAME": "web_user", "PATH": "/", "PWD": "/", "HOME": "/home/web_user", "LANG": lang, "_": getExecutableName() };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env2[x];
          else env2[x] = ENV[x];
        }
        var strings = [];
        for (var x in env2) {
          strings.push(x + "=" + env2[x]);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    }
    __name(getEnvStrings, "getEnvStrings");
    function writeAsciiToMemory(str, buffer, dontAddNull) {
      for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i);
      }
      if (!dontAddNull) HEAP8[buffer >> 0] = 0;
    }
    __name(writeAsciiToMemory, "writeAsciiToMemory");
    function _environ_get(__environ, environ_buf) {
      var bufSize = 0;
      getEnvStrings().forEach(function(string, i) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + i * 4 >> 2] = ptr;
        writeAsciiToMemory(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    }
    __name(_environ_get, "_environ_get");
    function _environ_sizes_get(penviron_count, penviron_buf_size) {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      strings.forEach(function(string) {
        bufSize += string.length + 1;
      });
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    }
    __name(_environ_sizes_get, "_environ_sizes_get");
    function _fd_close(fd) {
      return 52;
    }
    __name(_fd_close, "_fd_close");
    function _fd_read(fd, iov, iovcnt, pnum) {
      return 52;
    }
    __name(_fd_read, "_fd_read");
    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
      return 70;
    }
    __name(_fd_seek, "_fd_seek");
    var printCharBuffers = [null, [], []];
    function printChar(stream, curr) {
      var buffer = printCharBuffers[stream];
      if (curr === 0 || curr === 10) {
        (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
        buffer.length = 0;
      } else {
        buffer.push(curr);
      }
    }
    __name(printChar, "printChar");
    function _fd_write(fd, iov, iovcnt, pnum) {
      var num = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        for (var j = 0; j < len; j++) {
          printChar(fd, HEAPU8[ptr + j]);
        }
        num += len;
      }
      HEAPU32[pnum >> 2] = num;
      return 0;
    }
    __name(_fd_write, "_fd_write");
    function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]) {
      }
      return sum;
    }
    __name(__arraySum, "__arraySum");
    var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
          days -= daysInCurrentMonth - newDate.getDate() + 1;
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth + 1);
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear() + 1);
          }
        } else {
          newDate.setDate(newDate.getDate() + days);
          return newDate;
        }
      }
      return newDate;
    }
    __name(__addDays, "__addDays");
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = length > 0 ? length : lengthBytesUTF82(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    }
    __name(intArrayFromString, "intArrayFromString");
    function writeArrayToMemory(array, buffer) {
      HEAP8.set(array, buffer);
    }
    __name(writeArrayToMemory, "writeArrayToMemory");
    function _strftime(s, maxsize, format, tm) {
      var tm_zone = HEAP32[tm + 40 >> 2];
      var date = { tm_sec: HEAP32[tm >> 2], tm_min: HEAP32[tm + 4 >> 2], tm_hour: HEAP32[tm + 8 >> 2], tm_mday: HEAP32[tm + 12 >> 2], tm_mon: HEAP32[tm + 16 >> 2], tm_year: HEAP32[tm + 20 >> 2], tm_wday: HEAP32[tm + 24 >> 2], tm_yday: HEAP32[tm + 28 >> 2], tm_isdst: HEAP32[tm + 32 >> 2], tm_gmtoff: HEAP32[tm + 36 >> 2], tm_zone: tm_zone ? UTF8ToString(tm_zone) : "" };
      var pattern = UTF8ToString(format);
      var EXPANSION_RULES_1 = { "%c": "%a %b %d %H:%M:%S %Y", "%D": "%m/%d/%y", "%F": "%Y-%m-%d", "%h": "%b", "%r": "%I:%M:%S %p", "%R": "%H:%M", "%T": "%H:%M:%S", "%x": "%m/%d/%y", "%X": "%H:%M:%S", "%Ec": "%c", "%EC": "%C", "%Ex": "%m/%d/%y", "%EX": "%H:%M:%S", "%Ey": "%y", "%EY": "%Y", "%Od": "%d", "%Oe": "%e", "%OH": "%H", "%OI": "%I", "%Om": "%m", "%OM": "%M", "%OS": "%S", "%Ou": "%u", "%OU": "%U", "%OV": "%V", "%Ow": "%w", "%OW": "%W", "%Oy": "%y" };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
      }
      var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      function leadingSomething(value, digits, character) {
        var str = typeof value == "number" ? value.toString() : value || "";
        while (str.length < digits) {
          str = character[0] + str;
        }
        return str;
      }
      __name(leadingSomething, "leadingSomething");
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0");
      }
      __name(leadingNulls, "leadingNulls");
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : value > 0 ? 1 : 0;
        }
        __name(sgn, "sgn");
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
            compare = sgn(date1.getDate() - date2.getDate());
          }
        }
        return compare;
      }
      __name(compareByDay, "compareByDay");
      function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
          case 0:
            return new Date(janFourth.getFullYear() - 1, 11, 29);
          case 1:
            return janFourth;
          case 2:
            return new Date(janFourth.getFullYear(), 0, 3);
          case 3:
            return new Date(janFourth.getFullYear(), 0, 2);
          case 4:
            return new Date(janFourth.getFullYear(), 0, 1);
          case 5:
            return new Date(janFourth.getFullYear() - 1, 11, 31);
          case 6:
            return new Date(janFourth.getFullYear() - 1, 11, 30);
        }
      }
      __name(getFirstWeekStartDate, "getFirstWeekStartDate");
      function getWeekBasedYear(date2) {
        var thisDate = __addDays(new Date(date2.tm_year + 1900, 0, 1), date2.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
          if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
            return thisDate.getFullYear() + 1;
          }
          return thisDate.getFullYear();
        }
        return thisDate.getFullYear() - 1;
      }
      __name(getWeekBasedYear, "getWeekBasedYear");
      var EXPANSION_RULES_2 = { "%a": /* @__PURE__ */ __name(function(date2) {
        return WEEKDAYS[date2.tm_wday].substring(0, 3);
      }, "%a"), "%A": /* @__PURE__ */ __name(function(date2) {
        return WEEKDAYS[date2.tm_wday];
      }, "%A"), "%b": /* @__PURE__ */ __name(function(date2) {
        return MONTHS[date2.tm_mon].substring(0, 3);
      }, "%b"), "%B": /* @__PURE__ */ __name(function(date2) {
        return MONTHS[date2.tm_mon];
      }, "%B"), "%C": /* @__PURE__ */ __name(function(date2) {
        var year = date2.tm_year + 1900;
        return leadingNulls(year / 100 | 0, 2);
      }, "%C"), "%d": /* @__PURE__ */ __name(function(date2) {
        return leadingNulls(date2.tm_mday, 2);
      }, "%d"), "%e": /* @__PURE__ */ __name(function(date2) {
        return leadingSomething(date2.tm_mday, 2, " ");
      }, "%e"), "%g": /* @__PURE__ */ __name(function(date2) {
        return getWeekBasedYear(date2).toString().substring(2);
      }, "%g"), "%G": /* @__PURE__ */ __name(function(date2) {
        return getWeekBasedYear(date2);
      }, "%G"), "%H": /* @__PURE__ */ __name(function(date2) {
        return leadingNulls(date2.tm_hour, 2);
      }, "%H"), "%I": /* @__PURE__ */ __name(function(date2) {
        var twelveHour = date2.tm_hour;
        if (twelveHour == 0) twelveHour = 12;
        else if (twelveHour > 12) twelveHour -= 12;
        return leadingNulls(twelveHour, 2);
      }, "%I"), "%j": /* @__PURE__ */ __name(function(date2) {
        return leadingNulls(date2.tm_mday + __arraySum(__isLeapYear(date2.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date2.tm_mon - 1), 3);
      }, "%j"), "%m": /* @__PURE__ */ __name(function(date2) {
        return leadingNulls(date2.tm_mon + 1, 2);
      }, "%m"), "%M": /* @__PURE__ */ __name(function(date2) {
        return leadingNulls(date2.tm_min, 2);
      }, "%M"), "%n": /* @__PURE__ */ __name(function() {
        return "\n";
      }, "%n"), "%p": /* @__PURE__ */ __name(function(date2) {
        if (date2.tm_hour >= 0 && date2.tm_hour < 12) {
          return "AM";
        }
        return "PM";
      }, "%p"), "%S": /* @__PURE__ */ __name(function(date2) {
        return leadingNulls(date2.tm_sec, 2);
      }, "%S"), "%t": /* @__PURE__ */ __name(function() {
        return "	";
      }, "%t"), "%u": /* @__PURE__ */ __name(function(date2) {
        return date2.tm_wday || 7;
      }, "%u"), "%U": /* @__PURE__ */ __name(function(date2) {
        var days = date2.tm_yday + 7 - date2.tm_wday;
        return leadingNulls(Math.floor(days / 7), 2);
      }, "%U"), "%V": /* @__PURE__ */ __name(function(date2) {
        var val = Math.floor((date2.tm_yday + 7 - (date2.tm_wday + 6) % 7) / 7);
        if ((date2.tm_wday + 371 - date2.tm_yday - 2) % 7 <= 2) {
          val++;
        }
        if (!val) {
          val = 52;
          var dec31 = (date2.tm_wday + 7 - date2.tm_yday - 1) % 7;
          if (dec31 == 4 || dec31 == 5 && __isLeapYear(date2.tm_year % 400 - 1)) {
            val++;
          }
        } else if (val == 53) {
          var jan1 = (date2.tm_wday + 371 - date2.tm_yday) % 7;
          if (jan1 != 4 && (jan1 != 3 || !__isLeapYear(date2.tm_year))) val = 1;
        }
        return leadingNulls(val, 2);
      }, "%V"), "%w": /* @__PURE__ */ __name(function(date2) {
        return date2.tm_wday;
      }, "%w"), "%W": /* @__PURE__ */ __name(function(date2) {
        var days = date2.tm_yday + 7 - (date2.tm_wday + 6) % 7;
        return leadingNulls(Math.floor(days / 7), 2);
      }, "%W"), "%y": /* @__PURE__ */ __name(function(date2) {
        return (date2.tm_year + 1900).toString().substring(2);
      }, "%y"), "%Y": /* @__PURE__ */ __name(function(date2) {
        return date2.tm_year + 1900;
      }, "%Y"), "%z": /* @__PURE__ */ __name(function(date2) {
        var off2 = date2.tm_gmtoff;
        var ahead = off2 >= 0;
        off2 = Math.abs(off2) / 60;
        off2 = off2 / 60 * 100 + off2 % 60;
        return (ahead ? "+" : "-") + String("0000" + off2).slice(-4);
      }, "%z"), "%Z": /* @__PURE__ */ __name(function(date2) {
        return date2.tm_zone;
      }, "%Z"), "%%": /* @__PURE__ */ __name(function() {
        return "%";
      }, "%%") };
      pattern = pattern.replace(/%%/g, "\0\0");
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
          pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
        }
      }
      pattern = pattern.replace(/\0\0/g, "%");
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }
      writeArrayToMemory(bytes, s);
      return bytes.length - 1;
    }
    __name(_strftime, "_strftime");
    function _strftime_l(s, maxsize, format, tm, loc) {
      return _strftime(s, maxsize, format, tm);
    }
    __name(_strftime_l, "_strftime_l");
    InternalError = Module2["InternalError"] = extendError(Error, "InternalError");
    embind_init_charCodes();
    BindingError = Module2["BindingError"] = extendError(Error, "BindingError");
    init_ClassHandle();
    init_embind();
    init_RegisteredPointer();
    UnboundTypeError = Module2["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
    init_emval();
    var wasmImports = { "e": ___cxa_throw, "s": ___syscall_fcntl64, "F": ___syscall_getcwd, "H": ___syscall_ioctl, "t": ___syscall_openat, "B": ___syscall_rmdir, "C": ___syscall_unlinkat, "g": __embind_finalize_value_object, "y": __embind_register_bigint, "Q": __embind_register_bool, "k": __embind_register_class, "j": __embind_register_class_constructor, "a": __embind_register_class_function, "P": __embind_register_emval, "w": __embind_register_enum, "q": __embind_register_enum_value, "v": __embind_register_float, "d": __embind_register_integer, "b": __embind_register_memory_view, "u": __embind_register_std_string, "o": __embind_register_std_wstring, "i": __embind_register_value_object, "c": __embind_register_value_object_field, "R": __embind_register_void, "J": __emscripten_get_now_is_monotonic, "T": __emval_call, "f": __emval_decref, "p": __emval_incref, "m": __emval_take_value, "K": __gmtime_js, "L": __localtime_js, "M": __mktime_js, "N": __tzset_js, "h": _abort, "l": _emscripten_date_now, "I": _emscripten_get_now, "O": _emscripten_memcpy_big, "A": _emscripten_resize_heap, "D": _environ_get, "E": _environ_sizes_get, "n": _fd_close, "G": _fd_read, "x": _fd_seek, "r": _fd_write, "S": _strftime, "z": _strftime_l };
    createWasm();
    var _malloc = /* @__PURE__ */ __name(function() {
      return (_malloc = Module2["asm"]["W"]).apply(null, arguments);
    }, "_malloc");
    var _free = /* @__PURE__ */ __name(function() {
      return (_free = Module2["asm"]["Y"]).apply(null, arguments);
    }, "_free");
    var ___getTypeName = Module2["___getTypeName"] = function() {
      return (___getTypeName = Module2["___getTypeName"] = Module2["asm"]["Z"]).apply(null, arguments);
    };
    Module2["__embind_initialize_bindings"] = function() {
      return (Module2["__embind_initialize_bindings"] = Module2["asm"]["_"]).apply(null, arguments);
    };
    var ___cxa_is_pointer_type = /* @__PURE__ */ __name(function() {
      return (___cxa_is_pointer_type = Module2["asm"]["$"]).apply(null, arguments);
    }, "___cxa_is_pointer_type");
    Module2["dynCall_jiji"] = function() {
      return (Module2["dynCall_jiji"] = Module2["asm"]["aa"]).apply(null, arguments);
    };
    Module2["dynCall_viijii"] = function() {
      return (Module2["dynCall_viijii"] = Module2["asm"]["ba"]).apply(null, arguments);
    };
    Module2["dynCall_iiiiij"] = function() {
      return (Module2["dynCall_iiiiij"] = Module2["asm"]["ca"]).apply(null, arguments);
    };
    Module2["dynCall_iiiiijj"] = function() {
      return (Module2["dynCall_iiiiijj"] = Module2["asm"]["da"]).apply(null, arguments);
    };
    Module2["dynCall_iiiiiijj"] = function() {
      return (Module2["dynCall_iiiiiijj"] = Module2["asm"]["ea"]).apply(null, arguments);
    };
    Module2["dynCall_jijii"] = function() {
      return (Module2["dynCall_jijii"] = Module2["asm"]["fa"]).apply(null, arguments);
    };
    Module2["dynCall_vijii"] = function() {
      return (Module2["dynCall_vijii"] = Module2["asm"]["ga"]).apply(null, arguments);
    };
    Module2["dynCall_jij"] = function() {
      return (Module2["dynCall_jij"] = Module2["asm"]["ha"]).apply(null, arguments);
    };
    Module2["dynCall_iij"] = function() {
      return (Module2["dynCall_iij"] = Module2["asm"]["ia"]).apply(null, arguments);
    };
    Module2["dynCall_viji"] = function() {
      return (Module2["dynCall_viji"] = Module2["asm"]["ja"]).apply(null, arguments);
    };
    Module2["dynCall_jii"] = function() {
      return (Module2["dynCall_jii"] = Module2["asm"]["ka"]).apply(null, arguments);
    };
    var calledRun;
    dependenciesFulfilled = /* @__PURE__ */ __name(function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    }, "runCaller");
    function run() {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module2);
        if (Module2["onRuntimeInitialized"]) Module2["onRuntimeInitialized"]();
        postRun();
      }
      __name(doRun, "doRun");
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module2["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    __name(run, "run");
    if (Module2["preInit"]) {
      if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
      while (Module2["preInit"].length > 0) {
        Module2["preInit"].pop()();
      }
    }
    run();
    function wasmSIMDSupported2() {
      const simdTest = Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
      return WebAssembly.validate(simdTest);
    }
    __name(wasmSIMDSupported2, "wasmSIMDSupported");
    if (wasmSIMDSupported2()) {
      ENV.DOTPRODUCT = "sse";
    }
    return Module2.ready;
  });
})();
function jsArrayFromStdVector(vec) {
  const size = vec.size();
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(vec.get(i));
  }
  return result;
}
__name(jsArrayFromStdVector, "jsArrayFromStdVector");
var OCREngine = class {
  static {
    __name(this, "OCREngine");
  }
  /**
   * Initialize the OCREngine.
   *
   * Use {@link createOCREngine} rather than calling this directly.
   *
   * @param tessLib - Emscripten entry point for the compiled WebAssembly module.
   * @param progressChannel - Channel used to report progress
   *   updates when OCREngine is run on a background thread
   */
  constructor(tessLib, progressChannel) {
    this._tesseractLib = tessLib;
    this._engine = new tessLib.OCREngine();
    this._modelLoaded = false;
    this._imageLoaded = false;
    this._progressChannel = progressChannel;
  }
  /**
   * Shut down the OCR engine and free up resources.
   */
  destroy() {
    this._engine.delete();
    this._engine = null;
  }
  /**
   * Get the value, represented as a string, of a Tesseract configuration variable.
   *
   * See {@link setVariable} for available variables.
   */
  getVariable(name) {
    const result = this._engine.getVariable(name);
    if (!result.success) {
      throw new Error(`Unable to get variable ${name}`);
    }
    return result.value;
  }
  /**
   * Set the value of a Tesseract configuration variable.
   *
   * For a list of configuration variables, see
   * https://github.com/tesseract-ocr/tesseract/blob/677f5822f247ccb12b4e026265e88b959059fb59/src/ccmain/tesseractclass.cpp#L53
   *
   * If you have Tesseract installed locally, executing `tesseract --print-parameters`
   * will also display a list of configuration variables.
   */
  setVariable(name, value) {
    const result = this._engine.setVariable(name, value);
    if (result.error) {
      throw new Error(`Unable to set variable ${name}`);
    }
  }
  /**
   * Load a trained text recognition model.
   */
  loadModel(model) {
    const modelArray = model instanceof ArrayBuffer ? new Uint8Array(model) : model;
    const result = this._engine.loadModel(modelArray);
    if (result.error) {
      throw new Error("Text recognition model failed to load");
    }
    this._modelLoaded = true;
  }
  /**
   * Load a document image for processing by subsequent operations.
   *
   * This is a cheap operation as expensive processing is deferred until
   * bounding boxes or text content is requested.
   */
  loadImage(image) {
    let imageData;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      imageData = imageDataFromBitmap(image);
    } else {
      imageData = image;
    }
    if (imageData.data.length < imageData.width * imageData.height * 4) {
      throw new Error("Image data length does not match width/height");
    }
    if (imageData.width <= 0 || imageData.height <= 0) {
      throw new Error("Image width or height is zero");
    }
    this._engine.clearImage();
    const engineImage = new this._tesseractLib.Image(imageData.width, imageData.height);
    const engineImageBuf = engineImage.data();
    engineImageBuf.set(new Uint32Array(imageData.data.buffer));
    const result = this._engine.loadImage(engineImage);
    engineImage.delete();
    if (result.error) {
      throw new Error("Failed to load image");
    }
    this._imageLoaded = true;
  }
  /**
   * Clear the current image and text recognition results.
   *
   * This will clear the loaded image data internally, but keep the text
   * recognition model loaded.
   *
   * At present there is no way to shrink WebAssembly memory, so this will not
   * return the memory used by the image to the OS/browser. To release memory,
   * the `OCREngine` instance needs to be destroyed via {@link destroy}.
   */
  clearImage() {
    this._engine.clearImage();
    this._imageLoaded = false;
  }
  /**
   * Perform layout analysis on the current image, if not already done, and
   * return bounding boxes for a given unit of text.
   *
   * This operation is relatively cheap compared to text recognition, so can
   * provide much faster results if only the location of lines/words etc. on
   * the page is required, not the text content. This operation can also be
   * performed before a text recognition model is loaded.
   *
   * This method may return a different number/positions of words on a line
   * compared to {@link getTextBoxes} due to the simpler analysis. After full
   * OCR has been performed by {@link getTextBoxes} or {@link getText}, this
   * method should return the same results.
   */
  getBoundingBoxes(unit) {
    this._checkImageLoaded();
    const textUnit = this._textUnitForUnit(unit);
    return jsArrayFromStdVector(this._engine.getBoundingBoxes(textUnit));
  }
  /**
   * Perform layout analysis and text recognition on the current image, if
   * not already done, and return bounding boxes and text content for a given
   * unit of text.
   *
   * A text recognition model must be loaded with {@link loadModel} before this
   * is called.
   */
  getTextBoxes(unit, onProgress) {
    this._checkImageLoaded();
    this._checkModelLoaded();
    const textUnit = this._textUnitForUnit(unit);
    return jsArrayFromStdVector(this._engine.getTextBoxes(textUnit, (progress) => {
      var _a;
      onProgress === null || onProgress === void 0 ? void 0 : onProgress(progress);
      (_a = this._progressChannel) === null || _a === void 0 ? void 0 : _a.postMessage({ progress });
    }));
  }
  /**
   * Perform layout analysis and text recognition on the current image, if
   * not already done, and return the page text as a string.
   *
   * A text recognition model must be loaded with {@link loadModel} before this
   * is called.
   */
  getText(onProgress) {
    this._checkImageLoaded();
    this._checkModelLoaded();
    return this._engine.getText((progress) => {
      var _a;
      onProgress === null || onProgress === void 0 ? void 0 : onProgress(progress);
      (_a = this._progressChannel) === null || _a === void 0 ? void 0 : _a.postMessage({ progress });
    });
  }
  /**
   * Perform layout analysis and text recognition on the current image, if
   * not already done, and return the page text in hOCR format.
   *
   * A text recognition model must be loaded with {@link loadModel} before this
   * is called.
   */
  getHOCR(onProgress) {
    this._checkImageLoaded();
    this._checkModelLoaded();
    return this._engine.getHOCR((progress) => {
      var _a;
      onProgress === null || onProgress === void 0 ? void 0 : onProgress(progress);
      (_a = this._progressChannel) === null || _a === void 0 ? void 0 : _a.postMessage({ progress });
    });
  }
  /**
   * Attempt to determine the orientation of the document image in degrees.
   *
   * This currently uses a simplistic algorithm [1] which is designed for
   * non-uppercase Latin text. It will likely perform badly for other scripts or
   * if the text is all uppercase.
   *
   * [1] See http://www.leptonica.org/papers/skew-measurement.pdf
   */
  getOrientation() {
    this._checkImageLoaded();
    return this._engine.getOrientation();
  }
  _checkModelLoaded() {
    if (!this._modelLoaded) {
      throw new Error("No text recognition model loaded");
    }
  }
  _checkImageLoaded() {
    if (!this._imageLoaded) {
      throw new Error("No image loaded");
    }
  }
  _textUnitForUnit(unit) {
    const { TextUnit } = this._tesseractLib;
    switch (unit) {
      case "word":
        return TextUnit.Word;
      case "line":
        return TextUnit.Line;
      default:
        throw new Error("Invalid text unit");
    }
  }
};
function wasmSIMDSupported() {
  const simdTest = Uint8Array.from([
    0,
    97,
    115,
    109,
    1,
    0,
    0,
    0,
    1,
    5,
    1,
    96,
    0,
    1,
    123,
    3,
    2,
    1,
    0,
    10,
    10,
    1,
    8,
    0,
    65,
    0,
    253,
    15,
    253,
    98,
    11
  ]);
  return WebAssembly.validate(simdTest);
}
__name(wasmSIMDSupported, "wasmSIMDSupported");
function resolve(path, baseURL) {
  return new URL(path, baseURL).href;
}
__name(resolve, "resolve");
function supportsFastBuild() {
  return wasmSIMDSupported();
}
__name(supportsFastBuild, "supportsFastBuild");
async function createOCREngine({ wasmBinary, progressChannel, instantiateWasm } = {}) {
  if (!wasmBinary && !instantiateWasm) {
    const wasmPath = supportsFastBuild() ? "./tesseract-core.wasm" : "./tesseract-core-fallback.wasm";
    const wasmURL = resolve(wasmPath, import.meta.url);
    const wasmBinaryResponse = await fetch(wasmURL);
    wasmBinary = await wasmBinaryResponse.arrayBuffer();
  }
  const tessLib = await Module(instantiateWasm ? { instantiateWasm, locateFile: /* @__PURE__ */ __name(() => "", "locateFile") } : { wasmBinary });
  return new OCREngine(tessLib, progressChannel);
}
__name(createOCREngine, "createOCREngine");

// ../src/extraction/jitagi-detect-schedules.js
var SCHEDULE_TYPE_REGISTRY = {
  door_schedule: { status: "active", pageClassifiers: ["door schedule", "door index", "door list"] },
  hardware_schedule: { status: "active", pageClassifiers: ["hardware schedule", "hardware group", "hdw", "hw group"] },
  finish_schedule: { status: "not_implemented", pageClassifiers: ["finish schedule", "finish hardware"] },
  ada_compliance: { status: "not_implemented", pageClassifiers: ["ada compliance", "accessibility"] },
  municipal_requirements: { status: "not_implemented", pageClassifiers: ["municipal", "code requirements"] }
};
function classifyPageType(title2) {
  const lower = (title2 || "").toLowerCase();
  for (const [type, config2] of Object.entries(SCHEDULE_TYPE_REGISTRY)) {
    for (const classifier of config2.pageClassifiers) {
      if (lower.includes(classifier)) return type;
    }
  }
  return "unknown_schedule";
}
__name(classifyPageType, "classifyPageType");
var ARRIVAL = Object.freeze({
  ON_TIME: "on_time",
  TOO_LATE: "too_late",
  PENDING_STILL_ON_TIME: "pending_still_on_time",
  PENDING_ALREADY_LATE: "pending_already_late"
});
function raceAgainstDeadline(workPromise, deadlineMs) {
  const start = Date.now();
  let settled = false;
  const timed = workPromise.then(
    (value) => {
      settled = true;
      const elapsed = Date.now() - start;
      return { state: elapsed <= deadlineMs ? ARRIVAL.ON_TIME : ARRIVAL.TOO_LATE, value, elapsed };
    },
    (error) => {
      settled = true;
      const elapsed = Date.now() - start;
      return { state: elapsed <= deadlineMs ? ARRIVAL.ON_TIME : ARRIVAL.TOO_LATE, error, elapsed };
    }
  );
  const deadline = new Promise((resolve2) => {
    setTimeout(() => {
      if (!settled) {
        const remaining = deadlineMs - (Date.now() - start);
        resolve2({
          state: remaining >= 0 ? ARRIVAL.PENDING_STILL_ON_TIME : ARRIVAL.PENDING_ALREADY_LATE,
          pending: workPromise
        });
      }
    }, deadlineMs);
  });
  return Promise.race([timed, deadline]);
}
__name(raceAgainstDeadline, "raceAgainstDeadline");
function rotate90CW(img) {
  const { width: w, height: h, data } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = (x * h + (h - 1 - y)) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: out, width: h, height: w };
}
__name(rotate90CW, "rotate90CW");
function cropTitleRegion(img) {
  const cropW = Math.floor(img.width * 0.65);
  const cropH = Math.floor(img.height * 0.1);
  const out = new Uint8ClampedArray(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const dstIdx = (y * cropW + x) * 4;
      out[dstIdx] = img.data[srcIdx];
      out[dstIdx + 1] = img.data[srcIdx + 1];
      out[dstIdx + 2] = img.data[srcIdx + 2];
      out[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }
  return { data: out, width: cropW, height: cropH };
}
__name(cropTitleRegion, "cropTitleRegion");
async function extractPageTitleText(ocrEngine, pageImage) {
  ocrEngine.clearImage();
  ocrEngine.loadImage(pageImage);
  const orientation = ocrEngine.getOrientation();
  let corrected = pageImage;
  if (orientation.rotation !== 0 && orientation.confidence > 0.5) {
    const turns = Math.round(orientation.rotation / 90) % 4;
    for (let i = 0; i < turns; i++) corrected = rotate90CW(corrected);
    ocrEngine.clearImage();
    ocrEngine.loadImage(corrected);
  }
  const titleCrop = cropTitleRegion(corrected);
  ocrEngine.clearImage();
  ocrEngine.loadImage(titleCrop);
  ocrEngine.setVariable("tessedit_pageseg_mode", "11");
  const text = ocrEngine.getText();
  if (!text || text.trim().length === 0) return null;
  return text;
}
__name(extractPageTitleText, "extractPageTitleText");
async function classifyOnePage(ocrEngine, pageImage) {
  const text = await extractPageTitleText(ocrEngine, pageImage);
  if (text === null) {
    return { scheduleType: null, resolved: false, reason: "ocr_produced_no_text" };
  }
  const scheduleType = classifyPageType(text);
  const config2 = SCHEDULE_TYPE_REGISTRY[scheduleType];
  const isCandidate = scheduleType !== "unknown_schedule" && config2 && config2.status !== "not_implemented";
  return { scheduleType, resolved: true, isCandidate, ocrText: text.slice(0, 200) };
}
__name(classifyOnePage, "classifyOnePage");
function makeLayer({ ocrEngine, pageNumber, pageImage, baseDeadlineMs, corpus }) {
  return (/* @__PURE__ */ __name((async function layer() {
    const neighborBoost = corpus.pages[pageNumber - 1]?.isCandidate || corpus.pages[pageNumber + 1]?.isCandidate;
    const deadline = neighborBoost ? baseDeadlineMs * 2 : baseDeadlineMs;
    const raced = await raceAgainstDeadline(
      classifyOnePage(ocrEngine, pageImage),
      deadline
    );
    let outcome;
    if (raced.state === ARRIVAL.ON_TIME || raced.state === ARRIVAL.TOO_LATE) {
      outcome = { pageNumber, ...raced.value, timing: raced.state, elapsed: raced.elapsed };
    } else {
      outcome = { pageNumber, resolved: false, timing: raced.state };
      raced.pending.then((value) => {
        corpus.pages[pageNumber] = { pageNumber, ...value, timing: raced.state + "_then_resolved" };
      }).catch(() => {
        corpus.pages[pageNumber] = { pageNumber, resolved: false, timing: raced.state + "_then_failed" };
      });
    }
    corpus.pages[pageNumber] = outcome;
    return outcome;
  }), "layer"))();
}
__name(makeLayer, "makeLayer");
async function detectSchedules({ env: env2, sessionId, ocrEngine, pageImages, totalPages, baseDeadlineMs = 4e3 }) {
  const corpus = { pages: {}, candidates: [], meta: { totalPages, startedAt: Date.now() } };
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    await makeLayer({ ocrEngine, pageNumber, pageImage: pageImages.get(pageNumber), baseDeadlineMs, corpus });
  }
  const stillPending = Object.values(corpus.pages).filter((p) => !p.resolved);
  for (const p of stillPending) {
    await makeLayer({ ocrEngine, pageNumber: p.pageNumber, pageImage: pageImages.get(p.pageNumber), baseDeadlineMs: baseDeadlineMs * 2, corpus });
  }
  corpus.candidates = Object.values(corpus.pages).filter((p) => p.resolved && p.isCandidate).map((p) => ({ pageNumber: p.pageNumber, scheduleType: p.scheduleType }));
  const unresolved = Object.values(corpus.pages).filter((p) => !p.resolved);
  if (env2?.DB && corpus.candidates.length > 0) {
    const stmt = env2.DB.prepare(
      `INSERT INTO schedule_region_candidates (session_id, page_number, schedule_type, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    );
    await env2.DB.batch(corpus.candidates.map((c) => stmt.bind(sessionId, c.pageNumber, c.scheduleType)));
  }
  return {
    sessionId,
    candidates: corpus.candidates,
    unresolved: unresolved.map((p) => ({ pageNumber: p.pageNumber, timing: p.timing })),
    pagesWithNoOcrText: Object.values(corpus.pages).filter((p) => p.resolved && p.reason === "ocr_produced_no_text").length,
    durationMs: Date.now() - corpus.meta.startedAt
  };
}
__name(detectSchedules, "detectSchedules");

// page-range.js
function pageRange(headers, documentPages) {
  const parse = /* @__PURE__ */ __name((name, fallback) => {
    const raw = headers.get(name) ?? String(fallback);
    if (!/^[1-9]\d*$/.test(raw)) throw new Error(`Invalid ${name}`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) throw new Error(`Invalid ${name}`);
    return value;
  }, "parse");
  const start = parse("X-Start-Page", 1);
  const count = parse("X-Total-Pages", 1);
  const maximum = parse("X-Max-Document-Pages", 1e5);
  if (documentPages > maximum) throw new Error("Document exceeds requested page limit");
  if (start > documentPages) throw new Error("Start page exceeds document");
  return { start, end: Math.min(documentPages, start + count - 1), documentPages };
}
__name(pageRange, "pageRange");

// index.js
import pdfiumModule from "./70e814dc5dc5b691421eed7350fbac723a540746-pdfium.wasm";
import tesseractModule from "./e682ef884c02702cb4d155875f78a6edf30d46d4-tesseract-core.wasm";
import trainedData from "./31abd495e0f719db4f524c447e9d855124a0b0d6-eng-traineddata.bin";
var _pdfiumLibrary = null;
var _ocrEngine = null;
async function getPdfiumLibrary() {
  if (_pdfiumLibrary) return _pdfiumLibrary;
  _pdfiumLibrary = await PDFiumLibrary2.init({
    instantiateWasm(imports, successCallback) {
      const instance = new WebAssembly.Instance(pdfiumModule, imports);
      successCallback(instance, pdfiumModule);
      return instance.exports;
    }
  });
  return _pdfiumLibrary;
}
__name(getPdfiumLibrary, "getPdfiumLibrary");
async function getOcrEngine() {
  if (_ocrEngine) return _ocrEngine;
  _ocrEngine = await createOCREngine({
    instantiateWasm(imports, successCallback) {
      const instance = new WebAssembly.Instance(tesseractModule, imports);
      successCallback(instance, tesseractModule);
      return instance.exports;
    }
  });
  _ocrEngine.loadModel(new Uint8Array(trainedData));
  return _ocrEngine;
}
__name(getOcrEngine, "getOcrEngine");
function bgraToRgba(bgra) {
  const rgba = new Uint8ClampedArray(bgra.length);
  for (let i = 0; i < bgra.length; i += 4) {
    rgba[i] = bgra[i + 2];
    rgba[i + 1] = bgra[i + 1];
    rgba[i + 2] = bgra[i];
    rgba[i + 3] = bgra[i + 3];
  }
  return rgba;
}
__name(bgraToRgba, "bgraToRgba");
async function renderAndDetect(pdfBuffer, totalPages, sessionId) {
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();
  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  const pageImages = /* @__PURE__ */ new Map();
  try {
    const pageCount = Math.min(totalPages, doc.getPageCount());
    for (let i = 0; i < pageCount; i++) {
      const page = doc.getPage(i);
      const rendered = await page.render({ scale: 150 / 72, colorSpace: "BGRA" });
      pageImages.set(i + 1, {
        data: bgraToRgba(rendered.data),
        width: rendered.width,
        height: rendered.height
      });
    }
  } finally {
    doc.destroy();
  }
  return detectSchedules({
    env: null,
    // caller (weylandai-com-worker) owns the DB write, it has the real D1 binding
    sessionId,
    ocrEngine,
    pageImages,
    totalPages: pageImages.size,
    baseDeadlineMs: 8e3
  });
}
__name(renderAndDetect, "renderAndDetect");
async function renderAndExtractText(pdfBuffer, headers) {
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();
  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  const pages = [];
  let range;
  try {
    range = pageRange(headers, doc.getPageCount());
    for (let i = range.start - 1; i < range.end; i++) {
      const page = doc.getPage(i);
      const rendered = await page.render({ scale: 150 / 72, colorSpace: "BGRA" });
      const pageImage = {
        data: bgraToRgba(rendered.data),
        width: rendered.width,
        height: rendered.height
      };
      ocrEngine.clearImage();
      ocrEngine.loadImage(pageImage);
      ocrEngine.setVariable("tessedit_pageseg_mode", "3");
      const text = ocrEngine.getText();
      pages.push({ page: i + 1, text: (text || "").trim() });
    }
  } finally {
    doc.destroy();
  }
  return {
    pages,
    pageCount: pages.length,
    documentPageCount: range.documentPages,
    startPage: range.start,
    endPage: range.end,
    hasMore: range.end < range.documentPages
  };
}
__name(renderAndExtractText, "renderAndExtractText");
async function renderPageImage(pdfBuffer, pageNum) {
  const library = await getPdfiumLibrary();
  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  try {
    const index = Math.max(0, Math.min(pageNum - 1, doc.getPageCount() - 1));
    const page = doc.getPage(index);
    const rendered = await page.render({ scale: 150 / 72, colorSpace: "BGRA" });
    return { data: bgraToRgba(rendered.data), width: rendered.width, height: rendered.height };
  } finally {
    doc.destroy();
  }
}
__name(renderPageImage, "renderPageImage");
function diffPageImages(imgA, imgB) {
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);
  const gridCols = Math.min(24, width);
  const gridRows = Math.min(32, height);
  const cellW = Math.floor(width / gridCols);
  const cellH = Math.floor(height / gridRows);
  const cellDiffs = [];
  let totalDiff = 0;
  for (let gy = 0; gy < gridRows; gy++) {
    const row = [];
    for (let gx = 0; gx < gridCols; gx++) {
      let sum = 0, count = 0;
      const x0 = gx * cellW, y0 = gy * cellH;
      for (let y = y0; y < y0 + cellH; y += 2) {
        for (let x = x0; x < x0 + cellW; x += 2) {
          const i = (y * imgA.width + x) * 4;
          const j = (y * imgB.width + x) * 4;
          if (i + 2 >= imgA.data.length || j + 2 >= imgB.data.length) continue;
          const dr = Math.abs(imgA.data[i] - imgB.data[j]);
          const dg = Math.abs(imgA.data[i + 1] - imgB.data[j + 1]);
          const db = Math.abs(imgA.data[i + 2] - imgB.data[j + 2]);
          sum += (dr + dg + db) / 3;
          count++;
        }
      }
      const avg = count ? sum / count / 255 : 0;
      row.push(Math.round(avg * 1e3) / 1e3);
      totalDiff += avg;
    }
    cellDiffs.push(row);
  }
  return { width, height, gridCols, gridRows, cellDiffs, overallDiffPercent: Math.round(totalDiff / (gridCols * gridRows) * 1e3) / 10 };
}
__name(diffPageImages, "diffPageImages");
var index_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "weyland-ocr-worker" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/detect-schedules" && request.method === "POST") {
      try {
        const sessionId = request.headers.get("X-Session-Id") || "unknown";
        const totalPages = parseInt(request.headers.get("X-Total-Pages") || "1", 10);
        const pdfBuffer = await request.arrayBuffer();
        const result = await renderAndDetect(pdfBuffer, totalPages, sessionId);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/extract-text" && request.method === "POST") {
      try {
        const pdfBuffer = await request.arrayBuffer();
        const result = await renderAndExtractText(pdfBuffer, request.headers);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/diff-pages" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const originalFile = formData.get("original");
        const revisedFile = formData.get("revised");
        const page = parseInt(formData.get("page") || "1", 10);
        if (!originalFile || !revisedFile) {
          return new Response(JSON.stringify({ error: 'Both "original" and "revised" files are required' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const [imgA, imgB] = await Promise.all([
          renderPageImage(await originalFile.arrayBuffer(), page),
          renderPageImage(await revisedFile.arrayBuffer(), page)
        ]);
        const result = diffPageImages(imgA, imgB);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response("Not Found", { status: 404 });
  }
};
export {
  index_default as default
};
/*! Bundled license information:

tesseract-wasm/dist/lib.js:
tesseract-wasm/dist/lib.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
//# sourceMappingURL=index.js.map
