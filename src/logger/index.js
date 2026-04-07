import pino from "pino";
import { env } from "../config/env.js";

const targets = [
  {
    target: "pino/file",
    level: "info",
    options: {
      destination: "src/logger/logs/info.log",
    },
  },
  {
    target: "pino/file",
    level: "debug",
    options: {
      destination: "src/logger/logs/debug.log",
    },
  },
  {
    target: "pino/file",
    level: "error",
    options: {
      destination: "src/logger/logs/error.log",
    },
  },
  {
    target: "pino/file",
    level: "fatal",
    options: {
      destination: "src/logger/logs/fatal.log",
    },
  },
  {
    target: "pino/file",
    level: "warn",
    options: {
      destination: "src/logger/logs/warn.log",
    },
  },
];

if (env.isDev) {
  targets.unshift({
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
    targets,
  },
});

export default logger;
