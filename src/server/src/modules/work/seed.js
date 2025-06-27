import Work from "./model.js";

/* Ensure the “work” table exists */
export async function syncWork() {
  await Work.sync({ alter: true });
}
