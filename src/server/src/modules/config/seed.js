import { AppConfig } from "./model.js";
export async function syncConfig(){
  await AppConfig.sync({ alter:true });
  if(await AppConfig.count()===0) await AppConfig.create({ id:1 });
}
