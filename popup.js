const $ = (id) => document.getElementById(id);
let sites = {};
let currentHost = null;

function normalize(input) {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  try {
    if (!/^[a-z]+:\/\//.test(s)) s = "https://" + s;
    return new URL(s).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function save() {
  chrome.storage.sync.set({ sites });
  render();
}

function setRule(host, rule) {
  if (rule.swipe || rule.zoom) sites[host] = rule;
  else delete sites[host];
  save();
}

function render() {
  if (currentHost) {
    const match = findRule(sites, currentHost);
    const key = match ? match.host : currentHost;
    $("host").textContent = key;
    $("swipe").checked = !!match?.rule.swipe;
    $("zoom").checked = !!match?.rule.zoom;
    $("swipe").onchange = $("zoom").onchange = () =>
      setRule(key, { swipe: $("swipe").checked, zoom: $("zoom").checked });
  } else {
    $("current").innerHTML = '<div class="muted">This page can\'t be controlled (e.g. chrome:// pages).</div>';
  }

  const list = $("list");
  list.innerHTML = "";
  const hosts = Object.keys(sites).sort();
  if (!hosts.length) list.innerHTML = '<li class="muted">None yet</li>';
  for (const host of hosts) {
    const r = sites[host];
    const li = document.createElement("li");
    const tags = [r.swipe && "swipe", r.zoom && "zoom"].filter(Boolean).join(", ");
    li.innerHTML = `<span>${host} <small>(${tags})</small></span>`;
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = () => { delete sites[host]; save(); };
    li.appendChild(btn);
    list.appendChild(li);
  }
}

$("add").onsubmit = (e) => {
  e.preventDefault();
  const host = normalize($("newHost").value);
  if (!host) return;
  sites[host] = { swipe: true, zoom: true };
  $("newHost").value = "";
  save();
};

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  try {
    const url = new URL(tab?.url || "");
    if (/^https?:$/.test(url.protocol)) currentHost = url.hostname.replace(/^www\./, "");
  } catch {}
  chrome.storage.sync.get({ sites: {} }, (data) => {
    sites = data.sites;
    render();
  });
});
