import dns from 'node:dns';
import {startBackend} from './startup.js';

const started=await startBackend({
  dns,
  loadEnvironment:()=>import('dotenv/config'),
  loadDependencies:async()=>{
    const [{default:mongoose},{default:app}]=await Promise.all([
      import('mongoose'),
      import('./app.js')
    ]);
    return {mongoose,app};
  }
});

if(!started)process.exit(1);
