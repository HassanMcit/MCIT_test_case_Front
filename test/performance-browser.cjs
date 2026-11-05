// Production-mode integration fixture. Copies only frontend cache helpers;
// database, credentials and mutations are synthetic and confined to scratch/.
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync, execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const { setTimeout: delay } = require("node:timers/promises");
const root = path.resolve(__dirname, "..");
const baseline = process.argv
  .find((arg) => arg.startsWith("--baseline="))
  ?.slice("--baseline=".length);
const reportName =
  process.argv
    .find((arg) => arg.startsWith("--report-name="))
    ?.slice("--report-name=".length) ||
  (baseline ? "performance-before" : "performance-after");
if (!/^[a-z0-9-]+$/.test(reportName)) throw new Error("Invalid report name");
const fixture = path.join(root, "scratch", `${reportName}-fixture`);
const port = Number(
  process.argv
    .find((arg) => arg.startsWith("--port="))
    ?.slice("--port=".length) || (baseline ? 3321 : 3322),
);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid fixture port");
const origin = `http://127.0.0.1:${port}`;
function write(file, contents) {
  const full = path.join(fixture, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}
function source(file) {
  return baseline
    ? execFileSync("git", ["show", `${baseline}:${file}`], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 4e6,
      })
    : fs.readFileSync(path.join(root, file), "utf8");
}
async function main() {
  write(
    "package.json",
    JSON.stringify({ name: "isolated-performance-fixture", private: true }),
  );
  write(
    "next.config.mjs",
    `export default {experimental:{staleTimes:{dynamic:0,static:${baseline ? 180 : 30}}}};`,
  );
  write(
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "esnext"],
        strict: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
      },
      include: ["src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
    }),
  );
  for (const file of ["src/lib/scoped-cache.ts", "src/app/myUtil.ts"])
    write(
      file,
      source(file)
        .replace('from "next-auth/jwt"', 'from "@/lib/fixture-jwt"')
        .replace("process.env.AUTH_SECRET", '"synthetic-fixture-only"'),
    );
  write(
    "src/components/IntentLink.tsx",
    baseline
      ? '"use client"; export { default } from "next/link";'
      : source("src/components/IntentLink.tsx"),
  );
  write(
    "src/components/MySession.tsx",
    source("src/components/MySession/MySession.tsx").replace(
      'from "next-auth/react"',
      'from "@/lib/fixture-session"',
    ),
  );
  write(
    "src/lib/fixture-session.tsx",
    `"use client";import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
 type Session={user:{id:string;sid:string;email:string;role:string;isRevoked?:boolean}};
 type Value={data:Session|null;status:'loading'|'authenticated'|'unauthenticated'};
 const Context=createContext<Value>({data:null,status:'loading'});
 export function SessionProvider({children}:{children?:ReactNode;refetchInterval?:number;refetchOnWindowFocus?:boolean}){const [value,setValue]=useState<Value>({data:null,status:'loading'});useEffect(()=>{let active=true;const load=async()=>{const data=await fetch('/fixture-session',{cache:'no-store'}).then(r=>r.json());if(active)setValue({data,status:data?'authenticated':'unauthenticated'});};void load();window.addEventListener('fixture:session-change',load);return()=>{active=false;window.removeEventListener('fixture:session-change',load);};},[]);return <Context.Provider value={value}>{children}</Context.Provider>;}
 export function useSession(){return useContext(Context)} export async function signOut(_options:unknown){window.location.assign('/denied')}`,
  );
  write(
    "src/app/fixture-session/route.ts",
    `import {getCurrentUserSession} from '../myUtil';export const dynamic='force-dynamic';export async function GET(){const user=await getCurrentUserSession();return Response.json(user?{user:{id:String(user.id),sid:'fixture-'+user.id,email:user.email,role:user.role}}:null,{headers:{'Cache-Control':'private, no-store'}})}`,
  );
  write(
    "src/app/api/warmup/route.ts",
    `export function GET(){return Response.json({ok:true})}`,
  );
  write(
    "src/app/account-switch/layout.tsx",
    `import type {ReactNode} from 'react';import MySession from '@/components/MySession';export default function Layout({children}:{children:ReactNode}){return <MySession>{children}</MySession>}`,
  );
  for (const name of ["a", "b"])
    write(
      `src/app/account-switch/${name}/page.tsx`,
      `import {getCurrentUserSession} from '../../myUtil';import {redirect} from 'next/navigation';import IntentLink from '@/components/IntentLink';export default async function Page(){const user=await getCurrentUserSession();if(!user)redirect('/denied');return <div id="account-page" data-owner={user.id} data-role={user.role}><p>Private owner {user.id}</p><IntentLink id="switch-to-b" href="/account-switch/b">Second private page</IntentLink></div>}`,
    );
  write(
    "src/lib/fixture-state.ts",
    `import 'server-only';
 type State = {revision:number; authReads:number; sharedReads:number; privateReads:number; items:string[]; users:Map<number,{role:string;active:boolean}>};
 const globals=globalThis as unknown as {__performanceFixture?:State};
 export const state=globals.__performanceFixture ??= {revision:1,authReads:0,sharedReads:0,privateReads:0,items:['fixture'],users:new Map([[1,{role:'admin',active:true}],[2,{role:'tester',active:true}],[3,{role:'user',active:true}]])};
 export const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));`,
  );
  write(
    "src/lib/db.ts",
    `import {state,sleep} from './fixture-state';
 export const pool={query:async (_sql:string,params:unknown[])=>{state.authReads++;await sleep(30);const id=Number(params[0]), user=state.users.get(id);return {rows:user?[{id,name:'Fixture '+id,email:'fixture'+id+'@example.invalid',role:user.role,minTokenIat:0,revision:'fixture-${Date.now()}-'+state.revision,sessionActive:user.active}]:[]}}};`,
  );
  write(
    "src/lib/fixture-jwt.ts",
    `import type {JWT,JWTDecodeParams} from 'next-auth/jwt';export async function decode({token}:JWTDecodeParams):Promise<JWT> {const id=Number(token);return {id,credentialToken:'header.'+Buffer.from(JSON.stringify({sub:id,iat:100,sid:'fixture-'+id})).toString('base64url')+'.signature'};}`,
  );
  write(
    "src/lib/data.ts",
    `import * as caching from './scoped-cache';import {state,sleep} from './fixture-state';
 const sharedFactory=caching.${baseline ? "scopedCache" : "authenticatedSharedCache"};
 export const catalog=sharedFactory(async()=>{state.sharedReads++;await sleep(120);return [...state.items];},['fixture-catalog'],{tags:['catalog'],revalidate:60});
 export const privateRead=caching.scopedCache(async(id:number)=>{state.privateReads++;await sleep(100);return 'Private fixture owner '+id;},['fixture-private'],{tags:['private'],revalidate:60});`,
  );
  write(
    "src/app/layout.tsx",
    `import type {ReactNode} from 'react';import {getCurrentUserSession} from './myUtil';import Shell from './shell';export default async function Layout({children}:{children:ReactNode}){await getCurrentUserSession();return <html><body><Shell>{children}</Shell></body></html>}`,
  );
  write(
    "src/app/shell.tsx",
    `"use client";import {useEffect,useState,type ReactNode} from 'react';import Link from 'next/link';import IntentLink from '@/components/IntentLink';export default function Shell({children}:{children:ReactNode}){const [hydrated,setHydrated]=useState(false);useEffect(()=>setHydrated(true),[]);return <div id="shell" data-hydrated={String(hydrated)}><nav><IntentLink id="to-workflow" href="/workflow">Workflow</IntentLink> <IntentLink id="to-other" href="/other">Other</IntentLink> <Link id="to-security" href="/security" prefetch={false}>Security</Link></nav>{children}</div>}`,
  );
  const loading = source("src/app/(dashboard)/loading.tsx").replace(
    'className="w-full',
    'data-testid="route-loading" className="w-full',
  );
  write("src/app/loading.tsx", loading);
  for (const route of ["workflow", "other"])
    write(
      `src/app/${route}/page.tsx`,
      `import {redirect} from 'next/navigation';import {getCurrentUserSession,getUserToken} from '../myUtil';import {catalog,privateRead} from '@/lib/data';import Mutations from '../mutations';export default async function Page(){const [user]=await Promise.all([getCurrentUserSession(),getUserToken(),getCurrentUserSession()]);if(!user)redirect('/denied');const [shared,privateData]=await Promise.all([catalog(),privateRead(user.id)]);return <main id="page-data" data-route="${route}" data-owner={user.id} data-role={user.role}><h1>${route}</h1><p id="private">{privateData}</p><p id="catalog">{shared.join(',')}</p><Mutations/></main>}`,
    );
  write(
    "src/app/actions.ts",
    `"use server";import {getCurrentUserSession} from './myUtil';import {state} from '@/lib/fixture-state';import {updateTag,revalidatePath} from 'next/cache';export async function mutate(kind:string){const user=await getCurrentUserSession();if(user?.role!=='admin')return {ok:false};if(kind==='create')state.items.push('created');if(kind==='update')state.items=state.items.map(x=>x==='created'?'updated':x);if(kind==='delete')state.items=state.items.filter(x=>x!=='updated');state.revision++;updateTag('catalog');updateTag('private');revalidatePath('/workflow');revalidatePath('/other');return {ok:true}}`,
  );
  write(
    "src/app/mutations.tsx",
    `"use client";import {useState} from 'react';import {mutate} from './actions';export default function Mutations(){const [result,setResult]=useState('');return <section>{['create','update','delete'].map(kind=><button id={kind} key={kind} onClick={async()=>setResult((await mutate(kind)).ok?'ok':'forbidden')}>{kind}</button>)}<span id="mutation-result">{result}</span></section>}`,
  );
  write(
    "src/app/security/page.tsx",
    `import {getCurrentUserSession} from '../myUtil';export default async function Security(){const user=await getCurrentUserSession();return <p id="security">{user?.role==='admin'?'allowed':'forbidden'}</p>}`,
  );
  write(
    "src/app/denied/page.tsx",
    `export default function Page(){return <p id="denied">denied</p>}`,
  );
  write(
    "src/app/fixture-state/route.ts",
    `import {state} from '@/lib/fixture-state';export const dynamic='force-dynamic';export async function GET(){return Response.json({authReads:state.authReads,sharedReads:state.sharedReads,privateReads:state.privateReads,revision:state.revision},{headers:{'Cache-Control':'no-store'}})}export async function POST(req:Request){const body=await req.json();const user=state.users.get(body.id);if(user){if(body.role)user.role=body.role;if(typeof body.active==='boolean')user.active=body.active;state.revision++;}return Response.json({ok:true})}`,
  );
  const next = path.join(root, "node_modules/next/dist/bin/next");
  const built = spawnSync(process.execPath, [next, "build", "--webpack"], {
    cwd: fixture,
    encoding: "utf8",
    maxBuffer: 10e6,
  });
  fs.writeFileSync(
    path.join(root, "scratch", `${reportName}-build.log`),
    built.stdout + built.stderr,
  );
  if (built.status !== 0)
    throw Error(`Fixture build failed; see scratch/${reportName}-build.log`);
  const server = spawn(
    process.execPath,
    [next, "start", "-p", String(port), "-H", "127.0.0.1"],
    { cwd: fixture, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  let serverOutput = "";
  server.stdout.on("data", (d) => (serverOutput += d));
  server.stderr.on("data", (d) => (serverOutput += d));
  let browser;
  const report = {
    mode: baseline ? "before" : "after",
    notes:
      "Isolated production Next fixture; synthetic auth/database; read delays 30/100/120ms; no production data or services.",
  };
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) {
      try {
        const res = await fetch(`${origin}/fixture-state`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {}
      await delay(100);
    }
    if (!ready) throw Error(`Fixture start failed: ${serverOutput}`);
    const { chromium } = require(
      path.join(root, ".qa-test-tools/node_modules/playwright"),
    );
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext();
    await context.route("**/*", (route) =>
      route.request().url().startsWith(origin)
        ? route.continue()
        : route.abort(),
    );
    await context.addCookies([
      { name: "authjs.session-token", value: "1", url: origin },
    ]);
    const page = await context.newPage();
    const rsc = [];
    const browserErrors = [];
    const watchErrors = (target) => {
      target.on("pageerror", (error) => browserErrors.push(error.message));
      target.on("console", (message) => {
        if (
          message.type() === "error" &&
          /hydration|hydrated|did not match|Minified React error/i.test(
            message.text(),
          )
        )
          browserErrors.push(message.text());
      });
    };
    watchErrors(page);
    page.on("request", (request) => {
      if (request.url().includes("_rsc="))
        rsc.push(new URL(request.url()).pathname);
    });
    await context.addInitScript(() => {
      window.__loadingFrames = 0;
      document.addEventListener("DOMContentLoaded", () => {
        new MutationObserver(() => {
          if (document.querySelector('[data-testid="route-loading"]'))
            window.__loadingFrames++;
        }).observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      });
    });
    const snapshot = async () =>
      fetch(`${origin}/fixture-state`).then((r) => r.json());
    const start = performance.now();
    await page.goto(`${origin}/workflow`);
    await page.locator('#shell[data-hydrated="true"]').waitFor();
    await page.locator('#page-data[data-route="workflow"]').waitFor();
    report.initialMs = Math.round(performance.now() - start);
    report.initialCounters = await snapshot();
    const shell = await page.locator("#shell").elementHandle();
    await page.locator("#to-other").hover();
    await delay(700);
    let mark = rsc.length,
      frames = await page.evaluate(() => window.__loadingFrames),
      t = performance.now();
    await page.locator("#to-other").click();
    await page.locator('#page-data[data-route="other"]').waitFor();
    report.prefetchedNavigation = {
      ms: Math.round(performance.now() - t),
      rscOnClick: rsc.length - mark,
      loadingFrames:
        (await page.evaluate(() => window.__loadingFrames)) - frames,
    };
    await page.locator("#to-workflow").hover();
    await delay(700);
    await page.locator("#to-workflow").click();
    await page.locator('#page-data[data-route="workflow"]').waitFor();
    await page.locator("#to-other").hover();
    await delay(100);
    mark = rsc.length;
    frames = await page.evaluate(() => window.__loadingFrames);
    t = performance.now();
    await page.locator("#to-other").click();
    await page.locator('#page-data[data-route="other"]').waitFor();
    report.revisit = {
      ms: Math.round(performance.now() - t),
      rscOnClick: rsc.length - mark,
      loadingFrames:
        (await page.evaluate(() => window.__loadingFrames)) - frames,
    };
    assert.ok(await shell.evaluate((el) => el.isConnected));
    report.sharedLayoutPreserved = true;
    const beforeRefresh = await snapshot();
    await page.reload();
    await page.locator('#page-data[data-owner="1"]').waitFor();
    const afterRefresh = await snapshot();
    assert.equal(afterRefresh.sharedReads, beforeRefresh.sharedReads);
    assert.equal(afterRefresh.privateReads, beforeRefresh.privateReads);
    assert.ok(afterRefresh.authReads > beforeRefresh.authReads);
    report.refresh = { before: beforeRefresh, after: afterRefresh };
    if (!baseline) {
      // A ready page must not remain in the browser snapshot cache indefinitely.
      await page.locator("#to-workflow").hover();
      await delay(700);
      await page.locator("#to-workflow").click();
      await page.locator('#page-data[data-route="workflow"]').waitFor();
      await page.locator("#to-other").hover();
      await delay(700);
      await page.locator("#to-other").click();
      await page.locator('#page-data[data-route="other"]').waitFor();
      await page.mouse.move(700, 700);
      const beforeExpiry = rsc.filter((route) => route === "/other").length;
      await delay(31_000);
      await page.locator("#to-workflow").hover();
      await delay(700);
      await page.locator("#to-workflow").click();
      await page.locator('#page-data[data-route="workflow"]').waitFor();
      await page.locator("#to-other").hover();
      await delay(700);
      report.expiredSnapshotPrefetchRequests =
        rsc.filter((route) => route === "/other").length - beforeExpiry;
      assert.ok(report.expiredSnapshotPrefetchRequests > 0);
    }
    const otherContext = await browser.newContext();
    await otherContext.addCookies([
      { name: "authjs.session-token", value: "2", url: origin },
    ]);
    const otherPage = await otherContext.newPage();
    watchErrors(otherPage);
    await otherPage.goto(`${origin}/workflow`);
    await otherPage
      .locator('#page-data[data-owner="2"][data-role="tester"]')
      .waitFor();
    assert.match(await otherPage.locator("#private").innerText(), /owner 2/);
    await otherPage.locator("#create").click();
    await otherPage
      .locator("#mutation-result")
      .filter({ hasText: "forbidden" })
      .waitFor();
    report.secondUserCounters = await snapshot();
    if (!baseline)
      assert.equal(
        report.secondUserCounters.sharedReads,
        afterRefresh.sharedReads,
      );
    const userContext = await browser.newContext();
    await userContext.addCookies([
      { name: "authjs.session-token", value: "3", url: origin },
    ]);
    const userPage = await userContext.newPage();
    watchErrors(userPage);
    await userPage.goto(`${origin}/workflow`);
    await userPage
      .locator('#page-data[data-owner="3"][data-role="user"]')
      .waitFor();
    assert.match(await userPage.locator("#private").innerText(), /owner 3/);
    await userPage.locator("#create").click();
    await userPage
      .locator("#mutation-result")
      .filter({ hasText: "forbidden" })
      .waitFor();
    report.rolesVerified = ["admin", "tester", "user"];
    await page.locator("#create").click();
    await page.locator("#catalog").filter({ hasText: "created" }).waitFor();
    await page.locator("#update").click();
    await page.locator("#catalog").filter({ hasText: "updated" }).waitFor();
    await page.locator("#delete").click();
    await page.waitForFunction(
      () => document.querySelector("#catalog")?.textContent === "fixture",
    );
    report.crudCounters = await snapshot();
    await page.locator("#to-security").click();
    await page.locator("#security").filter({ hasText: "allowed" }).waitFor();
    await otherPage.goto(`${origin}/security`);
    await otherPage
      .locator("#security")
      .filter({ hasText: "forbidden" })
      .waitFor();
    await fetch(`${origin}/fixture-state`, {
      method: "POST",
      body: JSON.stringify({ id: 1, role: "tester" }),
    });
    await page.reload();
    await page.locator("#security").filter({ hasText: "forbidden" }).waitFor();
    await fetch(`${origin}/fixture-state`, {
      method: "POST",
      body: JSON.stringify({ id: 2, active: false }),
    });
    await otherPage.goto(`${origin}/workflow`);
    await otherPage.locator("#denied").waitFor();
    report.roleAndRevocationChecks = "pass";
    if (!baseline) {
      const switchContext = await browser.newContext();
      await switchContext.addCookies([
        { name: "authjs.session-token", value: "1", url: origin },
      ]);
      const switchPage = await switchContext.newPage();
      watchErrors(switchPage);
      await switchPage.goto(`${origin}/account-switch/a`);
      await switchPage.locator('#account-page[data-owner="1"]').waitFor();
      await delay(150); // Let the initial synthetic session resolve; no refresh is needed.
      await switchPage.locator("#switch-to-b").hover();
      await delay(700); // Warm a private payload owned by account 1.
      await switchContext.addCookies([
        { name: "authjs.session-token", value: "3", url: origin },
      ]);
      await switchPage.evaluate(() =>
        window.dispatchEvent(new Event("fixture:session-change")),
      );
      await switchPage.locator('#account-page[data-owner="3"]').waitFor();
      await switchPage.locator("#switch-to-b").click();
      await switchPage.locator('#account-page[data-owner="3"]').waitFor();
      await fetch(`${origin}/fixture-state`, {
        method: "POST",
        body: JSON.stringify({ id: 3, role: "admin" }),
      });
      await switchPage.evaluate(() =>
        window.dispatchEvent(new Event("fixture:session-change")),
      );
      await switchPage
        .locator('#account-page[data-owner="3"][data-role="admin"]')
        .waitFor();
      await switchContext.clearCookies();
      await switchPage.evaluate(() =>
        window.dispatchEvent(new Event("fixture:session-change")),
      );
      await switchPage.locator("#denied").waitFor();
      report.accountSwitchCacheIsolation = "pass";
    }
    report.browserErrors = browserErrors;
    assert.deepEqual(browserErrors, []);
    if (!baseline) {
      assert.equal(report.prefetchedNavigation.rscOnClick, 0);
      assert.equal(report.revisit.rscOnClick, 0);
      assert.equal(report.prefetchedNavigation.loadingFrames, 0);
      assert.equal(report.revisit.loadingFrames, 0);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (browser) await browser.close();
    server.kill();
    fs.writeFileSync(
      path.join(root, "scratch", `${reportName}.json`),
      JSON.stringify(report, null, 2),
    );
    fs.writeFileSync(
      path.join(root, "scratch", `${reportName}-server.log`),
      serverOutput,
    );
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
