// @include './lib/json2.js'

import * as aeft from "./aeft/aeft";

var ns = "com.tripo4ae.panel";

//@ts-ignore
const host = typeof $ !== "undefined" ? $ : window;

const getAppNameSafely = (): string => {
  var compare = (a: string, b: string) => a.toLowerCase().indexOf(b.toLowerCase()) > -1;
  var exists = (a: any) => typeof a !== "undefined";
  var isBridgeTalkWorking =
    typeof BridgeTalk !== "undefined" &&
    typeof BridgeTalk.appName !== "undefined";

  if (isBridgeTalkWorking) {
    return BridgeTalk.appName;
  } else if (app) {
    //@ts-ignore
    if (exists(app.name)) {
      //@ts-ignore
      var name: string = app.name;
      if (compare(name, "photoshop")) return "photoshop";
      if (compare(name, "illustrator")) return "illustrator";
      if (compare(name, "audition")) return "audition";
      if (compare(name, "bridge")) return "bridge";
      if (compare(name, "indesign")) return "indesign";
    }
    //@ts-ignore
    if (exists(app.appName)) {
      //@ts-ignore
      var appName: string = app.appName;
      if (compare(appName, "after effects")) return "aftereffects";
      if (compare(appName, "animate")) return "animate";
    }
    //@ts-ignore
    if (exists(app.path)) {
      //@ts-ignore
      var path: string = app.path;
      if (compare(path, "premiere")) return "premierepro";
    }
    //@ts-ignore
    if (exists(app.getEncoderHost) && exists(AMEFrontendEvent)) {
      return "ame";
    }
  }
  return "unknown";
};

// Unconditionally register namespaces for direct evalScript access
host[ns] = aeft;
host["tripo4ae"] = aeft;

if (typeof $ !== "undefined") {
  $[ns] = aeft;
  $["tripo4ae"] = aeft;
  if ($.global) {
    $.global[ns] = aeft;
    $.global["tripo4ae"] = aeft;
  }
}
