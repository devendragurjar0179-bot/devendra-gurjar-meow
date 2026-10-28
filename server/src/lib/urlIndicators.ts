export interface UrlObservations {
  payloadType: string;
  observations: string[];
}

const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "ow.ly"]);

export function inspectPayload(payload: string): UrlObservations {
  const value = payload.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      payloadType: value.startsWith("WIFI:") ? "Wi-Fi configuration / text" : "Plain text or non-URL payload",
      observations: ["Payload is not a standard absolute URL; do not assume it is harmless."],
    };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { payloadType: "URL with non-web scheme", observations: [`Scheme is ${url.protocol}; opening it may launch an app or trigger an action.`] };
  }

  const observations: string[] = [];
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (url.username || url.password) observations.push("URL contains user-info before the host, which can be used to mislead readers.");
  if (hostname.startsWith("xn--") || hostname.split(".").some((part) => part.startsWith("xn--"))) {
    observations.push("Host contains an internationalized/punycode label; visually inspect for lookalike characters.");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith("[") ) {
    observations.push("Host appears to be an IP address rather than a conventional domain.");
  }
  if (SHORTENERS.has(hostname)) observations.push("URL uses a known link-shortening domain, so the final destination is not visible here.");
  if (url.protocol === "http:") observations.push("URL uses HTTP rather than HTTPS; traffic may not be encrypted.");
  if (hostname.split(".").length >= 5) observations.push("Host has many subdomain labels; check the registrable domain carefully.");
  if (url.hostname.length > 100) observations.push("Hostname is unusually long.");
  if (url.port && !["80", "443"].includes(url.port)) observations.push(`URL uses a non-default port (${url.port}).`);
  if (url.search.length > 200) observations.push("URL has a long query string that may contain tracking or sensitive parameters.");
  if (url.pathname.length > 80) observations.push("URL path is unusually long.");
  if (!observations.length) observations.push("No obvious structural warning signs were detected by these basic checks; this does not establish safety.");

  return { payloadType: "HTTP(S) URL", observations };
}
