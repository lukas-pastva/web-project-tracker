import AppConfig from "./model.js";

/* Ensure the table exists & at least one row is present */
export async function syncConfig() {
  await AppConfig.sync({ alter: true });
  if (await AppConfig.count() === 0) await AppConfig.create({ id: 1 });
}
