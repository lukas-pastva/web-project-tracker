import { DataTypes } from "sequelize";
import db from "../../db.js";

export const Project = db.define("project", {
  id  : { type: DataTypes.INTEGER, autoIncrement:true, primaryKey:true },
  name: { type: DataTypes.STRING(128), allowNull:false, unique:true },
}, { timestamps:true });

export const Task = db.define("task", {
  id         : { type: DataTypes.INTEGER, autoIncrement:true, primaryKey:true },
  projectId  : { type: DataTypes.INTEGER, allowNull:false },
  name       : { type: DataTypes.STRING(256), allowNull:false },
  customer   : { type: DataTypes.STRING(128) },
  startedAt  : { type: DataTypes.DATE, allowNull:false },
  finishedAt : { type: DataTypes.DATE },
}, { timestamps:false });

Project.hasMany(Task, { foreignKey:"projectId", onDelete:"CASCADE" });
Task.belongsTo(Project, { foreignKey:"projectId" });
