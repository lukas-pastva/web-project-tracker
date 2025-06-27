import { DataTypes } from "sequelize";
import db from "../../db.js";

/* ───────────────────────── Work jobs ──────────────────────────── */
const Work = db.define(
  "work",
  {
    id        : { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    partner   : { type: DataTypes.STRING(128), allowNull: false },
    task      : { type: DataTypes.STRING(256), allowNull: false },
    description: { type: DataTypes.TEXT },
    ticketId  : { type: DataTypes.STRING(64) },
    timeSpent : { type: DataTypes.INTEGER },           // minutes
  },
  { timestamps: true }
);

export { Work };
export default Work;
