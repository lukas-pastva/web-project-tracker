import { Project, Task, Contact } from "./model.js";

/* create/alter all three tables */
export async function syncProject() {
  await Promise.all([
    Project.sync({ alter: true }),
    Task.sync({ alter: true }),
    Contact.sync({ alter: true }),
  ]);
}
