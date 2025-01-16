// compatible node imports
import { opendir } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { createServer } from "node:http";
// type imports
import { type IncomingMessage, type ServerResponse } from "node:http";
import {
  type allowedMethods,
  type HTTPBody,
  type JetFunc,
  type jetOptions,
  type methods,
} from "./types.js";
import { Context, type JetPlugin, Log } from "./classes.js";

/**
 * an inbuilt CORS post hook
 *
 * @param {Object} [options] cors options
 *    @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/Planned_changes
 *  - {Boolean} privateNetworkAccess handle `Access-Control-Request-Private-Network` request by return `Access-Control-Allow-Private-Network`, default to false
 *    @see https://wicg.github.io/private-network-access/
 * @return {Function} cors post hook
 * @public
 */

export function corsHook(options: {
  exposeHeaders?: string[];
  allowMethods?: allowedMethods;
  allowHeaders?: string[];
  keepHeadersOnError?: boolean;
  maxAge?: string;
  credentials?: boolean;
  secureContext?: {
    "Cross-Origin-Opener-Policy":
      | "same-origin"
      | "unsafe-none"
      | "same-origin-allow-popups";
    "Cross-Origin-Embedder-Policy": "require-corp" | "unsafe-none";
  };
  privateNetworkAccess?: any;
  origin?: string[];
}): (ctx: Context) => void {
  if (Array.isArray(options.allowMethods)) {
    options.allowMethods = options.allowMethods.join(
      ","
    ) as unknown as methods[];
  }
  if (options.maxAge) {
    options.maxAge = String(options.maxAge);
  }

  options.keepHeadersOnError =
    options.keepHeadersOnError === undefined || !!options.keepHeadersOnError;

  return function cors(ctx: Context) {
    //? Add Vary header to indicate response varies based on the Origin header
    ctx.set("Vary", "Origin");
    if (options.credentials === true) {
      ctx.set("Access-Control-Allow-Credentials", "true");
    } else {
      if (Array.isArray(options.origin)) {
        ctx.set("Access-Control-Allow-Origin", options.origin.join(","));
      } else {
        ctx.set("Access-Control-Allow-Origin", String(options.origin));
      }
      ctx.set("Access-Control-Allow-Origin", options.origin!.join(","));
    }

    if (ctx.request!.method !== "OPTIONS") {
      if (options.secureContext) {
        ctx.set(
          "Cross-Origin-Opener-Policy",
          options.secureContext["Cross-Origin-Embedder-Policy"]
        );
        ctx.set(
          "Cross-Origin-Embedder-Policy",
          options.secureContext["Cross-Origin-Embedder-Policy"]
        );
      }
    } else {
      //? Preflight Request
      if (options.maxAge) {
        ctx.set("Access-Control-Max-Age", options.maxAge);
      }
      if (options.privateNetworkAccess) {
        ctx.get("Access-Control-Request-Private-Network") &&
          "Access-Control-Allow-Methods",
          typeof options.allowMethods === "string" ? options.allowMethods : "";
        if (options.allowMethods) {
          ctx.set(
            "Access-Control-Allow-Methods",
            options.allowMethods as unknown as string
          );
        }
        if (options.secureContext) {
          ctx.set(
            "Cross-Origin-Opener-Policy",
            options.secureContext["Cross-Origin-Embedder-Policy"]
          );
          ctx.set(
            "Cross-Origin-Embedder-Policy",
            options.secureContext["Cross-Origin-Embedder-Policy"]
          );
        }
        // ! pre compute the joins here
        if (options.allowHeaders) {
          ctx.set(
            "Access-Control-Allow-Headers",
            options.allowHeaders.join(",")
          );
        }
        if (!ctx.code) {
          ctx.code = 204;
        }
      }
    }
  };
}

export const UTILS = {
  // wsFuncs: [],
  ctxPool: [] as Context[],
  hooks: {},
  ae(cb: { (): any; (): any; (): void }) {
    try {
      cb();
      return true;
    } catch (error) {
      return false;
    }
  },
  set() {
    const bun = UTILS.ae(() => Bun);
    // @ts-expect-error
    const deno = UTILS.ae(() => Deno);
    this.runtime = { bun, deno, node: !bun && !deno };
  },
  runtime: null as unknown as Record<string, boolean>,
  // validators: {} as Record<string, JetSchema>,
  server(plugs: JetPlugin[]): { listen: any; edge: boolean } | void {
    let server;
    let server_else;
    if (UTILS.runtime["node"]) {
      server = createServer((x: any, y: any) => {
        JetPath(x, y);
      });
    }
    if (UTILS.runtime["deno"]) {
      server = {
        listen(port: number) {
          // @ts-expect-error
          server_else = Deno.serve({ port: port }, JetPath);
        },
        edge: false,
      };
    }
    if (UTILS.runtime["bun"]) {
      server = {
        listen(port: number) {
          server_else = Bun.serve({
            port,
            // @ts-expect-error
            fetch: JetPath,
          });
        },
        edge: false,
      };
    }
    //! likely on the edge
    //! let's see what the plugins has to say

    const decorations: Record<string, any> = {};

    // ? yes a plugin can bring it's own server
    const edgePluginIdx = plugs.findIndex((plug) => plug.hasServer);

    if (edgePluginIdx > -1) {
      const edgePlugin = plugs.splice(edgePluginIdx, 1)[0];
      if (edgePlugin !== undefined && edgePlugin.hasServer) {
        const decs = edgePlugin._setup({
          server: (!UTILS.runtime["node"] ? server_else! : server!) as any,
          runtime: UTILS.runtime as any,
          routesObject: _JetPath_paths,
          JetPath_app: JetPath as any,
        });
        Object.assign(decorations, decs);
        //? setting the jet server from the plugin
        if (edgePlugin.JetPathServer) {
          server = edgePlugin.JetPathServer;
          server.edge = true;
        }
      }
    }

    //? compile plugins
    for (let i = 0; i < plugs.length; i++) {
      const decs = plugs[i]._setup({
        server: !UTILS.runtime["node"] ? server_else! : server!,
        runtime: UTILS.runtime as any,
        routesObject: _JetPath_paths,
        JetPath_app: JetPath as any,
      });
      Object.assign(decorations, decs);
    }
    // ? adding ctx plugin bindings
    for (const key in decorations) {
      if (!(UTILS.hooks as any)[key]) {
        (UTILS.hooks as any)[key] = decorations[key];
      }
    }
    if (!server) {
      const edge_server = plugs.find(
        (plug) => plug.JetPathServer
      )?.JetPathServer;
      if (edge_server !== undefined) {
        server = edge_server;
      }
    }
    return server!;
  },
};
// ? setting up the runtime check
UTILS.set();

export let _JetPath_paths: Record<methods, Record<string, JetFunc>> = {
  GET: {},
  POST: {},
  HEAD: {},
  PUT: {},
  PATCH: {},
  DELETE: {},
  OPTIONS: {},
};
export const _JetPath_hooks: Record<
  string,
  (ctx: Context, err?: unknown) => void | Promise<void>
> = {};

class JetPathErrors extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const _DONE = new JetPathErrors("done");
export const _OFF = new JetPathErrors("off");
// const _RES = new JetPathErrors("respond");

const createCTX = (
  req: IncomingMessage | Request,
  path: string,
  params?: Record<string, any>,
  search?: Record<string, any>
): Context => {
  if (UTILS.ctxPool.length) {
    const ctx = UTILS.ctxPool.shift()!;
    ctx._7(req as Request, path, params, search);
    return ctx;
  }
  const ctx = new Context();
  // ? add hooks to the app object
  Object.assign(ctx.app, UTILS.hooks);
  ctx._7(req as Request, path, params, search);
  return ctx;
};

const createResponse = (
  res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  },
  ctx: Context,
  four04?: boolean
) => {
  //? add cors headers
  _JetPath_hooks["cors"]?.(ctx);
  UTILS.ctxPool.push(ctx);
  // ? prepare response
  if (!UTILS.runtime["node"]) {
    if (ctx?.code === 301 && ctx._2?.["Location"]) {
      return Response.redirect(ctx._2?.["Location"]);
    }
    if (ctx?._3) {
      return new Response(ctx?._3 as unknown as BodyInit, {
        status: 200,
        headers: ctx?._2,
      });
    }
    return new Response(ctx?._1 || (four04 ? "Not found" : undefined), {
      status: (four04 && 404) || ctx.code,
      headers: ctx?._2,
    });
  }
  if (ctx?._3) {
    res.writeHead(ctx?.code, ctx?._2);
    ctx?._3.on("error", (_err) => {
      res.statusCode;
      res.end("File not found");
    });
    return ctx._3.pipe(res);
  }
  res.writeHead(
    (four04 && 404) || ctx.code,
    ctx?._2 || { "Content-Type": "text/plain" }
  );
  res.end(ctx?._1 || (four04 ? "Not found" : undefined));
};

const JetPath = async (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  }
) => {
  const parsedR = URL_PARSER(req.method as methods, req.url!);
  let off = false;
  let ctx: Context;
  if (parsedR) {
    const r = parsedR[0];
    ctx = createCTX(req, parsedR[3], parsedR[1], parsedR[2]);
    try {
      //? pre-request hooks here
      await _JetPath_hooks["PRE"]?.(ctx);
      //? route handler call
      await r(ctx as any);
      return createResponse(res, ctx);
    } catch (error) {
      if (error instanceof JetPathErrors) {
        if (error.message !== "off") {
          return createResponse(res, ctx);
        } else {
          off = true;
        }
      } else {
        //? report error to error hook
        try {
          await _JetPath_hooks["ERROR"]?.(ctx, error);
          //! if expose headers on error is set
          //! false remove this line so the last return will take effect;
          return createResponse(res, ctx);
        } catch (error) {
          return createResponse(res, ctx);
        }
      }
    }
  }
  if (!off) {
    if (req.method === "OPTIONS") {
      return createResponse(res, createCTX(req, ""));
    }
    return createResponse(res, createCTX(req, ""), true);
  } else {
    return new Promise((r) => {
      ctx!._5 = () => {
        r(createResponse(res, ctx!));
      };
    });
  }
};

const handlersPath = (path: any) => {
  if ((path as string).includes("hook__")) {
    //? hooks in place
    return (path as string).split("hook__")[1];
  }
  //? adding /(s) in place
  path = path.split("_");
  const method = path.shift();
  path = "/" + path.join("/");
  //? adding ?(s) in place
  path = path.split("$$");
  path = path.join("/?");
  //? adding * in place
  path = path.split("$0");
  path = path.join("/*");
  //? adding :(s) in place
  path = path.split("$");
  path = path.join("/:");
  if (/(GET|POST|PUT|PATCH|DELETE|OPTIONS)/.test(method)) {
    //? adding methods in place
    return [method, path] as [methods, string];
  }
  return;
};

const getModule = async (src: string, name: string) => {
  try {
    const mod = await import(path.resolve(src + "/" + name));
    return mod;
  } catch (error) {
    Log.info("Error at " + src + "/" + name + "  loading failed!");
    return String(error);
  }
};
export async function getHandlers(
  source: string,
  print: boolean,
  errorsCount: { file: string; error: string }[] | undefined = undefined
) {
  source = source || cwd();
  source = path.resolve(cwd(), source);
  const dir = await opendir(source);
  for await (const dirent of dir) {
    if (
      dirent.isFile() &&
      (dirent.name.endsWith(".jet.js") || dirent.name.endsWith(".jet.ts"))
    ) {
      if (print) {
        Log.info("Loading routes at " + source + "/" + dirent.name);
      }
      try {
        const module = await getModule(source, dirent.name);
        if (typeof module !== "string") {
          for (const p in module) {
            const params = handlersPath(p);
            if (params) {
              // ! HTTP handler
              if (
                typeof params !== "string"
                // &&
                // _JetPath_paths[params[0] as methods]
              ) {
                // ? set the method
                module[p]!.method = params[0];
                // ? set the path
                module[p]!.path = params[1];
                _JetPath_paths[params[0] as methods][params[1]] = module[
                  p
                ] as JetFunc;
              } else {
                if ("PRE-ERROR".includes(params as string)) {
                  _JetPath_hooks[params as string] = module[p];
                }
              }
            }
          }
        } else {
          // record errors
          if (dirent.name.endsWith(".jet.")) {
            if (!errorsCount) {
              errorsCount = [];
            }
            errorsCount.push({
              file: dirent.path + "/" + dirent.name,
              error: module,
            });
          }
        }
      } catch (error) {
        if (dirent.name.includes(".jet.")) {
          if (!errorsCount) {
            errorsCount = [];
          }
          errorsCount.push({
            file: dirent.path + "/" + dirent.name,
            error: String(error),
          });
        }
      }
    }
    if (
      dirent.isDirectory() &&
      dirent.name !== "node_modules" &&
      dirent.name !== ".git"
    ) {
      errorsCount = await getHandlers(
        source + "/" + dirent.name,
        print,
        errorsCount
      );
    }
  }
  return errorsCount;
}

export function validator<T extends Record<string, any>>(
  schema: HTTPBody<T> | undefined,
  data: any
): T {
  if (!schema || typeof data !== "object") {
    throw new Error("Invalid schema or data");
  }

  const errors: string[] = [];
  const out: Partial<T> = {};

  for (const [key, def] of Object.entries(schema)) {
    const value = data[key];

    // Required check
    if (def.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip if optional and undefined
    if (!def.required && value === undefined) {
      continue;
    }

    // Type validation
    if (def.type) {
      if (def.type === "array") {
        if (!Array.isArray(value)) {
          errors.push(`${key} must be an array`);
          continue;
        }
        if (def.arrayType === "object" && def.objectSchema) {
          try {
            const validatedArray = value.map((item) =>
              validator(def.objectSchema, item)
            );
            out[key as keyof T] = validatedArray as T[keyof T];
            continue;
          } catch (e) {
            errors.push(`${key}: ${String(e)}`);
            continue;
          }
        } else if (
          def.arrayType &&
          !value.every((item) => typeof item === def.arrayType)
        ) {
          errors.push(`${key} must be an array of ${def.arrayType}`);
          continue;
        }
      } else if (def.type === "object") {
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push(`${key} must be an object`);
          continue;
        }
        // Handle objectSchema validation
        if (def.objectSchema) {
          try {
            out[key as keyof T] = validator(
              def.objectSchema,
              value
            ) as T[keyof T];
            continue;
          } catch (e) {
            errors.push(`${key}: ${String(e)}`);
            continue;
          }
        }
      } else if (typeof value !== def.type && def.type !== "file") {
        errors.push(`${key} must be of type ${def.type}`);
        continue;
      }
    }

    // Regex validation
    if (def.RegExp && !def.RegExp.test(value)) {
      errors.push(def.err || `${key} does not match required pattern`);
      continue;
    }

    // Custom validator
    if (def.validator) {
      const result = def.validator(value);
      if (result !== true) {
        errors.push(
          typeof result === "string"
            ? result
            : def.err || `${key} validation failed`
        );
        continue;
      }
    }

    out[key as keyof T] = value;
  }

  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }

  return out as T;
}

/**
 * Parses the URL and returns the corresponding handler, parameters, search parameters, and path.
 *
 * @param method - The HTTP method (e.g., GET, POST, etc.)
 * @param url - The URL to parse
 * @returns ? [handler, params, search, path]
 */

const URL_PARSER = (
  method: methods,
  url: string
): [JetFunc, Record<string, any>, Record<string, any>, string] | undefined => {
  const routes = _JetPath_paths[method];
  if (!UTILS.runtime["node"]) {
    url = url.slice(url.indexOf("/", 7));
  }

  // if (!routes) return;
  if (routes[url]) {
    return [routes[url], {}, {}, url];
  }

  const search: Record<string, string> = {},
    params: Record<string, string> = {};
  let path: string, handler: JetFunc;
  //? place holder & * route checks
  for (const pathR in routes) {
    let breaked = false;
    // ? placeholder /: check
    if (pathR.includes(":")) {
      const urlFixtures = url.split("/");
      const pathFixtures = pathR.split("/");
      if (urlFixtures.length !== pathFixtures.length) {
        continue;
      }

      for (let i = 0; i < pathFixtures.length; i++) {
        if (
          !pathFixtures[i].includes(":") &&
          urlFixtures[i] !== pathFixtures[i]
        ) {
          breaked = true;
          break;
        }
      }
      if (breaked) {
        continue;
      }

      for (let i = 0; i < pathFixtures.length; i++) {
        const px = pathFixtures[i];
        if (px.includes(":")) {
          params[px.split(":")[1]] = urlFixtures[i];
        }
      }
      path = pathR;
      //? set path and handler
      handler = routes[path];
      break;
    }

    // ? /* check
    if (pathR.includes("*")) {
      const Ried = pathR.slice(0, pathR.length - 1);
      if (url.includes(Ried)) {
        (params as any).extraPath = url.slice(Ried.length);
        path = pathR;
        //? set path and handler
        handler = routes[path];
        break;
      }
    }
  }
  //? check for search in the route
  const uio = url.indexOf("/?");

  if (uio > -1) {
    path = url.slice(0, uio + 2);
    if (url.includes("=")) {
      const s_raw = url.slice(path.length).split("=");
      for (let s = 0; s < s_raw.length; s = s + 2) {
        search[s_raw[s]] = s_raw[s + 1];
      }
    }
    if (routes[path]) {
      handler = routes[path];
    }
  }

  if (handler!) {
    return [handler, params, search, path!];
  }
};

export const compileUI = (UI: string, options: jetOptions, api: string) => {
  // ? global headers
  const globalHeaders = JSON.stringify(
    options?.globalHeaders || {
      Authorization: "Bearer ****",
    }
  );

  return UI.replace("{ JETPATH }", `\`${api}\``)
    .replaceAll("{ JETPATHGH }", `${JSON.stringify(globalHeaders)}`)
    .replaceAll("{NAME}", options?.apiDoc?.name || "JetPath API Doc")
    .replaceAll("JETPATHCOLOR", options?.apiDoc?.color || "#007bff")
    .replaceAll(
      "{LOGO}",
      options?.apiDoc?.logo ||
        "https://raw.githubusercontent.com/Uiedbook/JetPath/main/icon-transparent.webp"
    )
    .replaceAll(
      "{INFO}",
      options?.apiDoc?.info || "This is a JetPath api preview."
    );
};

export const compileAPI = (options: jetOptions): [number, string] => {
  let handlersCount = 0;
  let compiledAPIArray: string[] = [];
  let compiledRoutes: string[] = [];
  // ? global headers
  const globalHeaders = options?.globalHeaders || {};
  // ? loop through apis
  for (const method in _JetPath_paths) {
    // ? Retrieve api info;
    const routesOfMethod = _JetPath_paths[method as methods];

    if (routesOfMethod && Object.keys(routesOfMethod).length) {
      for (const route in routesOfMethod) {
        // ? Retrieve api handler
        const validator = routesOfMethod[route];
        // ? Retrieve api body definitions
        const body = validator.body;
        // ? Retrieve api headers definitions
        const initialHeader = {};
        Object.assign(initialHeader, validator?.headers || {}, globalHeaders);
        const headers = [];
        // ? parse headers
        for (const name in initialHeader) {
          headers.push(
            name + ":" + initialHeader[name as keyof typeof initialHeader]
          );
        }
        // ? parse body
        let bodyData: Record<string, any> | undefined = undefined;
        if (body) {
          bodyData = {};
          const processSchema = (schema: any, target: any) => {
            for (const key in schema) {
              const field = schema[key];
              if (field.type === "object" && field.objectSchema) {
                target[key] = {};
                processSchema(field.objectSchema, target[key]);
              } else if (field.type === "array") {
                if (field.arrayType === "object" && field.objectSchema) {
                  target[key] = [{}];
                  processSchema(field.objectSchema, target[key][0]);
                } else {
                  target[key] = [field.arrayType || "text"];
                }
              } else {
                target[key] = field?.defaultValue || field?.inputType || "text";
              }
            }
          };
          processSchema(body, bodyData);
        }
        // ? combine api infos into .http format
        const api = `\n
${method} ${
          options?.APIdisplay === "UI"
            ? "[--host--]"
            : "http://localhost:" + (options?.port || 8080)
        }${route} HTTP/1.1
${headers.length ? headers.join("\n") : ""}\n
${(body && method !== "GET" ? method : "") ? JSON.stringify(bodyData) : ""}\n${
          validator?.["info"] ? "#" + validator?.["info"] + "-JETE" : ""
        }
###`;

        // ? combine api(s)
        const low = sorted_insert(compiledRoutes, route);
        compiledRoutes.splice(low, 0, route);
        compiledAPIArray.splice(low, 0, api);
        // ? increment handler count
        handlersCount += 1;
      }
    }
  }
  // sort and join here

  const compileAPIString = compiledAPIArray.join("");
  return [handlersCount, compileAPIString];
};

const sorted_insert = (paths: string[], path: string): number => {
  let low = 0;
  let high = paths.length - 1;
  for (; low <= high; ) {
    const mid = Math.floor((low + high) / 2);
    const current = paths[mid];
    if (current < path) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return low;
};
