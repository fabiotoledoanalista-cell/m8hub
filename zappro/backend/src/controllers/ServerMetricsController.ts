import { Request, Response } from "express";
import os from "os";
import { promisify } from "util";
import { execFile } from "child_process";
import axios from "axios";
import cache from "../libs/cache";
import Setting from "../models/Setting";

const execFileAsync = promisify(execFile);

const CACHE_TTL_MS = 15000;

let cachedPayload: any = null;
let cachedAt = 0;
let inflight: Promise<any> | null = null;

const formatBytes = (bytes: number): number => {
  if (!Number.isFinite(bytes) || bytes < 0) return 0;
  return bytes;
};

const parseDfK = (stdout: string) => {
  const lines = String(stdout || "")
    .trim()
    .split("\n")
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      filesystem: "-",
      total: 0,
      used: 0,
      free: 0,
      usedPercent: 0,
      mount: "/"
    };
  }

  const row = lines[lines.length - 1].trim().split(/\s+/);
  const filesystem = row[0] || "-";
  const totalKb = Number(row[1] || 0);
  const usedKb = Number(row[2] || 0);
  const freeKb = Number(row[3] || 0);
  const usedPercent = Number(String(row[4] || "0").replace("%", "")) || 0;
  const mount = row[5] || "/";

  return {
    filesystem,
    total: totalKb * 1024,
    used: usedKb * 1024,
    free: freeKb * 1024,
    usedPercent,
    mount
  };
};

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

const getRedisStatus = async () => {
  try {
    const redis = cache.getRedisInstance();
    const pong = await withTimeout(redis.ping(), 1200);
    return {
      status: pong === "PONG" ? "online" : "degraded",
      response: pong || "-"
    };
  } catch {
    return {
      status: "offline",
      response: "unreachable"
    };
  }
};

const getDiskUsage = async () => {
  try {
    const { stdout } = await withTimeout(execFileAsync("df", ["-kP", "/"]), 1800);
    return parseDfK(stdout);
  } catch {
    return {
      filesystem: "-",
      total: 0,
      used: 0,
      free: 0,
      usedPercent: 0,
      mount: "/"
    };
  }
};

const normalizeBaseUrl = (value: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

const getGlobalWuzapiBaseUrl = async (): Promise<string> => {
  const fromEnv = normalizeBaseUrl(String(process.env.WUZAPI_BASE_URL || ""));
  if (fromEnv) return fromEnv;

  try {
    const row = await Setting.findOne({
      where: { companyId: 1, key: "WUZAPI_BASE_URL" },
      order: [["updatedAt", "DESC"], ["id", "DESC"]]
    });
    return normalizeBaseUrl(String((row as any)?.value || ""));
  } catch {
    return "";
  }
};

const getWuzapiStatus = async () => {
  const baseUrl = await getGlobalWuzapiBaseUrl();

  if (!baseUrl) {
    return {
      enabled: false,
      status: "not_configured",
      baseUrl: "",
      details: {
        message: "WUZAPI_BASE_URL não configurada"
      }
    };
  }

  try {
    const { data } = await withTimeout(
      axios.get(`${baseUrl}/health`, {
        timeout: 2000
      }),
      2200
    );

    return {
      enabled: true,
      status: "online",
      baseUrl,
      details: {
        status: data?.status || "ok",
        timestamp: data?.timestamp || null,
        uptime: data?.uptime || null,
        version: data?.version || null,
        activeConnections: data?.active_connections ?? null,
        totalUsers: data?.total_users ?? null,
        connectedUsers: data?.connected_users ?? null,
        loggedInUsers: data?.logged_in_users ?? null,
        goroutines: data?.goroutines ?? null
      }
    };
  } catch (error: any) {
    return {
      enabled: true,
      status: "offline",
      baseUrl,
      details: {
        message: error?.message || "unreachable"
      }
    };
  }
};

const collectMetrics = async () => {
  const now = Date.now();

  if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return cachedPayload;
  }

  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    const [disk, redis, wuzapi] = await Promise.all([
      getDiskUsage(),
      getRedisStatus(),
      getWuzapiStatus()
    ]);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(totalMem - freeMem, 0);
    const cpus = os.cpus() || [];

    const payload = {
      status: "online",
      serverTime: new Date().toISOString(),
      uptimeSeconds: os.uptime(),
      processUptimeSeconds: process.uptime(),
      general: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        nodeVersion: process.version,
        pid: process.pid
      },
      memory: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        usedPercent: totalMem > 0 ? Number(((usedMem / totalMem) * 100).toFixed(2)) : 0
      },
      cpu: {
        model: cpus[0]?.model || "-",
        cores: cpus.length,
        loadAverage1m: os.loadavg()[0] || 0,
        loadAverage5m: os.loadavg()[1] || 0,
        loadAverage15m: os.loadavg()[2] || 0
      },
      disk,
      redis,
      wuzapi,
      collectedAt: new Date().toISOString(),
      cacheTtlMs: CACHE_TTL_MS
    };

    cachedPayload = payload;
    cachedAt = Date.now();
    inflight = null;

    return payload;
  })().catch((error) => {
    inflight = null;
    throw error;
  });

  return inflight;
};

export const index = async (_req: Request, res: Response): Promise<Response> => {
  const metrics = await collectMetrics();
  return res.status(200).json(metrics);
};
