import { DataTypes } from "sequelize";
import db from "../../db.js";

/* Single-row application configuration */
const AppConfig = db.define(
  "app_config",
  {
    id      : { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    theme   : { type: DataTypes.ENUM("technical", "jira-like"), allowNull: false, defaultValue: "technical" },
    mode    : { type: DataTypes.ENUM("light", "dark", "auto"), allowNull: false, defaultValue: "auto" },
    appTitle: { type: DataTypes.STRING(128), allowNull: false, defaultValue: "Project-Tracker" },
  },
  { timestamps: false }
);

/* Export both default *and* named for flexibility */
export { AppConfig };
export default AppConfig;
