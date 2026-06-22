// Supabase sync for EFL website
// This keeps tournament data shared online through Supabase Realtime.
// Works on GitHub Pages, Netlify, Vercel, or any static hosting.

// 1) Replace these two values from your Supabase project:
// Supabase Dashboard → Project Settings → Data API
const SUPABASE_URL = "https://gcxlwxqqpiopverfznyn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZpAOR-NpGMXnAUJwfe6P3A_mQb-sjj4";

const TABLE_NAME = "efl_data";

const keyMap = {
  efl_settings: "settings",
  efl_teams: "teams",
  efl_matches: "matches"
};

const reverseKeyMap = {
  settings: "efl_settings",
  teams: "efl_teams",
  matches: "efl_matches"
};

let applyingRemoteUpdate = false;
let supabaseClient = null;

function isConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("PASTE_YOUR") &&
    !SUPABASE_ANON_KEY.includes("PASTE_YOUR")
  );
}

function safeParse(value) {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
}

function getCurrentSiteData() {
  if (typeof window.data === "function") return window.data();

  return {
    settings: safeParse(localStorage.getItem("efl_settings")),
    teams: safeParse(localStorage.getItem("efl_teams")),
    matches: safeParse(localStorage.getItem("efl_matches"))
  };
}

function rowsFromSiteData(siteData) {
  return [
    { key: "settings", value: siteData.settings },
    { key: "teams", value: siteData.teams },
    { key: "matches", value: siteData.matches }
  ].filter((row) => row.value !== undefined && row.value !== null);
}

function saveLocal(remoteData) {
  if (!remoteData) return;

  applyingRemoteUpdate = true;

  Object.entries(reverseKeyMap).forEach(([remoteKey, localStorageKey]) => {
    if (remoteData[remoteKey] !== undefined && remoteData[remoteKey] !== null) {
      localStorage.setItem(localStorageKey, JSON.stringify(remoteData[remoteKey]));
    }
  });

  applyingRemoteUpdate = false;
}

function rerender() {
  if (typeof window.rerenderCurrentPage === "function") {
    window.rerenderCurrentPage();
  }
}

function setStatus(status, error = null) {
  window.dispatchEvent(new CustomEvent("supabase-efl-status", {
    detail: { status, error }
  }));
}

async function upsertRows(rows) {
  if (!rows || rows.length === 0) return;

  const withTimestamp = rows.map((row) => ({
    ...row,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabaseClient
    .from(TABLE_NAME)
    .upsert(withTimestamp, { onConflict: "key" });

  if (error) throw error;
}

async function loadFromSupabase() {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("key,value")
    .in("key", ["settings", "teams", "matches"]);

  if (error) throw error;

  const remoteData = {};
  (data || []).forEach((row) => {
    remoteData[row.key] = row.value;
  });

  const siteData = getCurrentSiteData();
  const missingRows = [];

  ["settings", "teams", "matches"].forEach((key) => {
    if (remoteData[key] === undefined || remoteData[key] === null) {
      remoteData[key] = siteData[key];
      if (siteData[key] !== undefined && siteData[key] !== null) {
        missingRows.push({ key, value: siteData[key] });
      }
    }
  });

  if (missingRows.length > 0) {
    await upsertRows(missingRows);
  }

  saveLocal(remoteData);
  rerender();
}

// app.js still calls window.firebaseEFL.saveKey().
// Keep this alias so we do not need to rewrite the whole website.
window.firebaseEFL = {
  async saveKey(localStorageKey, value) {
    if (applyingRemoteUpdate) return;
    if (!supabaseClient) return;

    const remoteKey = keyMap[localStorageKey];
    if (!remoteKey) return;

    try {
      await upsertRows([{ key: remoteKey, value }]);
      setStatus("saved");
    } catch (error) {
      console.error("Supabase save failed:", error);
      setStatus("save-failed", error);
    }
  }
};

async function startSupabaseSync() {
  if (!isConfigured()) {
    console.warn("Supabase is not configured yet. Replace SUPABASE_URL and SUPABASE_ANON_KEY in supabase-sync.js.");
    setStatus("not-configured");
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase CDN did not load. Check your internet connection or CDN script tag.");
    setStatus("cdn-failed");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseEFLClient = supabaseClient;

  try {
    await loadFromSupabase();
    setStatus("connected");
  } catch (error) {
    console.error("Supabase load failed:", error);
    setStatus("load-failed", error);
  }

  supabaseClient
    .channel("efl_data_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_NAME },
      async () => {
        try {
          await loadFromSupabase();
          setStatus("connected");
        } catch (error) {
          console.error("Supabase realtime reload failed:", error);
          setStatus("realtime-reload-failed", error);
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("realtime-connected");
    });
}

startSupabaseSync();
