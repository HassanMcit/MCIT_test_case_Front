const fs = require('node:fs');
const dns = require('node:dns').promises;
const net = require('node:net');
const { Pool } = require('pg');
function env(file) {
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(([,k,v]) => [k,v.replace(/^(['"])(.*)\1$/, '$2')]));
}
async function main() {
  const front = env('.env.development');
  for (const file of ['.env.development','.env.production','backend/.env']) {
    const e = env(file), u = new URL(e.DATABASE_URL);
    console.log('config', JSON.stringify({file,host:u.hostname,port:u.port || '5432',database:u.pathname,sslmode:u.searchParams.get('sslmode'),sameDatabaseAsDevelopment:u.host === new URL(front.DATABASE_URL).host && u.pathname === new URL(front.DATABASE_URL).pathname}));
  }
  const u = new URL(front.DATABASE_URL);
  try { console.log('DNS', JSON.stringify(await dns.lookup(u.hostname,{all:true}))); } catch(e) { console.log('DNS error', e.code); }
  await new Promise(resolve => {
    const s = net.connect({host:u.hostname,port:Number(u.port || 5432)});
    s.setTimeout(8000);
    s.once('connect',()=>{console.log('TCP reachable');s.destroy();resolve();});
    s.once('timeout',()=>{console.log('TCP timeout');s.destroy();resolve();});
    s.once('error',e=>{console.log('TCP error',e.code);resolve();});
  });
  const p = new Pool({connectionString:front.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000,max:1});
  try { console.log('PostgreSQL',JSON.stringify((await p.query('SELECT current_database() AS database, now() AS server_time')).rows)); }
  catch(e) { console.log('PostgreSQL error',JSON.stringify({code:e.code,message:e.message.replaceAll(front.DATABASE_URL,'[redacted]')})); }
  finally {await p.end();}
  for (const route of ['/api/test-cases?limit=1','/api/auth/me']) {
    try {const r=await fetch(front.NEXT_PUBLIC_BASE_URL+route,{signal:AbortSignal.timeout(15000)});console.log('API',route,r.status);}
    catch(e){console.log('API error',route,e.cause?.code || e.name);}
  }
}
main().catch(e=>{console.error(e.code || e.name);process.exitCode=1;});
