import dns from 'node:dns';
import {identifyMongoFailureStage,safeMongoErrorDetails} from '../src/mongo-diagnostics.js';
import {MONGODB_DNS_SERVERS} from '../src/startup.js';

dns.setServers([...MONGODB_DNS_SERVERS]);
const {config}=await import('dotenv');
config({path:new URL('../.env',import.meta.url)});

const uri=process.env.MONGODB_URI;
if(!uri){
  console.error(JSON.stringify({stage:'configuration',error:'MONGODB_URI is missing'}));
  process.exit(1);
}

let hostname;
try{hostname=new URL(uri).hostname;}catch{
  console.error(JSON.stringify({stage:'configuration',error:'MONGODB_URI syntax is invalid'}));
  process.exit(1);
}

let srvResolved=false;
try{
  const records=await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
  srvResolved=true;
  console.log(JSON.stringify({stage:'srv-resolution',result:'success',recordCount:records.length,ports:[...new Set(records.map(record=>record.port))]}));
}catch(error){
  console.error(JSON.stringify({stage:'srv-resolution',result:'failed',...safeMongoErrorDetails(error,uri)}));
}

if(!srvResolved){
  console.log(JSON.stringify({stage:'txt-resolution',result:'skipped',reason:'SRV lookup failed'}));
}else{
  try{
    const records=await dns.promises.resolveTxt(hostname);
    console.log(JSON.stringify({stage:'txt-resolution',result:'success',recordCount:records.length}));
  }catch(error){
    if(error?.code==='ENODATA')console.log(JSON.stringify({stage:'txt-resolution',result:'no-record'}));
    else{
      console.error(JSON.stringify({stage:'txt-resolution',result:'failed',...safeMongoErrorDetails(error,uri)}));
      process.exit(1);
    }
  }
}

const {default:mongoose}=await import('mongoose');
try{
  await mongoose.connect(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,socketTimeoutMS:45000});
  console.log(JSON.stringify({stage:'mongoose-connection',result:'success'}));
  await mongoose.disconnect();
}catch(error){
  console.error(JSON.stringify({stage:identifyMongoFailureStage(error,uri),result:'failed',...safeMongoErrorDetails(error,uri)}));
  process.exitCode=1;
}
