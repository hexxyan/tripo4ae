// @include './lib/json2.js'

import * as aeft from "./aeft/aeft";

var ns = "com.tripo4ae.panel";

//@ts-ignore
const host = typeof $ !== "undefined" ? $ : window;

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
