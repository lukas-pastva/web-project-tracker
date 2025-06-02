import { DataTypes } from "sequelize";
import db from "../../db.js";

export const AppConfig = db.define("app_config", {
  id     : { type: DataTypes.INTEGER, autoIncrement:true, primaryKey:true },
  theme  : { type: DataTypes.ENUM("technical","jira-like"), allowNull:false, defaultValue:"technical" },
  mode   : { type: DataTypes.ENUM("light","dark","auto"),   allowNull:false, defaultValue:"auto" },
  appTitle: { type: DataTypes.STRING(128), allowNull:false, defaultValue:"Project-Tracker" },
}, { timestamps:false });
