import { writeFile } from "node:fs/promises";
import {
  _jet_middleware,
  _JetPath_paths,
  _JetPath_paths_trie,
  assignMiddleware,
  compileAPI,
  compileUI,
  corsMiddleware,
  generateRouteTypes,
  getHandlers,
  isIdentical,
  UTILS,
} from "./primitives/functions.js";
import { AnyExecutor, type jetOptions } from "./primitives/types.js";
import { JetPlugin, Log } from "./primitives/classes.js";

export class Jetpath {
  public server: any;
  private listening: boolean = false;
  private options: jetOptions = {
    port: 8080,
    apiDoc: { display: "UI" },
    cors: false,
  };
  private plugs: JetPlugin<Record<string, unknown>, AnyExecutor>[] = [];
  constructor(options: jetOptions = {}) {
    Object.assign(this.options, options);
    if (!this.options.port) this.options.port = 8080;
    // ? setting up app configs
    if (this.options.cors === true) {
      corsMiddleware({
        exposeHeaders: [],
        allowMethods: ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"],
        origin: ["*"],
        allowHeaders: ["*"],
        maxAge: "86400",
        keepHeadersOnError: true,
        ...(typeof options?.cors === "object" ? options.cors : {}),
      });
    }
  }
  addPlugin(plugin: {
    _setup: (init: any) => any;
    hasServer?: boolean;
    executor: any;
  }): void {
    if (this.listening) {
      throw new Error("Your app is listening new plugins can't be added.");
    }
    if (
      isIdentical(
        plugin,
        new JetPlugin({
          executor: () => {
            return {};
          },
        }),
      )
    ) {
      this.plugs.push(
        plugin as JetPlugin<Record<string, unknown>, AnyExecutor>,
      );
    } else {
      throw Error("invalid Jetpath plugin");
    }
  }
  async listen(): Promise<void> {
    if (!this.options.source) {
      Log.error(
        "Jetpath: Please provide a source directory to avoid scanning the root directory",
      );
    }
    // ? {-view-} here is replaced at build time to html
    let UI = `{{view}}`; //! could be loaded only when needed
    Log.info("♻️  Compiling routes...");
    const startTime = performance.now();
    //? generate types
    if (this.options?.generateTypes === true) {
      generateRouteTypes(this.options.source || ".");
    }
    // ? Load all jetpath functions described in user code
    const errorsCount = await getHandlers(this.options?.source!, true);
    const endTime = performance.now();
    Log.info("Compiled!");
    //? compile API
    const [handlersCount, compiledAPI] = compileAPI(this.options);
    // ? render API in UI
    if (this.options?.apiDoc?.display === "UI") {
      UI = compileUI(UI, this.options, compiledAPI);
      const name = this.options?.apiDoc?.path || "/api-doc";
      _JetPath_paths_trie["GET"].insert(name, (
        ctx,
      ) => {
        if (this.options.apiDoc?.username && this.options.apiDoc?.password) {
          const authHeader = ctx.get("authorization");
          if (authHeader && authHeader.startsWith("Basic ")) {
            const [authType, encodedToken] = authHeader.trim().split(" ");
            if (authType !== "Basic" || !encodedToken) {
              ctx.code = 401;
              ctx.set(
                "WWW-Authenticate",
                `Basic realm=Jetpath API Doc`,
              );
              ctx.send(
                `<h1>401 Unauthorized</h1>`,
                "text/html",
              );
              return;
            }
            let username, password;
            try {
              const decodedToken = new TextDecoder().decode(
                Uint8Array.from(atob(encodedToken), (c) => c.charCodeAt(0)),
              );
              [username, password] = decodedToken.split(":");
            } catch (error) {
              ctx.code = 401;
              ctx.set(
                "WWW-Authenticate",
                `Basic realm=Jetpath API Doc`,
              );
              ctx.send(
                `<h1>401 Unauthorized</h1>`,
                "text/html",
              );
              return;
            }
            if (
              password === this.options?.apiDoc?.password &&
              username === this.options?.apiDoc?.username
            ) {
              ctx.send(UI, "text/html");
              return;
            } else {
              ctx.code = 401;
              ctx.set(
                "WWW-Authenticate",
                `Basic realm=Jetpath API Doc`,
              );
              ctx.send(
                `<h1>401 Unauthorized</h1>`,
                "text/html",
              );
              return;
            }
          } else {
            ctx.code = 401;
            ctx.set(
              "WWW-Authenticate",
              `Basic realm=Jetpath API Doc`,
            );
            ctx.send(
              `<h1>401 Unauthorized</h1>`,
              "text/html",
            );
            return;
          }
        } else {
          ctx.send(UI, "text/html");
          return;
        }
      });
      Log.success(
        `✅ Processed routes ${handlersCount} handlers in ${
          Math.round(
            endTime - startTime,
          )
        }ms`,
      );
      Log.success(
        `🚀 Visit http://localhost:${this.options.port}${
          this.options?.apiDoc?.path || "/api-doc"
        } to see the displayed routes in UI`,
      );
    } else if (this.options?.apiDoc?.display === "HTTP") {
      // ? render API in a .HTTP file
      await writeFile("api-doc.http", compiledAPI);
      Log.success(
        `✅ Processed routes ${handlersCount} handlers in ${
          Math.round(
            endTime - startTime,
          )
        }ms`,
      );
      Log.success(
        `🚀 Check http file ./api-doc.http to test the routes Visual Studio rest client extension`,
      );
    }
    if (errorsCount) {
      for (let i = 0; i < errorsCount.length; i++) {
        Log.error(
          `\nReport: ${errorsCount[i].file} file was not loaded due to \n "${
            errorsCount[i].error
          }" error; \n please resolve!`,
        );
      }
    }

    // ? kickoff server
    if (this.options?.upgrade === true) {
      UTILS.upgrade = true;
    }

    this.server = UTILS.server(this.plugs);
    //
    assignMiddleware(_JetPath_paths, _jet_middleware);
    // ? start server
    this.listening = true;
    this.server.listen(this.options.port);
    Log.success(`🔥 Listening on http://localhost:${this.options.port}`);
  }
}

//? exports
export type {
  AnyExecutor,
  ContextType,
  JetFile,
  JetFunc,
  JetMiddleware,
  JetPluginExecutorInitParams,
} from "./primitives/types.js";
export { JetPlugin, JetMockServer } from "./primitives/classes.js";
export { use } from "./primitives/functions.js";
export { mime } from "./extracts/mimejs-extract.js";
