import { Project, Task } from "./model.js";
export async function syncProject() {
  await Promise.all([Project.sync(), Task.sync()]);
}
