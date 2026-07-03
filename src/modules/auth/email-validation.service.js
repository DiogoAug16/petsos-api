import dns from "node:dns/promises";
import nodeDns from "node:dns";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { InvalidEmailError } from "../../shared/errors/auth.error.js";

nodeDns.setServers(["8.8.8.8", "1.1.1.1"]);
const DOMAIN_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DISPOSABLE_DOMAINS_PATH = fileURLToPath(
  new URL("../../config/blocklists/disposable-email-domains.conf", import.meta.url),
);

const mxCache = new Map();

const loadDisposableDomains = () => {
  const content = readFileSync(DISPOSABLE_DOMAINS_PATH, "utf8");

  return new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#")),
  );
};

const DISPOSABLE_DOMAINS = loadDisposableDomains();

const getDomain = (email) => {
  const parts = String(email || "")
    .toLowerCase()
    .trim()
    .split("@");
  return parts.length === 2 ? parts[1] : "";
};

const isDisposableDomain = (domain) => {
  const labels = domain.split(".");

  return labels.some((_, index) => {
    const candidate = labels.slice(index).join(".");
    return DISPOSABLE_DOMAINS.has(candidate);
  });
};

const getCachedDomainResult = (domain) => {
  const cached = mxCache.get(domain);
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return cached.hasMx;
};

const setCachedDomainResult = (domain, hasMx) => {
  mxCache.set(domain, {
    hasMx,
    expiresAt: Date.now() + DOMAIN_CACHE_TTL_MS,
  });
};

const hasMxRecord = async (domain) => {
  const cached = getCachedDomainResult(domain);
  if (cached !== null) return cached;

  try {
    const records = await dns.resolveMx(domain);
    const hasMx = Array.isArray(records) && records.length > 0;
    setCachedDomainResult(domain, hasMx);
    return hasMx;
  } catch {
    setCachedDomainResult(domain, false);
    return false;
  }
};

export const assertEmailCanReceiveMessages = async (email) => {
  const domain = getDomain(email);

  if (!domain || isDisposableDomain(domain)) {
    throw new InvalidEmailError();
  }

  const hasMx = await hasMxRecord(domain);
  if (!hasMx) {
    throw new InvalidEmailError();
  }

  return {
    valid: true,
  };
};
