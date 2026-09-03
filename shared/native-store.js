(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve2) => call.then(() => resolve2({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          this.listeners[eventName].splice(index, 1);
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve2, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve2(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        async setStyle() {
          this.unavailable("not available for web");
        }
        async setAnimation() {
          this.unavailable("not available for web");
        }
        async show() {
          this.unavailable("not available for web");
        }
        async hide() {
          this.unavailable("not available for web");
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // node_modules/@capacitor-community/sqlite/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    CapacitorSQLiteWeb: () => CapacitorSQLiteWeb
  });
  var CapacitorSQLiteWeb;
  var init_web = __esm({
    "node_modules/@capacitor-community/sqlite/dist/esm/web.js"() {
      init_dist();
      CapacitorSQLiteWeb = class extends WebPlugin {
        constructor() {
          super(...arguments);
          this.jeepSqliteElement = null;
          this.isWebStoreOpen = false;
        }
        async initWebStore() {
          await customElements.whenDefined("jeep-sqlite");
          this.jeepSqliteElement = document.querySelector("jeep-sqlite");
          this.ensureJeepSqliteIsAvailable();
          this.jeepSqliteElement.addEventListener("jeepSqliteImportProgress", (event) => {
            this.notifyListeners("sqliteImportProgressEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqliteExportProgress", (event) => {
            this.notifyListeners("sqliteExportProgressEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqliteHTTPRequestEnded", (event) => {
            this.notifyListeners("sqliteHTTPRequestEndedEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqlitePickDatabaseEnded", (event) => {
            this.notifyListeners("sqlitePickDatabaseEndedEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqliteSaveDatabaseToDisk", (event) => {
            this.notifyListeners("sqliteSaveDatabaseToDiskEvent", event.detail);
          });
          if (!this.isWebStoreOpen) {
            this.isWebStoreOpen = await this.jeepSqliteElement.isStoreOpen();
          }
          return;
        }
        async saveToStore(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.saveToStore(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getFromLocalDiskToStore(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.getFromLocalDiskToStore(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async saveToLocalDisk(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.saveToLocalDisk(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async echo(options) {
          this.ensureJeepSqliteIsAvailable();
          const echoResult = await this.jeepSqliteElement.echo(options);
          return echoResult;
        }
        async createConnection(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.createConnection(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async open(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.open(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async closeConnection(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.closeConnection(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getVersion(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const versionResult = await this.jeepSqliteElement.getVersion(options);
            return versionResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async checkConnectionsConsistency(options) {
          this.ensureJeepSqliteIsAvailable();
          try {
            const consistencyResult = await this.jeepSqliteElement.checkConnectionsConsistency(options);
            return consistencyResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async close(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.close(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async beginTransaction(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const changes = await this.jeepSqliteElement.beginTransaction(options);
            return changes;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async commitTransaction(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const changes = await this.jeepSqliteElement.commitTransaction(options);
            return changes;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async rollbackTransaction(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const changes = await this.jeepSqliteElement.rollbackTransaction(options);
            return changes;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isTransactionActive(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const result = await this.jeepSqliteElement.isTransactionActive(options);
            return result;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getTableList(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const tableListResult = await this.jeepSqliteElement.getTableList(options);
            return tableListResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async execute(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const executeResult = await this.jeepSqliteElement.execute(options);
            return executeResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async executeSet(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const executeResult = await this.jeepSqliteElement.executeSet(options);
            return executeResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async run(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const runResult = await this.jeepSqliteElement.run(options);
            return runResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async query(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const queryResult = await this.jeepSqliteElement.query(options);
            return queryResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isDBExists(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const dbExistsResult = await this.jeepSqliteElement.isDBExists(options);
            return dbExistsResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isDBOpen(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const isDBOpenResult = await this.jeepSqliteElement.isDBOpen(options);
            return isDBOpenResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isDatabase(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const isDatabaseResult = await this.jeepSqliteElement.isDatabase(options);
            return isDatabaseResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isTableExists(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const tableExistsResult = await this.jeepSqliteElement.isTableExists(options);
            return tableExistsResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async deleteDatabase(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.deleteDatabase(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isJsonValid(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const isJsonValidResult = await this.jeepSqliteElement.isJsonValid(options);
            return isJsonValidResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async importFromJson(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const importFromJsonResult = await this.jeepSqliteElement.importFromJson(options);
            return importFromJsonResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async exportToJson(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const exportToJsonResult = await this.jeepSqliteElement.exportToJson(options);
            return exportToJsonResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async createSyncTable(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const createSyncTableResult = await this.jeepSqliteElement.createSyncTable(options);
            return createSyncTableResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async setSyncDate(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.setSyncDate(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getSyncDate(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const getSyncDateResult = await this.jeepSqliteElement.getSyncDate(options);
            return getSyncDateResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async deleteExportedRows(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.deleteExportedRows(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async addUpgradeStatement(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.addUpgradeStatement(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async copyFromAssets(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.copyFromAssets(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getFromHTTPRequest(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.getFromHTTPRequest(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getDatabaseList() {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const databaseListResult = await this.jeepSqliteElement.getDatabaseList();
            return databaseListResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        /**
         * Checks if the `jeep-sqlite` element is present in the DOM.
         * If it's not in the DOM, this method throws an Error.
         *
         * Attention: This will always fail, if the `intWebStore()` method wasn't called before.
         */
        ensureJeepSqliteIsAvailable() {
          if (this.jeepSqliteElement === null) {
            throw new Error(`The jeep-sqlite element is not present in the DOM! Please check the @capacitor-community/sqlite documentation for instructions regarding the web platform.`);
          }
        }
        ensureWebstoreIsOpen() {
          if (!this.isWebStoreOpen) {
            throw new Error('WebStore is not open yet. You have to call "initWebStore()" first.');
          }
        }
        ////////////////////////////////////
        ////// UNIMPLEMENTED METHODS
        ////////////////////////////////////
        async getUrl() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getMigratableDbList(options) {
          console.log("getMigratableDbList", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async addSQLiteSuffix(options) {
          console.log("addSQLiteSuffix", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async deleteOldDatabases(options) {
          console.log("deleteOldDatabases", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async moveDatabasesAndAddSuffix(options) {
          console.log("moveDatabasesAndAddSuffix", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isSecretStored() {
          throw this.unimplemented("Not implemented on web.");
        }
        async setEncryptionSecret(options) {
          console.log("setEncryptionSecret", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async changeEncryptionSecret(options) {
          console.log("changeEncryptionSecret", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async clearEncryptionSecret() {
          console.log("clearEncryptionSecret");
          throw this.unimplemented("Not implemented on web.");
        }
        async checkEncryptionSecret(options) {
          console.log("checkEncryptionPassPhrase", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async getNCDatabasePath(options) {
          console.log("getNCDatabasePath", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async createNCConnection(options) {
          console.log("createNCConnection", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async closeNCConnection(options) {
          console.log("closeNCConnection", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isNCDatabase(options) {
          console.log("isNCDatabase", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isDatabaseEncrypted(options) {
          console.log("isDatabaseEncrypted", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isInConfigEncryption() {
          throw this.unimplemented("Not implemented on web.");
        }
        async isInConfigBiometricAuth() {
          throw this.unimplemented("Not implemented on web.");
        }
        async loadExtension(options) {
          console.log("loadExtension", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async enableLoadExtension(options) {
          console.log("enableLoadExtension", options);
          throw this.unimplemented("Not implemented on web.");
        }
      };
    }
  });

  // node_modules/@capacitor/filesystem/dist/esm/definitions.js
  var Directory, Encoding;
  var init_definitions = __esm({
    "node_modules/@capacitor/filesystem/dist/esm/definitions.js"() {
      (function(Directory2) {
        Directory2["Documents"] = "DOCUMENTS";
        Directory2["Data"] = "DATA";
        Directory2["Library"] = "LIBRARY";
        Directory2["Cache"] = "CACHE";
        Directory2["External"] = "EXTERNAL";
        Directory2["ExternalStorage"] = "EXTERNAL_STORAGE";
        Directory2["ExternalCache"] = "EXTERNAL_CACHE";
        Directory2["LibraryNoCloud"] = "LIBRARY_NO_CLOUD";
        Directory2["Temporary"] = "TEMPORARY";
      })(Directory || (Directory = {}));
      (function(Encoding2) {
        Encoding2["UTF8"] = "utf8";
        Encoding2["ASCII"] = "ascii";
        Encoding2["UTF16"] = "utf16";
      })(Encoding || (Encoding = {}));
    }
  });

  // node_modules/@capacitor/filesystem/dist/esm/web.js
  var web_exports2 = {};
  __export(web_exports2, {
    FilesystemWeb: () => FilesystemWeb
  });
  function resolve(path) {
    const posix = path.split("/").filter((item) => item !== ".");
    const newPosix = [];
    posix.forEach((item) => {
      if (item === ".." && newPosix.length > 0 && newPosix[newPosix.length - 1] !== "..") {
        newPosix.pop();
      } else {
        newPosix.push(item);
      }
    });
    return newPosix.join("/");
  }
  function isPathParent(parent, children) {
    parent = resolve(parent);
    children = resolve(children);
    const pathsA = parent.split("/");
    const pathsB = children.split("/");
    return parent !== children && pathsA.every((value, index) => value === pathsB[index]);
  }
  var FilesystemWeb;
  var init_web2 = __esm({
    "node_modules/@capacitor/filesystem/dist/esm/web.js"() {
      init_dist();
      init_definitions();
      FilesystemWeb = class _FilesystemWeb extends WebPlugin {
        constructor() {
          super(...arguments);
          this.DB_VERSION = 1;
          this.DB_NAME = "Disc";
          this._writeCmds = ["add", "put", "delete"];
          this.downloadFile = async (options) => {
            var _a, _b;
            const requestInit = buildRequestInit(options, options.webFetchExtra);
            const response = await fetch(options.url, requestInit);
            let blob;
            if (!options.progress)
              blob = await response.blob();
            else if (!(response === null || response === void 0 ? void 0 : response.body))
              blob = new Blob();
            else {
              const reader = response.body.getReader();
              let bytes = 0;
              const chunks = [];
              const contentType = response.headers.get("content-type");
              const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
              while (true) {
                const { done, value } = await reader.read();
                if (done)
                  break;
                chunks.push(value);
                bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
                const status = {
                  url: options.url,
                  bytes,
                  contentLength
                };
                this.notifyListeners("progress", status);
              }
              const allChunks = new Uint8Array(bytes);
              let position = 0;
              for (const chunk of chunks) {
                if (typeof chunk === "undefined")
                  continue;
                allChunks.set(chunk, position);
                position += chunk.length;
              }
              blob = new Blob([allChunks.buffer], { type: contentType || void 0 });
            }
            const result = await this.writeFile({
              path: options.path,
              directory: (_a = options.directory) !== null && _a !== void 0 ? _a : void 0,
              recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
              data: blob
            });
            return { path: result.uri, blob };
          };
        }
        readFileInChunks(_options, _callback) {
          throw this.unavailable("Method not implemented.");
        }
        async initDb() {
          if (this._db !== void 0) {
            return this._db;
          }
          if (!("indexedDB" in window)) {
            throw this.unavailable("This browser doesn't support IndexedDB");
          }
          return new Promise((resolve2, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = _FilesystemWeb.doUpgrade;
            request.onsuccess = () => {
              this._db = request.result;
              resolve2(request.result);
            };
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
              console.warn("db blocked");
            };
          });
        }
        static doUpgrade(event) {
          const eventTarget = event.target;
          const db2 = eventTarget.result;
          switch (event.oldVersion) {
            case 0:
            case 1:
            default: {
              if (db2.objectStoreNames.contains("FileStorage")) {
                db2.deleteObjectStore("FileStorage");
              }
              const store = db2.createObjectStore("FileStorage", { keyPath: "path" });
              store.createIndex("by_folder", "folder");
            }
          }
        }
        async dbRequest(cmd, args) {
          const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
          return this.initDb().then((conn) => {
            return new Promise((resolve2, reject) => {
              const tx = conn.transaction(["FileStorage"], readFlag);
              const store = tx.objectStore("FileStorage");
              const req = store[cmd](...args);
              req.onsuccess = () => resolve2(req.result);
              req.onerror = () => reject(req.error);
            });
          });
        }
        async dbIndexRequest(indexName, cmd, args) {
          const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
          return this.initDb().then((conn) => {
            return new Promise((resolve2, reject) => {
              const tx = conn.transaction(["FileStorage"], readFlag);
              const store = tx.objectStore("FileStorage");
              const index = store.index(indexName);
              const req = index[cmd](...args);
              req.onsuccess = () => resolve2(req.result);
              req.onerror = () => reject(req.error);
            });
          });
        }
        getPath(directory, uriPath) {
          const cleanedUriPath = uriPath !== void 0 ? uriPath.replace(/^[/]+|[/]+$/g, "") : "";
          let fsPath = "";
          if (directory !== void 0)
            fsPath += "/" + directory;
          if (uriPath !== "")
            fsPath += "/" + cleanedUriPath;
          return fsPath;
        }
        async clear() {
          const conn = await this.initDb();
          const tx = conn.transaction(["FileStorage"], "readwrite");
          const store = tx.objectStore("FileStorage");
          store.clear();
        }
        /**
         * Read a file from disk
         * @param options options for the file read
         * @return a promise that resolves with the read file data result
         */
        async readFile(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (entry === void 0)
            throw Error("File does not exist.");
          return { data: entry.content ? entry.content : "" };
        }
        /**
         * Write a file to disk in the specified location on device
         * @param options options for the file write
         * @return a promise that resolves with the file write result
         */
        async writeFile(options) {
          const path = this.getPath(options.directory, options.path);
          let data = options.data;
          const encoding = options.encoding;
          const doRecursive = options.recursive;
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (occupiedEntry && occupiedEntry.type === "directory")
            throw Error("The supplied path is a directory.");
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const parentEntry = await this.dbRequest("get", [parentPath]);
          if (parentEntry === void 0) {
            const subDirIndex = parentPath.indexOf("/", 1);
            if (subDirIndex !== -1) {
              const parentArgPath = parentPath.substr(subDirIndex);
              await this.mkdir({
                path: parentArgPath,
                directory: options.directory,
                recursive: doRecursive
              });
            }
          }
          if (!encoding && !(data instanceof Blob)) {
            data = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
            if (!this.isBase64String(data))
              throw Error("The supplied data is not valid base64 content.");
          }
          const now = Date.now();
          const pathObj = {
            path,
            folder: parentPath,
            type: "file",
            size: data instanceof Blob ? data.size : data.length,
            ctime: now,
            mtime: now,
            content: data
          };
          await this.dbRequest("put", [pathObj]);
          return {
            uri: pathObj.path
          };
        }
        /**
         * Append to a file on disk in the specified location on device
         * @param options options for the file append
         * @return a promise that resolves with the file write result
         */
        async appendFile(options) {
          const path = this.getPath(options.directory, options.path);
          let data = options.data;
          const encoding = options.encoding;
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const now = Date.now();
          let ctime = now;
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (occupiedEntry && occupiedEntry.type === "directory")
            throw Error("The supplied path is a directory.");
          const parentEntry = await this.dbRequest("get", [parentPath]);
          if (parentEntry === void 0) {
            const subDirIndex = parentPath.indexOf("/", 1);
            if (subDirIndex !== -1) {
              const parentArgPath = parentPath.substr(subDirIndex);
              await this.mkdir({
                path: parentArgPath,
                directory: options.directory,
                recursive: true
              });
            }
          }
          if (!encoding && !this.isBase64String(data))
            throw Error("The supplied data is not valid base64 content.");
          if (occupiedEntry !== void 0) {
            if (occupiedEntry.content instanceof Blob) {
              throw Error("The occupied entry contains a Blob object which cannot be appended to.");
            }
            if (occupiedEntry.content !== void 0 && !encoding) {
              data = btoa(atob(occupiedEntry.content) + atob(data));
            } else {
              data = occupiedEntry.content + data;
            }
            ctime = occupiedEntry.ctime;
          }
          const pathObj = {
            path,
            folder: parentPath,
            type: "file",
            size: data.length,
            ctime,
            mtime: now,
            content: data
          };
          await this.dbRequest("put", [pathObj]);
        }
        /**
         * Delete a file from disk
         * @param options options for the file delete
         * @return a promise that resolves with the deleted file data result
         */
        async deleteFile(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (entry === void 0)
            throw Error("File does not exist.");
          const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
          if (entries.length !== 0)
            throw Error("Folder is not empty.");
          await this.dbRequest("delete", [path]);
        }
        /**
         * Create a directory.
         * @param options options for the mkdir
         * @return a promise that resolves with the mkdir result
         */
        async mkdir(options) {
          const path = this.getPath(options.directory, options.path);
          const doRecursive = options.recursive;
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const depth = (path.match(/\//g) || []).length;
          const parentEntry = await this.dbRequest("get", [parentPath]);
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (depth === 1)
            throw Error("Cannot create Root directory");
          if (occupiedEntry !== void 0)
            throw Error("Current directory does already exist.");
          if (!doRecursive && depth !== 2 && parentEntry === void 0)
            throw Error("Parent directory must exist");
          if (doRecursive && depth !== 2 && parentEntry === void 0) {
            const parentArgPath = parentPath.substr(parentPath.indexOf("/", 1));
            await this.mkdir({
              path: parentArgPath,
              directory: options.directory,
              recursive: doRecursive
            });
          }
          const now = Date.now();
          const pathObj = {
            path,
            folder: parentPath,
            type: "directory",
            size: 0,
            ctime: now,
            mtime: now
          };
          await this.dbRequest("put", [pathObj]);
        }
        /**
         * Remove a directory
         * @param options the options for the directory remove
         */
        async rmdir(options) {
          const { path, directory, recursive } = options;
          const fullPath = this.getPath(directory, path);
          const entry = await this.dbRequest("get", [fullPath]);
          if (entry === void 0)
            throw Error("Folder does not exist.");
          if (entry.type !== "directory")
            throw Error("Requested path is not a directory");
          const readDirResult = await this.readdir({ path, directory });
          if (readDirResult.files.length !== 0 && !recursive)
            throw Error("Folder is not empty");
          for (const entry2 of readDirResult.files) {
            const entryPath = `${path}/${entry2.name}`;
            const entryObj = await this.stat({ path: entryPath, directory });
            if (entryObj.type === "file") {
              await this.deleteFile({ path: entryPath, directory });
            } else {
              await this.rmdir({ path: entryPath, directory, recursive });
            }
          }
          await this.dbRequest("delete", [fullPath]);
        }
        /**
         * Return a list of files from the directory (not recursive)
         * @param options the options for the readdir operation
         * @return a promise that resolves with the readdir directory listing result
         */
        async readdir(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (options.path !== "" && entry === void 0)
            throw Error("Folder does not exist.");
          const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
          const files = await Promise.all(entries.map(async (e) => {
            let subEntry = await this.dbRequest("get", [e]);
            if (subEntry === void 0) {
              subEntry = await this.dbRequest("get", [e + "/"]);
            }
            return {
              name: e.substring(path.length + 1),
              type: subEntry.type,
              size: subEntry.size,
              ctime: subEntry.ctime,
              mtime: subEntry.mtime,
              uri: subEntry.path
            };
          }));
          return { files };
        }
        /**
         * Return full File URI for a path and directory
         * @param options the options for the stat operation
         * @return a promise that resolves with the file stat result
         */
        async getUri(options) {
          const path = this.getPath(options.directory, options.path);
          let entry = await this.dbRequest("get", [path]);
          if (entry === void 0) {
            entry = await this.dbRequest("get", [path + "/"]);
          }
          return {
            uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path
          };
        }
        /**
         * Return data about a file
         * @param options the options for the stat operation
         * @return a promise that resolves with the file stat result
         */
        async stat(options) {
          const path = this.getPath(options.directory, options.path);
          let entry = await this.dbRequest("get", [path]);
          if (entry === void 0) {
            entry = await this.dbRequest("get", [path + "/"]);
          }
          if (entry === void 0)
            throw Error("Entry does not exist.");
          return {
            name: entry.path.substring(path.length + 1),
            type: entry.type,
            size: entry.size,
            ctime: entry.ctime,
            mtime: entry.mtime,
            uri: entry.path
          };
        }
        /**
         * Rename a file or directory
         * @param options the options for the rename operation
         * @return a promise that resolves with the rename result
         */
        async rename(options) {
          await this._copy(options, true);
          return;
        }
        /**
         * Copy a file or directory
         * @param options the options for the copy operation
         * @return a promise that resolves with the copy result
         */
        async copy(options) {
          return this._copy(options, false);
        }
        async requestPermissions() {
          return { publicStorage: "granted" };
        }
        async checkPermissions() {
          return { publicStorage: "granted" };
        }
        /**
         * Function that can perform a copy or a rename
         * @param options the options for the rename operation
         * @param doRename whether to perform a rename or copy operation
         * @return a promise that resolves with the result
         */
        async _copy(options, doRename = false) {
          let { toDirectory } = options;
          const { to, from, directory: fromDirectory } = options;
          if (!to || !from) {
            throw Error("Both to and from must be provided");
          }
          if (!toDirectory) {
            toDirectory = fromDirectory;
          }
          const fromPath = this.getPath(fromDirectory, from);
          const toPath = this.getPath(toDirectory, to);
          if (fromPath === toPath) {
            return {
              uri: toPath
            };
          }
          if (isPathParent(fromPath, toPath)) {
            throw Error("To path cannot contain the from path");
          }
          let toObj;
          try {
            toObj = await this.stat({
              path: to,
              directory: toDirectory
            });
          } catch (e) {
            const toPathComponents = to.split("/");
            toPathComponents.pop();
            const toPath2 = toPathComponents.join("/");
            if (toPathComponents.length > 0) {
              const toParentDirectory = await this.stat({
                path: toPath2,
                directory: toDirectory
              });
              if (toParentDirectory.type !== "directory") {
                throw new Error("Parent directory of the to path is a file");
              }
            }
          }
          if (toObj && toObj.type === "directory") {
            throw new Error("Cannot overwrite a directory with a file");
          }
          const fromObj = await this.stat({
            path: from,
            directory: fromDirectory
          });
          const updateTime = async (path, ctime2, mtime) => {
            const fullPath = this.getPath(toDirectory, path);
            const entry = await this.dbRequest("get", [fullPath]);
            entry.ctime = ctime2;
            entry.mtime = mtime;
            await this.dbRequest("put", [entry]);
          };
          const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
          switch (fromObj.type) {
            // The "from" object is a file
            case "file": {
              const file = await this.readFile({
                path: from,
                directory: fromDirectory
              });
              if (doRename) {
                await this.deleteFile({
                  path: from,
                  directory: fromDirectory
                });
              }
              let encoding;
              if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) {
                encoding = Encoding.UTF8;
              }
              const writeResult = await this.writeFile({
                path: to,
                directory: toDirectory,
                data: file.data,
                encoding
              });
              if (doRename) {
                await updateTime(to, ctime, fromObj.mtime);
              }
              return writeResult;
            }
            case "directory": {
              if (toObj) {
                throw Error("Cannot move a directory over an existing object");
              }
              try {
                await this.mkdir({
                  path: to,
                  directory: toDirectory,
                  recursive: false
                });
                if (doRename) {
                  await updateTime(to, ctime, fromObj.mtime);
                }
              } catch (e) {
              }
              const contents = (await this.readdir({
                path: from,
                directory: fromDirectory
              })).files;
              for (const filename of contents) {
                await this._copy({
                  from: `${from}/${filename.name}`,
                  to: `${to}/${filename.name}`,
                  directory: fromDirectory,
                  toDirectory
                }, doRename);
              }
              if (doRename) {
                await this.rmdir({
                  path: from,
                  directory: fromDirectory
                });
              }
            }
          }
          return {
            uri: toPath
          };
        }
        isBase64String(str) {
          try {
            return btoa(atob(str)) == str;
          } catch (err) {
            return false;
          }
        }
      };
      FilesystemWeb._debug = true;
    }
  });

  // src/native-store.js
  init_dist();

  // node_modules/@capacitor-community/sqlite/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor-community/sqlite/dist/esm/definitions.js
  var SQLiteConnection = class {
    constructor(sqlite2) {
      this.sqlite = sqlite2;
      this._connectionDict = /* @__PURE__ */ new Map();
    }
    async initWebStore() {
      try {
        await this.sqlite.initWebStore();
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async saveToStore(database) {
      try {
        await this.sqlite.saveToStore({ database });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async saveToLocalDisk(database) {
      try {
        await this.sqlite.saveToLocalDisk({ database });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getFromLocalDiskToStore(overwrite) {
      const mOverwrite = overwrite != null ? overwrite : true;
      try {
        await this.sqlite.getFromLocalDiskToStore({ overwrite: mOverwrite });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async echo(value) {
      try {
        const res = await this.sqlite.echo({ value });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isSecretStored() {
      try {
        const res = await this.sqlite.isSecretStored();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async setEncryptionSecret(passphrase) {
      try {
        await this.sqlite.setEncryptionSecret({ passphrase });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async changeEncryptionSecret(passphrase, oldpassphrase) {
      try {
        await this.sqlite.changeEncryptionSecret({
          passphrase,
          oldpassphrase
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async clearEncryptionSecret() {
      try {
        await this.sqlite.clearEncryptionSecret();
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async checkEncryptionSecret(passphrase) {
      try {
        const res = await this.sqlite.checkEncryptionSecret({
          passphrase
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async addUpgradeStatement(database, upgrade) {
      try {
        if (database.endsWith(".db"))
          database = database.slice(0, -3);
        await this.sqlite.addUpgradeStatement({
          database,
          upgrade
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async createConnection(database, encrypted, mode, version, readonly) {
      try {
        if (database.endsWith(".db"))
          database = database.slice(0, -3);
        await this.sqlite.createConnection({
          database,
          encrypted,
          mode,
          version,
          readonly
        });
        const conn = new SQLiteDBConnection(database, readonly, this.sqlite);
        const connName = readonly ? `RO_${database}` : `RW_${database}`;
        this._connectionDict.set(connName, conn);
        return Promise.resolve(conn);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async closeConnection(database, readonly) {
      try {
        if (database.endsWith(".db"))
          database = database.slice(0, -3);
        await this.sqlite.closeConnection({ database, readonly });
        const connName = readonly ? `RO_${database}` : `RW_${database}`;
        this._connectionDict.delete(connName);
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isConnection(database, readonly) {
      const res = {};
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      const connName = readonly ? `RO_${database}` : `RW_${database}`;
      res.result = this._connectionDict.has(connName);
      return Promise.resolve(res);
    }
    async retrieveConnection(database, readonly) {
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      const connName = readonly ? `RO_${database}` : `RW_${database}`;
      if (this._connectionDict.has(connName)) {
        const conn = this._connectionDict.get(connName);
        if (typeof conn != "undefined")
          return Promise.resolve(conn);
        else {
          return Promise.reject(`Connection ${database} is undefined`);
        }
      } else {
        return Promise.reject(`Connection ${database} does not exist`);
      }
    }
    async getNCDatabasePath(path, database) {
      try {
        const databasePath = await this.sqlite.getNCDatabasePath({
          path,
          database
        });
        return Promise.resolve(databasePath);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async createNCConnection(databasePath, version) {
      try {
        await this.sqlite.createNCConnection({
          databasePath,
          version
        });
        const conn = new SQLiteDBConnection(databasePath, true, this.sqlite);
        const connName = `RO_${databasePath})`;
        this._connectionDict.set(connName, conn);
        return Promise.resolve(conn);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async closeNCConnection(databasePath) {
      try {
        await this.sqlite.closeNCConnection({ databasePath });
        const connName = `RO_${databasePath})`;
        this._connectionDict.delete(connName);
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isNCConnection(databasePath) {
      const res = {};
      const connName = `RO_${databasePath})`;
      res.result = this._connectionDict.has(connName);
      return Promise.resolve(res);
    }
    async retrieveNCConnection(databasePath) {
      if (this._connectionDict.has(databasePath)) {
        const connName = `RO_${databasePath})`;
        const conn = this._connectionDict.get(connName);
        if (typeof conn != "undefined")
          return Promise.resolve(conn);
        else {
          return Promise.reject(`Connection ${databasePath} is undefined`);
        }
      } else {
        return Promise.reject(`Connection ${databasePath} does not exist`);
      }
    }
    async isNCDatabase(databasePath) {
      try {
        const res = await this.sqlite.isNCDatabase({ databasePath });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async retrieveAllConnections() {
      return this._connectionDict;
    }
    async closeAllConnections() {
      const delDict = /* @__PURE__ */ new Map();
      try {
        for (const key of this._connectionDict.keys()) {
          const database = key.substring(3);
          const readonly = key.substring(0, 3) === "RO_" ? true : false;
          await this.sqlite.closeConnection({ database, readonly });
          delDict.set(key, null);
        }
        for (const key of delDict.keys()) {
          this._connectionDict.delete(key);
        }
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async checkConnectionsConsistency() {
      try {
        const keys = [...this._connectionDict.keys()];
        const openModes = [];
        const dbNames = [];
        for (const key of keys) {
          openModes.push(key.substring(0, 2));
          dbNames.push(key.substring(3));
        }
        const res = await this.sqlite.checkConnectionsConsistency({
          dbNames,
          openModes
        });
        if (!res.result)
          this._connectionDict = /* @__PURE__ */ new Map();
        return Promise.resolve(res);
      } catch (err) {
        this._connectionDict = /* @__PURE__ */ new Map();
        return Promise.reject(err);
      }
    }
    async importFromJson(jsonstring) {
      try {
        const ret = await this.sqlite.importFromJson({ jsonstring });
        return Promise.resolve(ret);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isJsonValid(jsonstring) {
      try {
        const ret = await this.sqlite.isJsonValid({ jsonstring });
        return Promise.resolve(ret);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async copyFromAssets(overwrite) {
      const mOverwrite = overwrite != null ? overwrite : true;
      try {
        await this.sqlite.copyFromAssets({ overwrite: mOverwrite });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getFromHTTPRequest(url, overwrite) {
      const mOverwrite = overwrite != null ? overwrite : true;
      try {
        await this.sqlite.getFromHTTPRequest({ url, overwrite: mOverwrite });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isDatabaseEncrypted(database) {
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      try {
        const res = await this.sqlite.isDatabaseEncrypted({ database });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isInConfigEncryption() {
      try {
        const res = await this.sqlite.isInConfigEncryption();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isInConfigBiometricAuth() {
      try {
        const res = await this.sqlite.isInConfigBiometricAuth();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isDatabase(database) {
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      try {
        const res = await this.sqlite.isDatabase({ database });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getDatabaseList() {
      try {
        const res = await this.sqlite.getDatabaseList();
        const values = res.values;
        values.sort();
        const ret = { values };
        return Promise.resolve(ret);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getMigratableDbList(folderPath) {
      const path = folderPath ? folderPath : "default";
      try {
        const res = await this.sqlite.getMigratableDbList({
          folderPath: path
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async addSQLiteSuffix(folderPath, dbNameList) {
      const path = folderPath ? folderPath : "default";
      const dbList = dbNameList ? dbNameList : [];
      try {
        const res = await this.sqlite.addSQLiteSuffix({
          folderPath: path,
          dbNameList: dbList
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async deleteOldDatabases(folderPath, dbNameList) {
      const path = folderPath ? folderPath : "default";
      const dbList = dbNameList ? dbNameList : [];
      try {
        const res = await this.sqlite.deleteOldDatabases({
          folderPath: path,
          dbNameList: dbList
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async moveDatabasesAndAddSuffix(folderPath, dbNameList) {
      const path = folderPath ? folderPath : "default";
      const dbList = dbNameList ? dbNameList : [];
      return this.sqlite.moveDatabasesAndAddSuffix({
        folderPath: path,
        dbNameList: dbList
      });
    }
  };
  var SQLiteDBConnection = class {
    constructor(dbName, readonly, sqlite2) {
      this.dbName = dbName;
      this.readonly = readonly;
      this.sqlite = sqlite2;
    }
    getConnectionDBName() {
      return this.dbName;
    }
    getConnectionReadOnly() {
      return this.readonly;
    }
    async open() {
      try {
        await this.sqlite.open({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async close() {
      try {
        await this.sqlite.close({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async beginTransaction() {
      try {
        const changes = await this.sqlite.beginTransaction({
          database: this.dbName
        });
        return Promise.resolve(changes);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async commitTransaction() {
      try {
        const changes = await this.sqlite.commitTransaction({
          database: this.dbName
        });
        return Promise.resolve(changes);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async rollbackTransaction() {
      try {
        const changes = await this.sqlite.rollbackTransaction({
          database: this.dbName
        });
        return Promise.resolve(changes);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isTransactionActive() {
      try {
        const result = await this.sqlite.isTransactionActive({
          database: this.dbName
        });
        return Promise.resolve(result);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async loadExtension(path) {
      try {
        await this.sqlite.loadExtension({
          database: this.dbName,
          path,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async enableLoadExtension(toggle) {
      try {
        await this.sqlite.enableLoadExtension({
          database: this.dbName,
          toggle,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getUrl() {
      try {
        const res = await this.sqlite.getUrl({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getVersion() {
      try {
        const version = await this.sqlite.getVersion({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(version);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getTableList() {
      try {
        const res = await this.sqlite.getTableList({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async execute(statements, transaction = true, isSQL92 = true) {
      try {
        if (!this.readonly) {
          const res = await this.sqlite.execute({
            database: this.dbName,
            statements,
            transaction,
            readonly: false,
            isSQL92
          });
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async query(statement, values, isSQL92 = true) {
      let res;
      try {
        if (values && values.length > 0) {
          res = await this.sqlite.query({
            database: this.dbName,
            statement,
            values,
            readonly: this.readonly,
            isSQL92: true
          });
        } else {
          res = await this.sqlite.query({
            database: this.dbName,
            statement,
            values: [],
            readonly: this.readonly,
            isSQL92
          });
        }
        res = await this.reorderRows(res);
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async run(statement, values, transaction = true, returnMode = "no", isSQL92 = true) {
      let res;
      try {
        if (!this.readonly) {
          if (values && values.length > 0) {
            res = await this.sqlite.run({
              database: this.dbName,
              statement,
              values,
              transaction,
              readonly: false,
              returnMode,
              isSQL92: true
            });
          } else {
            res = await this.sqlite.run({
              database: this.dbName,
              statement,
              values: [],
              transaction,
              readonly: false,
              returnMode,
              isSQL92
            });
          }
          res.changes = await this.reorderRows(res.changes);
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async executeSet(set, transaction = true, returnMode = "no", isSQL92 = true) {
      let res;
      try {
        if (!this.readonly) {
          res = await this.sqlite.executeSet({
            database: this.dbName,
            set,
            transaction,
            readonly: false,
            returnMode,
            isSQL92
          });
          res.changes = await this.reorderRows(res.changes);
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isExists() {
      try {
        const res = await this.sqlite.isDBExists({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isTable(table) {
      try {
        const res = await this.sqlite.isTableExists({
          database: this.dbName,
          table,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isDBOpen() {
      try {
        const res = await this.sqlite.isDBOpen({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async delete() {
      try {
        if (!this.readonly) {
          await this.sqlite.deleteDatabase({
            database: this.dbName,
            readonly: false
          });
          return Promise.resolve();
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async createSyncTable() {
      try {
        if (!this.readonly) {
          const res = await this.sqlite.createSyncTable({
            database: this.dbName,
            readonly: false
          });
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async setSyncDate(syncdate) {
      try {
        if (!this.readonly) {
          await this.sqlite.setSyncDate({
            database: this.dbName,
            syncdate,
            readonly: false
          });
          return Promise.resolve();
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getSyncDate() {
      try {
        const res = await this.sqlite.getSyncDate({
          database: this.dbName,
          readonly: this.readonly
        });
        let retDate = "";
        if (res.syncDate > 0)
          retDate = new Date(res.syncDate * 1e3).toISOString();
        return Promise.resolve(retDate);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async exportToJson(mode, encrypted = false) {
      try {
        const res = await this.sqlite.exportToJson({
          database: this.dbName,
          jsonexportmode: mode,
          readonly: this.readonly,
          encrypted
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async deleteExportedRows() {
      try {
        if (!this.readonly) {
          await this.sqlite.deleteExportedRows({
            database: this.dbName,
            readonly: false
          });
          return Promise.resolve();
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async executeTransaction(txn, isSQL92 = true) {
      let changes = 0;
      let isActive = false;
      if (!this.readonly) {
        await this.sqlite.beginTransaction({
          database: this.dbName
        });
        isActive = await this.sqlite.isTransactionActive({
          database: this.dbName
        });
        if (!isActive) {
          return Promise.reject("After Begin Transaction, no transaction active");
        }
        try {
          for (const task of txn) {
            if (typeof task !== "object" || !("statement" in task)) {
              throw new Error("Error a task.statement must be provided");
            }
            if ("values" in task && task.values && task.values.length > 0) {
              const retMode = task.statement.toUpperCase().includes("RETURNING") ? "all" : "no";
              const ret = await this.sqlite.run({
                database: this.dbName,
                statement: task.statement,
                values: task.values,
                transaction: false,
                readonly: false,
                returnMode: retMode,
                isSQL92
              });
              if (ret.changes.changes < 0) {
                throw new Error("Error in transaction method run ");
              }
              changes += ret.changes.changes;
            } else {
              const ret = await this.sqlite.execute({
                database: this.dbName,
                statements: task.statement,
                transaction: false,
                readonly: false
              });
              if (ret.changes.changes < 0) {
                throw new Error("Error in transaction method execute ");
              }
              changes += ret.changes.changes;
            }
          }
          const retC = await this.sqlite.commitTransaction({
            database: this.dbName
          });
          changes += retC.changes.changes;
          const retChanges = { changes: { changes } };
          return Promise.resolve(retChanges);
        } catch (err) {
          const msg = err.message ? err.message : err;
          await this.sqlite.rollbackTransaction({
            database: this.dbName
          });
          return Promise.reject(msg);
        }
      } else {
        return Promise.reject("not allowed in read-only mode");
      }
    }
    async reorderRows(res) {
      const retRes = res;
      if (res?.values && typeof res.values[0] === "object") {
        if (Object.keys(res.values[0]).includes("ios_columns")) {
          const columnList = res.values[0]["ios_columns"];
          const iosRes = [];
          for (let i = 1; i < res.values.length; i++) {
            const rowJson = res.values[i];
            const resRowJson = {};
            for (const item of columnList) {
              resRowJson[item] = rowJson[item];
            }
            iosRes.push(resRowJson);
          }
          retRes["values"] = iosRes;
        }
      }
      return Promise.resolve(retRes);
    }
  };

  // node_modules/@capacitor-community/sqlite/dist/esm/index.js
  var CapacitorSQLite = registerPlugin("CapacitorSQLite", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.CapacitorSQLiteWeb()),
    electron: () => window.CapacitorCustomPlatform.plugins.CapacitorSQLite
  });

  // node_modules/@capacitor/filesystem/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor/synapse/dist/synapse.mjs
  function s(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return new Proxy({}, {
            get(w, o) {
              return (c, p, r) => {
                const i = t.Capacitor.Plugins[n];
                if (i === void 0) {
                  r(new Error(`Capacitor plugin ${n} not found`));
                  return;
                }
                if (typeof i[o] != "function") {
                  r(new Error(`Method ${o} not found in Capacitor plugin ${n}`));
                  return;
                }
                (async () => {
                  try {
                    const a = await i[o](c);
                    p(a);
                  } catch (a) {
                    r(a);
                  }
                })();
              };
            }
          });
        }
      }
    );
  }
  function u(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return t.cordova.plugins[n];
        }
      }
    );
  }
  function f(t = false) {
    typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !t ? s(window) : window.cordova !== void 0 && u(window));
  }

  // node_modules/@capacitor/filesystem/dist/esm/index.js
  init_definitions();
  var Filesystem = registerPlugin("Filesystem", {
    web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.FilesystemWeb())
  });
  f();

  // src/native-store.js
  var DATABASE = "shenzhen_home_tools";
  var CHECKLIST_BROWSER_KEY = "shenzhen-purchase-checklist-v1";
  var MORTGAGE_BROWSER_KEY = "sz-mortgage-calculator-state";
  var VIEWINGS_BROWSER_KEY = "shenzhen-viewing-records-v1";
  var VIEWING_DIAGNOSTICS_KEY = "anjia-viewing-diagnostics-v1";
  var db;
  var sqlite;
  var readyPromise;
  var viewingCache;
  var viewingDiagnostics = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VIEWING_DIAGNOSTICS_KEY) || "[]");
      return Array.isArray(saved) ? saved.slice(-30) : [];
    } catch {
      return [];
    }
  })();
  var BackupFile = registerPlugin("BackupFile");
  var PhotoLibrary = registerPlugin("PhotoLibrary");
  var BROWSER_IMAGE_DATABASE = "shenzhen-viewing-images-v1";
  var BROWSER_IMAGE_STORE = "images";
  function recordViewingDiagnostic(event, details = {}) {
    viewingDiagnostics.push({
      at: (/* @__PURE__ */ new Date()).toISOString(),
      event,
      platform: Capacitor.getPlatform(),
      ...details
    });
    if (viewingDiagnostics.length > 30) viewingDiagnostics.splice(0, viewingDiagnostics.length - 30);
    try {
      localStorage.setItem(VIEWING_DIAGNOSTICS_KEY, JSON.stringify(viewingDiagnostics));
    } catch (_) {
    }
  }
  function viewingDiagnosticsText() {
    return JSON.stringify(viewingDiagnostics, null, 2);
  }
  function clearViewingDiagnostics() {
    viewingDiagnostics = [];
    try {
      localStorage.removeItem(VIEWING_DIAGNOSTICS_KEY);
    } catch (_) {
    }
  }
  async function resetViewingConnection() {
    const activeSqlite = sqlite;
    try {
      if (activeSqlite) {
        const state = await activeSqlite.isConnection(DATABASE, false);
        recordViewingDiagnostic("connection-state-before-reset", { connected: Boolean(state?.result) });
        if (state?.result) {
          await activeSqlite.closeConnection(DATABASE, false);
          recordViewingDiagnostic("connection-closed");
        }
      }
    } catch (error) {
      recordViewingDiagnostic("connection-close-failed", { message: String(error?.message || error) });
      try {
        await activeSqlite?.closeAllConnections();
        recordViewingDiagnostic("all-connections-closed");
      } catch (fallbackError) {
        recordViewingDiagnostic("all-connections-close-failed", { message: String(fallbackError?.message || fallbackError) });
      }
    } finally {
      db = null;
      sqlite = null;
      readyPromise = null;
      viewingCache = null;
    }
  }
  function dataUrlPayload(dataUrl) {
    return dataUrl.split(",", 2)[1] || "";
  }
  function blobToDataUrl(blob) {
    return new Promise((resolve2, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve2(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("\u65E0\u6CD5\u8BFB\u53D6\u56FE\u7247"));
      reader.readAsDataURL(blob);
    });
  }
  function browserImageStore(mode, action) {
    return new Promise((resolve2, reject) => {
      const request = indexedDB.open(BROWSER_IMAGE_DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(BROWSER_IMAGE_STORE);
      request.onerror = () => reject(request.error || new Error("\u65E0\u6CD5\u6253\u5F00\u6D4F\u89C8\u5668\u56FE\u7247\u5E93"));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(BROWSER_IMAGE_STORE, mode);
        try {
          action(transaction.objectStore(BROWSER_IMAGE_STORE));
        } catch (error) {
          database.close();
          reject(error);
          return;
        }
        transaction.oncomplete = () => {
          database.close();
          resolve2();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error("\u6D4F\u89C8\u5668\u56FE\u7247\u5E93\u64CD\u4F5C\u5931\u8D25"));
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("\u6D4F\u89C8\u5668\u56FE\u7247\u5E93\u64CD\u4F5C\u5931\u8D25"));
        };
      };
    });
  }
  function imageRefsForRecord(record) {
    try {
      const refs = JSON.parse(record?.imageRefs || "[]");
      return Array.isArray(refs) ? refs : [];
    } catch {
      return [];
    }
  }
  async function makeThumbnail(blob) {
    const sourceUrl = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve2, reject) => {
        const element = new Image();
        element.onload = () => resolve2(element);
        element.onerror = () => reject(new Error("\u65E0\u6CD5\u751F\u6210\u56FE\u7247\u7F29\u7565\u56FE"));
        element.src = sourceUrl;
      });
      const longestEdge = Math.max(image.naturalWidth, image.naturalHeight) || 1;
      const scale = Math.min(1, 480 / longestEdge);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const thumbnail = await new Promise((resolve2) => canvas.toBlob(resolve2, "image/jpeg", 0.78));
      if (!thumbnail) throw new Error("\u65E0\u6CD5\u751F\u6210\u56FE\u7247\u7F29\u7565\u56FE");
      return { blob: thumbnail, width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }
  async function removePrivateFile(path) {
    if (!path || !isNative()) return;
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch {
    }
  }
  var schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS viewing_records (
    id TEXT PRIMARY KEY NOT NULL,
    community TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    viewed_at TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    data_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS viewing_photos (
    id TEXT PRIMARY KEY NOT NULL,
    record_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (record_id) REFERENCES viewing_records(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS checklist_items (
    item_id TEXT PRIMARY KEY NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    is_open INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mortgage_schemes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL DEFAULT '\u5F53\u524D\u65B9\u6848',
    data_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS school_saved_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_type TEXT NOT NULL CHECK (list_type IN ('recent', 'favorite')),
    mode TEXT NOT NULL CHECK (mode IN ('community', 'school')),
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (list_type, mode, value)
  );
  CREATE TABLE IF NOT EXISTS app_json (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_viewing_photos_record
    ON viewing_photos(record_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_school_saved_queries_list
    ON school_saved_queries(list_type, mode, created_at DESC);
`;
  function browserJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }
  function browserSchoolDatasetStore(mode, action) {
    return new Promise((resolve2, reject) => {
      const request = indexedDB.open("anjia-school-district-data-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("dataset");
      request.onerror = () => reject(request.error || new Error("\u65E0\u6CD5\u6253\u5F00\u5B66\u533A\u6570\u636E\u7F13\u5B58"));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("dataset", mode);
        const store = transaction.objectStore("dataset");
        let result;
        try {
          result = action(store);
        } catch (error) {
          database.close();
          reject(error);
          return;
        }
        transaction.oncomplete = () => {
          database.close();
          resolve2(result?.result);
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || result?.error);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("\u5B66\u533A\u6570\u636E\u7F13\u5B58\u5931\u8D25"));
        };
      };
    });
  }
  function isNative() {
    return Capacitor.isNativePlatform();
  }
  async function openNativeDatabase() {
    if (db) return db;
    sqlite = new SQLiteConnection(CapacitorSQLite);
    const consistency = await sqlite.checkConnectionsConsistency();
    const connectionExists = await sqlite.isConnection(DATABASE, false);
    db = consistency.result && connectionExists.result ? await sqlite.retrieveConnection(DATABASE, false) : await sqlite.createConnection(DATABASE, false, "no-encryption", 1, false);
    await db.open();
    await db.execute(schema, false);
    await db.run(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ["schema_version", "1", Date.now()],
      false
    );
    return db;
  }
  async function ready() {
    if (!isNative()) return null;
    if (!readyPromise) {
      readyPromise = openNativeDatabase().catch((error) => {
        readyPromise = null;
        db = null;
        throw error;
      });
    }
    return readyPromise;
  }
  async function getChecklistState() {
    if (!isNative()) return browserJson(CHECKLIST_BROWSER_KEY, {});
    const connection = await ready();
    const result = await connection.query(
      "SELECT item_id, done, note, is_open FROM checklist_items ORDER BY item_id"
    );
    return (result.values || []).reduce((state, row) => {
      state[row.item_id] = {
        done: Boolean(row.done),
        note: row.note || "",
        open: Boolean(row.is_open)
      };
      return state;
    }, {});
  }
  async function saveChecklistState(state) {
    if (!isNative()) {
      localStorage.setItem(CHECKLIST_BROWSER_KEY, JSON.stringify(state));
      return;
    }
    const connection = await ready();
    const now = Date.now();
    await connection.beginTransaction();
    try {
      await connection.run("DELETE FROM checklist_items", [], false);
      for (const [itemId, item] of Object.entries(state)) {
        await connection.run(
          `INSERT INTO checklist_items (item_id, done, note, is_open, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
          [itemId, item.done ? 1 : 0, item.note || "", item.open ? 1 : 0, now],
          false
        );
      }
      await connection.commitTransaction();
    } catch (error) {
      await connection.rollbackTransaction();
      throw error;
    }
  }
  async function getMortgageCurrent() {
    if (!isNative()) return browserJson(MORTGAGE_BROWSER_KEY, null);
    const connection = await ready();
    const result = await connection.query(
      "SELECT data_json FROM mortgage_schemes WHERE id = ?",
      ["current"]
    );
    const serialized = result.values?.[0]?.data_json;
    try {
      return serialized ? JSON.parse(serialized) : null;
    } catch {
      return null;
    }
  }
  async function saveMortgageCurrent(state) {
    if (!isNative()) {
      localStorage.setItem(MORTGAGE_BROWSER_KEY, JSON.stringify(state));
      return;
    }
    const now = Date.now();
    const connection = await ready();
    await connection.run(
      `INSERT INTO mortgage_schemes (id, name, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
      ["current", "\u5F53\u524D\u65B9\u6848", JSON.stringify(state), now, now],
      false
    );
  }
  async function getSchoolSaved(type, mode) {
    const key = `sz-school-district-${type}-${mode}-v1`;
    if (!isNative()) return browserJson(key, []);
    const connection = await ready();
    const result = await connection.query(
      `SELECT mode, value FROM school_saved_queries
     WHERE list_type = ? AND mode = ? ORDER BY created_at DESC`,
      [type, mode]
    );
    return (result.values || []).map((row) => ({ mode: row.mode, value: row.value }));
  }
  async function saveSchoolSaved(type, mode, rows) {
    const key = `sz-school-district-${type}-${mode}-v1`;
    if (!isNative()) {
      localStorage.setItem(key, JSON.stringify(rows));
      return;
    }
    const connection = await ready();
    await connection.beginTransaction();
    try {
      await connection.run(
        "DELETE FROM school_saved_queries WHERE list_type = ? AND mode = ?",
        [type, mode],
        false
      );
      const base = Date.now();
      for (const [index, row] of rows.entries()) {
        await connection.run(
          `INSERT INTO school_saved_queries (list_type, mode, value, created_at)
         VALUES (?, ?, ?, ?)`,
          [type, mode, row.value, base - index],
          false
        );
      }
      await connection.commitTransaction();
    } catch (error) {
      await connection.rollbackTransaction();
      throw error;
    }
  }
  async function getSchoolDistrictDataset() {
    if (!isNative()) {
      try {
        return await browserSchoolDatasetStore("readonly", (store) => store.get("current"));
      } catch (_) {
        return null;
      }
    }
    const connection = await ready();
    const result = await connection.query("SELECT value FROM app_json WHERE key = ?", ["school_district_dataset"]);
    try {
      return result.values?.[0]?.value ? JSON.parse(result.values[0].value) : null;
    } catch (_) {
      return null;
    }
  }
  async function saveSchoolDistrictDataset(dataset) {
    if (!dataset || !Array.isArray(dataset.schools)) throw new Error("\u5B66\u533A\u6570\u636E\u683C\u5F0F\u4E0D\u6B63\u786E");
    if (!isNative()) {
      await browserSchoolDatasetStore("readwrite", (store) => store.put(dataset, "current"));
      return;
    }
    const connection = await ready();
    const now = Date.now();
    await connection.run(
      `INSERT INTO app_json (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ["school_district_dataset", JSON.stringify(dataset), now],
      false
    );
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  async function getViewingRecords(options = {}) {
    const force = options?.force === true;
    if (viewingCache && !force) {
      recordViewingDiagnostic("records-cache-hit", { count: viewingCache.length });
      return clone(viewingCache);
    }
    if (force) viewingCache = null;
    if (!isNative()) {
      viewingCache = browserJson(VIEWINGS_BROWSER_KEY, []);
      recordViewingDiagnostic("records-browser-read", { count: viewingCache.length });
      return clone(viewingCache);
    }
    const queryRecords = async () => {
      const connection = await ready();
      return connection.query(
        "SELECT id, created_at, updated_at, data_json FROM viewing_records ORDER BY updated_at DESC"
      );
    };
    let result;
    try {
      result = await queryRecords();
      recordViewingDiagnostic("records-native-read", { attempt: 1, count: result.values?.length || 0 });
    } catch (error) {
      recordViewingDiagnostic("records-native-read-failed", { attempt: 1, message: String(error?.message || error) });
      await resetViewingConnection();
      try {
        result = await queryRecords();
        recordViewingDiagnostic("records-native-read", { attempt: 2, count: result.values?.length || 0 });
      } catch (retryError) {
        recordViewingDiagnostic("records-native-read-failed", { attempt: 2, message: String(retryError?.message || retryError) });
        throw retryError;
      }
    }
    viewingCache = (result.values || []).map((row) => {
      try {
        return {
          ...JSON.parse(row.data_json),
          id: row.id,
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at)
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    return clone(viewingCache);
  }
  function viewingRecordsJson() {
    return JSON.stringify(viewingCache || []);
  }
  async function saveViewingRecords(records) {
    const cleanRecords = Array.isArray(records) ? records.filter((record) => record && record.id && String(record.community || "").trim()) : [];
    viewingCache = clone(cleanRecords);
    if (!isNative()) {
      localStorage.setItem(VIEWINGS_BROWSER_KEY, JSON.stringify(viewingCache));
      return;
    }
    const connection = await ready();
    const now = Date.now();
    const filesToRemove = [];
    await connection.beginTransaction();
    try {
      const existing = await connection.query("SELECT id FROM viewing_records");
      const incomingIds = new Set(cleanRecords.map((record) => String(record.id)));
      for (const row of existing.values || []) {
        if (!incomingIds.has(String(row.id))) {
          const photos = await connection.query(
            "SELECT file_path, thumbnail_path FROM viewing_photos WHERE record_id = ?",
            [row.id]
          );
          for (const photo of photos.values || []) {
            filesToRemove.push(photo.file_path, photo.thumbnail_path);
          }
          await connection.run("DELETE FROM viewing_records WHERE id = ?", [row.id], false);
        }
      }
      for (const record of cleanRecords) {
        const createdAt = Number(record.createdAt || record.updatedAt || now);
        const updatedAt = Number(record.updatedAt || now);
        await connection.run(
          `INSERT INTO viewing_records (id, community, priority, viewed_at, created_at, updated_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET community = excluded.community, priority = excluded.priority,
           viewed_at = excluded.viewed_at, updated_at = excluded.updated_at, data_json = excluded.data_json`,
          [
            String(record.id),
            String(record.community).trim(),
            record.priority || "normal",
            record.viewedAt || null,
            createdAt,
            updatedAt,
            JSON.stringify(record)
          ],
          false
        );
        const imageRefs = (() => {
          try {
            const parsed = JSON.parse(record.imageRefs || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const currentPhotos = await connection.query(
          "SELECT id, file_path, thumbnail_path FROM viewing_photos WHERE record_id = ?",
          [String(record.id)]
        );
        const imageIds = new Set(imageRefs.map((ref) => String(ref.id)));
        for (const photo of currentPhotos.values || []) {
          if (!imageIds.has(String(photo.id))) {
            filesToRemove.push(photo.file_path, photo.thumbnail_path);
            await connection.run("DELETE FROM viewing_photos WHERE id = ?", [photo.id], false);
          }
        }
        for (const [index, ref] of imageRefs.entries()) {
          if (!ref?.id || !ref.filePath || !ref.thumbnailPath) continue;
          await connection.run(
            `INSERT INTO viewing_photos
             (id, record_id, file_path, thumbnail_path, original_name, mime_type, width, height, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET record_id = excluded.record_id, file_path = excluded.file_path,
             thumbnail_path = excluded.thumbnail_path, original_name = excluded.original_name,
             mime_type = excluded.mime_type, width = excluded.width, height = excluded.height,
             sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
            [
              String(ref.id),
              String(record.id),
              ref.filePath,
              ref.thumbnailPath,
              ref.name || null,
              ref.type || "image/jpeg",
              Number(ref.width || 0) || null,
              Number(ref.height || 0) || null,
              index,
              Number(ref.createdAt || now),
              now
            ],
            false
          );
        }
      }
      await connection.commitTransaction();
    } catch (error) {
      await connection.rollbackTransaction();
      throw error;
    }
    await Promise.all(filesToRemove.map(removePrivateFile));
  }
  async function deleteViewingRecord(recordId) {
    const records = await getViewingRecords();
    const record = records.find((item) => String(item.id) === String(recordId));
    if (!record) return false;
    const remaining = records.filter((item) => String(item.id) !== String(recordId));
    if (!isNative()) {
      const ids = imageRefsForRecord(record).map((ref) => ref?.id).filter(Boolean);
      if (ids.length) await browserImageStore("readwrite", (store) => ids.forEach((id) => store.delete(id)));
    }
    await saveViewingRecords(remaining);
    return true;
  }
  function setViewingRecordsJson(serialized) {
    try {
      const records = JSON.parse(serialized);
      void saveViewingRecords(records);
    } catch {
    }
  }
  async function storeViewingImage(recordId, photoId, file) {
    if (!recordId || !photoId || !file) throw new Error("\u7F3A\u5C11\u56FE\u7247\u6216\u770B\u623F\u8BB0\u5F55\u6807\u8BC6");
    if (!isNative()) return { id: photoId, name: file.name, type: file.type, createdAt: Date.now() };
    const basePath = `viewings/${String(recordId)}/${String(photoId)}`;
    const originalPath = `${basePath}.original`;
    const thumbnailPath = `${basePath}.thumb.jpg`;
    const thumbnail = await makeThumbnail(file);
    await Filesystem.writeFile({
      path: originalPath,
      data: dataUrlPayload(await blobToDataUrl(file)),
      directory: Directory.Data,
      recursive: true
    });
    await Filesystem.writeFile({
      path: thumbnailPath,
      data: dataUrlPayload(await blobToDataUrl(thumbnail.blob)),
      directory: Directory.Data,
      recursive: true
    });
    return {
      id: photoId,
      name: file.name || "\u623F\u6E90\u56FE\u7247",
      type: file.type || "image/jpeg",
      filePath: originalPath,
      thumbnailPath,
      width: thumbnail.width,
      height: thumbnail.height,
      size: Number(file.size || 0),
      createdAt: Date.now()
    };
  }
  async function getViewingImage(ref, thumbnail = true) {
    if (!isNative()) return null;
    const path = thumbnail ? ref?.thumbnailPath : ref?.filePath;
    const mimeType = thumbnail ? "image/jpeg" : ref?.type || "image/jpeg";
    if (!path) return null;
    const result = await Filesystem.readFile({ path, directory: Directory.Data });
    const response = await fetch(`data:${mimeType};base64,${result.data}`);
    return response.blob();
  }
  async function getViewingImageSize(ref) {
    if (!isNative()) return Number(ref?.size || 0);
    if (Number(ref?.size || 0) > 0) return Number(ref.size);
    if (!ref?.filePath) return 0;
    try {
      const result = await Filesystem.stat({ path: ref.filePath, directory: Directory.Data });
      return Number(result.size || 0);
    } catch {
      return 0;
    }
  }
  async function deleteViewingImage(ref) {
    if (!isNative()) return;
    await Promise.all([removePrivateFile(ref?.filePath), removePrivateFile(ref?.thumbnailPath)]);
  }
  async function saveViewingImagesToDevice(images) {
    if (!isNative()) return false;
    const payload = await Promise.all(images.map(async (image) => ({
      filename: image.name || `\u623F\u6E90\u56FE\u7247-${Date.now()}.jpg`,
      mimeType: image.type || image.blob?.type || "image/jpeg",
      data: dataUrlPayload(await blobToDataUrl(image.blob))
    })));
    if (Capacitor.getPlatform() === "android") await BackupFile.saveImages({ images: payload });
    else if (Capacitor.getPlatform() === "ios") await PhotoLibrary.saveImages({ images: payload });
    else return false;
    return true;
  }
  async function readPrivateFile(path) {
    if (!isNative() || !path) throw new Error("\u65E0\u6CD5\u8BFB\u53D6\u5907\u4EFD\u6587\u4EF6");
    return Filesystem.readFile({ path, directory: Directory.Data });
  }
  async function writePrivateFile(path, data) {
    if (!isNative() || !path || path.startsWith("/") || path.includes("..")) {
      throw new Error("\u5907\u4EFD\u6587\u4EF6\u8DEF\u5F84\u4E0D\u5408\u6CD5");
    }
    await Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true });
  }
  async function getBackupData() {
    if (!isNative()) {
      return {
        records: await getViewingRecords(),
        photos: [],
        checklist: await getChecklistState(),
        mortgage: await getMortgageCurrent(),
        school: {
          recentCommunity: await getSchoolSaved("recent", "community"),
          recentSchool: await getSchoolSaved("recent", "school"),
          favoriteCommunity: await getSchoolSaved("favorite", "community"),
          favoriteSchool: await getSchoolSaved("favorite", "school")
        }
      };
    }
    const connection = await ready();
    const [records, photos, checklist, mortgage, school] = await Promise.all([
      getViewingRecords(),
      connection.query("SELECT * FROM viewing_photos ORDER BY record_id, sort_order"),
      connection.query("SELECT item_id, done, note, is_open FROM checklist_items"),
      connection.query("SELECT id, name, data_json, created_at, updated_at FROM mortgage_schemes"),
      connection.query("SELECT list_type, mode, value, created_at FROM school_saved_queries ORDER BY created_at DESC")
    ]);
    return {
      records,
      photos: (photos.values || []).map((row) => ({
        id: row.id,
        recordId: row.record_id,
        filePath: row.file_path,
        thumbnailPath: row.thumbnail_path,
        name: row.original_name,
        type: row.mime_type,
        width: row.width,
        height: row.height,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      checklist: (checklist.values || []).reduce((state, row) => {
        state[row.item_id] = { done: Boolean(row.done), note: row.note || "", open: Boolean(row.is_open) };
        return state;
      }, {}),
      mortgage: (mortgage.values || []).map((row) => ({
        id: row.id,
        name: row.name,
        data: JSON.parse(row.data_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      school: school.values || []
    };
  }
  async function restoreBackupData(data) {
    if (!isNative()) throw new Error("\u5B8C\u6574\u6062\u590D\u4EC5\u5728\u539F\u751F App \u4E2D\u53EF\u7528");
    const records = Array.isArray(data?.records) ? data.records : [];
    const photos = Array.isArray(data?.photos) ? data.photos : [];
    const connection = await ready();
    const existingPhotos = await connection.query("SELECT file_path, thumbnail_path FROM viewing_photos");
    await connection.beginTransaction();
    try {
      await connection.run("DELETE FROM viewing_photos", [], false);
      await connection.run("DELETE FROM viewing_records", [], false);
      await connection.run("DELETE FROM checklist_items", [], false);
      await connection.run("DELETE FROM mortgage_schemes", [], false);
      await connection.run("DELETE FROM school_saved_queries", [], false);
      const now = Date.now();
      const photosByRecord = /* @__PURE__ */ new Map();
      for (const photo of photos) {
        if (!photo?.id || !photo?.recordId || !photo.filePath || !photo.thumbnailPath) continue;
        const ref = {
          id: String(photo.id),
          name: photo.name || "\u623F\u6E90\u56FE\u7247",
          type: photo.type || "image/jpeg",
          filePath: photo.filePath,
          thumbnailPath: photo.thumbnailPath,
          width: photo.width || null,
          height: photo.height || null,
          sortOrder: Number(photo.sortOrder || 0),
          createdAt: Number(photo.createdAt || now)
        };
        const list = photosByRecord.get(String(photo.recordId)) || [];
        list.push(ref);
        photosByRecord.set(String(photo.recordId), list);
      }
      for (const record of records) {
        if (!record?.id || !String(record.community || "").trim()) continue;
        const imageRefs = (photosByRecord.get(String(record.id)) || []).sort(
          (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
        );
        const restored = { ...record, imageRefs: JSON.stringify(imageRefs) };
        await connection.run(
          `INSERT INTO viewing_records (id, community, priority, viewed_at, created_at, updated_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            restored.id,
            restored.community,
            restored.priority || "normal",
            restored.viewedAt || null,
            Number(restored.createdAt || now),
            Number(restored.updatedAt || now),
            JSON.stringify(restored)
          ],
          false
        );
      }
      for (const photo of photos) {
        if (!photo?.id || !photo?.recordId || !photo.filePath || !photo.thumbnailPath) continue;
        await connection.run(
          `INSERT INTO viewing_photos
           (id, record_id, file_path, thumbnail_path, original_name, mime_type, width, height, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            photo.id,
            photo.recordId,
            photo.filePath,
            photo.thumbnailPath,
            photo.name || null,
            photo.type || "image/jpeg",
            photo.width || null,
            photo.height || null,
            photo.sortOrder || 0,
            Number(photo.createdAt || now),
            Number(photo.updatedAt || now)
          ],
          false
        );
      }
      for (const [itemId, item] of Object.entries(data?.checklist || {})) {
        await connection.run(
          "INSERT INTO checklist_items (item_id, done, note, is_open, updated_at) VALUES (?, ?, ?, ?, ?)",
          [itemId, item.done ? 1 : 0, item.note || "", item.open ? 1 : 0, now],
          false
        );
      }
      for (const scheme of Array.isArray(data?.mortgage) ? data.mortgage : []) {
        if (!scheme?.id || !scheme.data) continue;
        await connection.run(
          "INSERT INTO mortgage_schemes (id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          [scheme.id, scheme.name || "\u5F53\u524D\u65B9\u6848", JSON.stringify(scheme.data), Number(scheme.createdAt || now), Number(scheme.updatedAt || now)],
          false
        );
      }
      for (const row of Array.isArray(data?.school) ? data.school : []) {
        if (!row?.list_type || !row?.mode || !row?.value) continue;
        await connection.run(
          "INSERT INTO school_saved_queries (list_type, mode, value, created_at) VALUES (?, ?, ?, ?)",
          [row.list_type, row.mode, row.value, Number(row.created_at || now)],
          false
        );
      }
      await connection.commitTransaction();
      viewingCache = null;
    } catch (error) {
      await connection.rollbackTransaction();
      throw error;
    }
    await Promise.all((existingPhotos.values || []).flatMap((photo) => [
      removePrivateFile(photo.file_path),
      removePrivateFile(photo.thumbnail_path)
    ]));
  }
  async function mergeBackupData(data) {
    if (!isNative()) throw new Error("\u589E\u91CF\u5BFC\u5165\u4EC5\u5728\u539F\u751F App \u4E2D\u53EF\u7528");
    const records = (Array.isArray(data?.records) ? data.records : []).filter(
      (record) => record?.id && String(record.community || "").trim()
    );
    const recordIds = new Set(records.map((record) => String(record.id)));
    const photos = (Array.isArray(data?.photos) ? data.photos : []).filter(
      (photo) => photo?.id && recordIds.has(String(photo.recordId)) && photo.filePath && photo.thumbnailPath
    );
    const connection = await ready();
    const previousPhotos = recordIds.size ? await connection.query(`SELECT file_path, thumbnail_path FROM viewing_photos WHERE record_id IN (${[...recordIds].map(() => "?").join(",")})`, [...recordIds]) : { values: [] };
    const now = Date.now();
    const photosByRecord = /* @__PURE__ */ new Map();
    for (const photo of photos) {
      const ref = {
        id: String(photo.id),
        name: photo.name || "\u623F\u6E90\u56FE\u7247",
        type: photo.type || "image/jpeg",
        filePath: photo.filePath,
        thumbnailPath: photo.thumbnailPath,
        width: photo.width || null,
        height: photo.height || null,
        sortOrder: Number(photo.sortOrder || 0),
        createdAt: Number(photo.createdAt || now)
      };
      const list = photosByRecord.get(String(photo.recordId)) || [];
      list.push(ref);
      photosByRecord.set(String(photo.recordId), list);
    }
    await connection.beginTransaction();
    try {
      for (const id of recordIds) {
        await connection.run("DELETE FROM viewing_photos WHERE record_id = ?", [id], false);
        await connection.run("DELETE FROM viewing_records WHERE id = ?", [id], false);
      }
      for (const record of records) {
        const imageRefs = (photosByRecord.get(String(record.id)) || []).sort(
          (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
        );
        const restored = { ...record, imageRefs: JSON.stringify(imageRefs) };
        await connection.run(
          `INSERT INTO viewing_records (id, community, priority, viewed_at, created_at, updated_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            restored.id,
            restored.community,
            restored.priority || "normal",
            restored.viewedAt || null,
            Number(restored.createdAt || now),
            Number(restored.updatedAt || now),
            JSON.stringify(restored)
          ],
          false
        );
      }
      for (const photo of photos) {
        await connection.run(
          `INSERT INTO viewing_photos
           (id, record_id, file_path, thumbnail_path, original_name, mime_type, width, height, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            photo.id,
            photo.recordId,
            photo.filePath,
            photo.thumbnailPath,
            photo.name || null,
            photo.type || "image/jpeg",
            photo.width || null,
            photo.height || null,
            photo.sortOrder || 0,
            Number(photo.createdAt || now),
            Number(photo.updatedAt || now)
          ],
          false
        );
      }
      const checklistRows = await connection.query("SELECT item_id FROM checklist_items");
      const checklistIds = new Set((checklistRows.values || []).map((row) => String(row.item_id)));
      for (const [itemId, item] of Object.entries(data?.checklist || {})) {
        if (checklistIds.has(String(itemId))) continue;
        await connection.run(
          "INSERT INTO checklist_items (item_id, done, note, is_open, updated_at) VALUES (?, ?, ?, ?, ?)",
          [itemId, item.done ? 1 : 0, item.note || "", item.open ? 1 : 0, now],
          false
        );
      }
      const schemeRows = await connection.query("SELECT id, updated_at FROM mortgage_schemes");
      const schemes = new Map((schemeRows.values || []).map((row) => [String(row.id), Number(row.updated_at || 0)]));
      for (const scheme of Array.isArray(data?.mortgage) ? data.mortgage : []) {
        if (!scheme?.id || !scheme.data) continue;
        const incoming = Number(scheme.updatedAt || scheme.createdAt || 0);
        if (schemes.has(String(scheme.id)) && incoming <= schemes.get(String(scheme.id))) continue;
        await connection.run("DELETE FROM mortgage_schemes WHERE id = ?", [scheme.id], false);
        await connection.run(
          "INSERT INTO mortgage_schemes (id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          [scheme.id, scheme.name || "\u5F53\u524D\u65B9\u6848", JSON.stringify(scheme.data), Number(scheme.createdAt || now), Number(scheme.updatedAt || now)],
          false
        );
      }
      const schoolRows = await connection.query("SELECT list_type, mode, value FROM school_saved_queries");
      const schoolKeys = new Set((schoolRows.values || []).map((row) => `${row.list_type}::${row.mode}::${row.value}`));
      for (const row of Array.isArray(data?.school) ? data.school : []) {
        if (!row?.list_type || !row?.mode || !row?.value) continue;
        const key = `${row.list_type}::${row.mode}::${row.value}`;
        if (schoolKeys.has(key)) continue;
        await connection.run(
          "INSERT INTO school_saved_queries (list_type, mode, value, created_at) VALUES (?, ?, ?, ?)",
          [row.list_type, row.mode, row.value, Number(row.created_at || now)],
          false
        );
      }
      await connection.commitTransaction();
      viewingCache = null;
    } catch (error) {
      await connection.rollbackTransaction();
      throw error;
    }
    await Promise.all((previousPhotos.values || []).flatMap((photo) => [
      removePrivateFile(photo.file_path),
      removePrivateFile(photo.thumbnail_path)
    ]));
    return { records: records.length };
  }
  window.NativeStore = {
    isNative,
    ready,
    getChecklistState,
    saveChecklistState,
    getMortgageCurrent,
    saveMortgageCurrent,
    getSchoolSaved,
    saveSchoolSaved,
    getSchoolDistrictDataset,
    saveSchoolDistrictDataset,
    getViewingRecords,
    addViewingDiagnostic: recordViewingDiagnostic,
    getViewingDiagnostics: viewingDiagnosticsText,
    clearViewingDiagnostics,
    saveViewingRecords,
    deleteViewingRecord,
    viewingRecordsJson,
    setViewingRecordsJson,
    storeViewingImage,
    getViewingImage,
    getViewingImageSize,
    deleteViewingImage,
    saveViewingImagesToDevice,
    readPrivateFile,
    writePrivateFile,
    getBackupData,
    restoreBackupData,
    mergeBackupData
  };
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
