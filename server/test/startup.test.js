import test from 'node:test';
import assert from 'node:assert/strict';
import {MONGODB_DNS_SERVERS,startBackend} from '../src/startup.js';
import {identifyMongoFailureStage,safeMongoErrorDetails} from '../src/mongo-diagnostics.js';

test('configures public DNS before loading environment and MongoDB dependencies',async()=>{
  const events=[];
  let connectArgs;
  const logger={log:(message)=>events.push(['log',message]),error:(...args)=>events.push(['error',...args])};
  const result=await startBackend({
    dns:{setServers:(servers)=>events.push(['dns',servers])},
    loadEnvironment:async()=>events.push(['env']),
    loadDependencies:async()=>{
      events.push(['dependencies']);
      return {
        mongoose:{connect:async(...args)=>{connectArgs=args;events.push(['connect']);}},
        app:{listen:(port,callback)=>{events.push(['listen',port]);callback();}}
      };
    },
    env:{MONGODB_URI:'mongodb+srv://test-user:test-password@cluster.example/',PORT:'4123'},
    logger
  });

  assert.equal(result,true);
  assert.deepEqual(events[0],['dns',MONGODB_DNS_SERVERS]);
  assert.deepEqual(events.slice(1,3),[['env'],['dependencies']]);
  assert.deepEqual(connectArgs,[
    'mongodb+srv://test-user:test-password@cluster.example/',
    {serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,socketTimeoutMS:45000}
  ]);
  assert.deepEqual(events.find(([event])=>event==='listen'),['listen','4123']);
  assert.ok(events.some(([event,message])=>event==='log'&&message==='MongoDB connected'));
});

test('logs MongoDB startup errors without exposing URI credentials',async()=>{
  const errors=[];
  const uri='mongodb+srv://test-user:test-password@cluster.example/';
  const result=await startBackend({
    dns:{setServers(){}},
    loadEnvironment:async()=>{},
    loadDependencies:async()=>({
      mongoose:{connect:async()=>{throw Object.assign(new Error(`Failed to connect to ${uri}`),{code:'ECONNREFUSED'});}},
      app:{listen(){assert.fail('server must not listen if MongoDB connection fails');}}
    }),
    env:{MONGODB_URI:uri},
    logger:{log(){},error:(...args)=>errors.push(args)}
  });

  assert.equal(result,false);
  assert.equal(errors.length,1);
  assert.equal(errors[0][0],'Database connection failed.');
  assert.match(errors[0][1],/"name":"Error"/);
  assert.match(errors[0][1],/"code":"ECONNREFUSED"/);
  assert.doesNotMatch(errors[0][1],/test-user|test-password/);
  assert.match(errors[0][1],/mongodb:\/\/\[REDACTED\]/);
});

test('reports a missing MongoDB URI without loading the connection modules',async()=>{
  const errors=[];
  const result=await startBackend({
    dns:{setServers(){}},
    loadEnvironment:async()=>{},
    loadDependencies:async()=>assert.fail('dependencies must not load without MONGODB_URI'),
    env:{},
    logger:{log(){},error:(message)=>errors.push(message)}
  });

  assert.equal(result,false);
  assert.deepEqual(errors,['MONGODB_URI is required.']);
});

test('individual MongoDB server errors are logged with credentials removed',()=>{
  const uri='mongodb+srv://diagnostic-user:diagnostic-password@cluster.example/';
  const serverError=Object.assign(new Error(`connection failed for ${uri}`),{code:'ECONNREFUSED'});
  const error=Object.assign(new Error(`selection failed for ${uri}`),{
    name:'MongooseServerSelectionError',
    reason:{servers:new Map([['node.example:27017',{type:'Unknown',error:serverError}]])}
  });
  const details=safeMongoErrorDetails(error,uri);

  assert.equal(details.servers.length,1);
  assert.equal(details.servers[0].address,'node.example:27017');
  assert.equal(details.servers[0].error.code,'ECONNREFUSED');
  assert.doesNotMatch(JSON.stringify(details),/diagnostic-user|diagnostic-password/);
  assert.match(details.servers[0].error.message,/mongodb:\/\/\[REDACTED\]/);
});

test('MongoDB diagnostic identifies SRV lookup timeouts precisely',()=>{
  const error=Object.assign(new Error('querySrv ETIMEOUT _mongodb._tcp.cluster.example'),{code:'ETIMEOUT'});
  assert.equal(identifyMongoFailureStage(error,'mongodb+srv://user:password@cluster.example/'),'srv-resolution');
});
