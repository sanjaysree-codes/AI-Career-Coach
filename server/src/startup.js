import {safeMongoErrorDetails} from './mongo-diagnostics.js';

export const MONGODB_DNS_SERVERS=Object.freeze(['8.8.8.8','1.1.1.1']);

export async function startBackend({dns,loadEnvironment,loadDependencies,env=process.env,logger=console}){
  dns.setServers([...MONGODB_DNS_SERVERS]);
  await loadEnvironment();

  const uri=env.MONGODB_URI;
  if(!uri){
    logger.error('MONGODB_URI is required.');
    return false;
  }

  const {mongoose,app}=await loadDependencies();
  const port=env.PORT||4000;
  try{
    await mongoose.connect(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,socketTimeoutMS:45000});
    logger.log('MongoDB connected');
    app.listen(port,()=>logger.log(`API listening on ${port}`));
    return true;
  }catch(error){
    logger.error('Database connection failed.',JSON.stringify(safeMongoErrorDetails(error,uri)));
    return false;
  }
}
