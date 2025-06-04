import { DataTypes } from "sequelize";
import db from "../../db.js";

/* ───────────────────────── Projects & Tasks ────────────────────── */
export const Project = db.define(
  "project",
  {
    id  : { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  },
  { timestamps: true }
);

export const Task = db.define(
  "task",
  {
    id         : { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    projectId  : { type: DataTypes.INTEGER, allowNull: false },
    name       : { type: DataTypes.STRING(256), allowNull: false },
    customer   : { type: DataTypes.STRING(128) },
    startedAt  : { type: DataTypes.DATE, allowNull: false },
    finishedAt : { type: DataTypes.DATE },
    notes      : { type: DataTypes.TEXT },
  },
  { timestamps: false }
);

/* ───────────────────────── NEW: Contacts ───────────────────────── */
export const Contact = db.define(
  "contact",
  {
    id      : { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    taskId  : { type: DataTypes.INTEGER, allowNull: false },
    name    : { type: DataTypes.STRING(128), allowNull: false },
    email   : { type: DataTypes.STRING(128), allowNull: false },
    position: { type: DataTypes.STRING(128) },
  },
  { timestamps: false }
);

/* ──────────────── relations & cascades ─────────────────────────── */
Project.hasMany(Task,   { foreignKey: "projectId", onDelete: "CASCADE" });
Task.belongsTo(Project, { foreignKey: "projectId" });

Task.hasMany(Contact,   { foreignKey: "taskId",    onDelete: "CASCADE" });
Contact.belongsTo(Task, { foreignKey: "taskId" });

/* named exports, no default */
export { Project, Task, Contact };
