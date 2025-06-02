import { Sequelize } from "sequelize";

/* ------------------------------------------------------------------ */
/*  Build the connection string                                       */
/* ------------------------------------------------------------------ */
function buildDbUrl() {
  /* 1️⃣  Full URL wins if provided */
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  /* 2️⃣  Otherwise compose from individual parts */
  const {
    DB_HOST,
    DB_NAME,
    DB_USER = "root",
    DB_PASSWORD = "",
    DB_PORT = 3306,
  } = process.env;

  if (!DB_HOST || !DB_NAME) {
    throw new Error(
      "Missing DB connection info. Set DATABASE_URL or DB_HOST + DB_NAME (+ optional DB_USER/DB_PASSWORD/DB_PORT)."
    );
  }

  const user = encodeURIComponent(DB_USER);
  const pass = encodeURIComponent(DB_PASSWORD);
  return `mariadb://${user}:${pass}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

/* Shared Sequelize instance */
const db = new Sequelize(buildDbUrl(), {
  dialect : "mariadb",
  logging : false,
});

export default db;
