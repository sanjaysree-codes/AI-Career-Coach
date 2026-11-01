function safeMessage(value,uri){
  let message=String(value||'Unknown MongoDB connection error');
  try{
    const parsed=new URL(uri);
    for(const value of [parsed.username,parsed.password]){
      if(value){
        for(const credential of [value,decodeURIComponent(value)]){
          if(credential)message=message.split(credential).join('[REDACTED]');
        }
      }
    }
  }catch{}
  return message.replace(/mongodb(?:\+srv)?:\/\/[^\s"'`<>]+/gi,'mongodb://[REDACTED]');
}

function safeCode(code){
  return typeof code==='number'||(typeof code==='string'&&/^[A-Z0-9_]+$/i.test(code))?code:undefined;
}

function errorSummary(error,uri){
  if(!error)return undefined;
  return {
    name:typeof error.name==='string'?error.name:'Error',
    code:safeCode(error.code),
    message:safeMessage(error.message,uri)
  };
}

export function safeMongoErrorDetails(error,uri){
  const servers=error?.reason?.servers;
  const individualErrors=servers instanceof Map
    ? [...servers.entries()].map(([address,server])=>({
      address,
      state:server?.type,
      error:errorSummary(server?.error,uri)
    }))
    : undefined;
  return {
    ...errorSummary(error,uri),
    ...(individualErrors?.length?{servers:individualErrors}:{})
  };
}

export function identifyMongoFailureStage(error,uri){
  const details=safeMongoErrorDetails(error,uri);
  const errors=[details,...(details.servers||[]).map(server=>server.error)].filter(Boolean);
  if(errors.some(item=>/querySrv/i.test(item.message)))return 'srv-resolution';
  if(errors.some(item=>/queryTxt/i.test(item.message)))return 'txt-resolution';
  if(errors.some(item=>item.code===18||/authentication failed|bad auth/i.test(item.message)))return 'authentication';
  if(errors.some(item=>/TLS|SSL|certificate/i.test(item.message)||/^ERR_TLS/.test(item.code||'')))return 'tls-handshake';
  if(errors.some(item=>['ECONNREFUSED','ECONNRESET','ETIMEDOUT','EHOSTUNREACH'].includes(item.code)))return 'tcp-connection';
  if(error?.name==='MongooseServerSelectionError')return 'mongoose-server-selection';
  return 'mongoose-connection';
}
