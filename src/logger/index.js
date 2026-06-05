import pino from "pino";
import { env } from "../config/env.js";

const baseTargets = [
  {
    target: "pino/file",
    level: "info",
    options: {
      destination: "./src/logger/logs/info.log",
      mkdir: true,
    },
  },
  {
    target: "pino/file",
    level: "debug",
    options: {
      destination: "./src/logger/logs/debug.log",
      mkdir: true,
    },
  },
  {
    target: "pino/file",
    level: "error",
    options: {
      destination: "./src/logger/logs/error.log",
      mkdir: true,
    },
  },
  {
    target: "pino/file",
    level: "fatal",
    options: {
      destination: "./src/logger/logs/fatal.log",
      mkdir: true,
    },
  },
  {
    target: "pino/file",
    level: "warn",
    options: {
      destination: "./src/logger/logs/warn.log",
      mkdir: true,
    },
  },
];

if (env.isDev) {
  baseTargets.unshift({
    target: "pino-pretty",
    level: "debug",
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: "dd-mm-yyyy HH:MM:ss",
      ignore: "pid,hostname,req,res",
      singleLine: true,
    },
  });
}

const logger = pino({
  level: "debug",
  transport: {
    targets: baseTargets,
  },
});

export default logger;
