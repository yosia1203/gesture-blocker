// Shared helpers. Sites are stored as { "example.com": { swipe: true, zoom: true } }.
// An entry also matches its subdomains (example.com covers app.example.com).
function findRule(sites, hostname) {
  let host = hostname.replace(/^www\./, "");
  while (host) {
    if (sites[host]) return { host, rule: sites[host] };
    const dot = host.indexOf(".");
    if (dot === -1) break;
    host = host.slice(dot + 1);
  }
  return null;
}
