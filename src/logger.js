import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const filtered = Object.fromEntries(
    Object.entries(meta).filter(([k]) => !k.startsWith("Symbol"))
  );
  const metaStr = Object.keys(filtered).length
    ? `  ${JSON.stringify(filtered)}`
    : "";
  return `[${timestamp}] ${level}: ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp({ format: "HH:mm:ss.SSS" }), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: false, level: true }),
        timestamp({ format: "HH:mm:ss.SSS" }),
        logFormat
      ),
    }),
  ],
});

export default logger;
