import {createHash} from "node:crypto"
import {mkdirSync,writeFileSync} from "node:fs"
import path from "node:path"
import {generateCircuitJson} from "../lib/shared/generate-circuit-json"
import {stats,installRenderCounter} from "../tests/fixtures/delayed-native-routing.circuit"
const count=Number(process.argv[2]??2)
if(!Number.isSafeInteger(count)||count<2)throw Error("Expected at least two components")
const trials:any[]=[]
for(let trial=0;trial<4;trial++) {
 stats.componentCount=count;stats.delayMs=500;stats.rendersWhileWaiting=0;stats.totalRenders=0;stats.inputs=[]
 const restore=installRenderCounter(),start=performance.now(),cpu=process.cpuUsage(),statuses:string[]=[]
 try {
  const {circuitJson}=await generateCircuitJson({filePath:path.resolve(import.meta.dir,"../tests/fixtures/delayed-native-routing.circuit.tsx"),platformConfig:{partsEngineDisabled:true},onAsyncEffectStatus:name=>statuses.push(name)})
  const used=process.cpuUsage(cpu),traces=circuitJson.filter(row=>row.type==="pcb_trace"),vias=circuitJson.filter(row=>row.type==="pcb_via"),errors=circuitJson.filter(row=>row.type.endsWith("_error"))
  if(!stats.inputs.length||!traces.length)throw Error("Native delayed solver did not run/route")
  const report={components:count,nativeInputs:stats.inputs.length,inputSha256:createHash("sha256").update(JSON.stringify(stats.inputs)).digest("hex"),nativeCopperSha256:createHash("sha256").update(JSON.stringify([...traces,...vias])).digest("hex"),traceCount:traces.length,viaCount:vias.length,errorCount:errors.length,statuses:[...new Set(statuses)],rendersWhileWaiting:stats.rendersWhileWaiting,totalRenders:stats.totalRenders,wallMs:performance.now()-start,cpuMs:(used.user+used.system)/1000,peakRssBytes:process.resourceUsage().maxRSS*1024}
  if(trial>0)trials.push(report)
  if(process.argv.includes("--visual")&&trial===3){
   const {convertCircuitJsonToPcbSvg}=await import("circuit-to-svg"),{Resvg}=await import("@resvg/resvg-js")
   const svg=convertCircuitJsonToPcbSvg(circuitJson);mkdirSync("docs/cli-idle-render-polls",{recursive:true});writeFileSync("docs/cli-idle-render-polls/completed-native-pcb.svg",svg);writeFileSync("docs/cli-idle-render-polls/completed-native-pcb.png",new Resvg(svg).render().asPng())
  }
 }finally{restore()}
}
const median=(key:string)=>trials.map(t=>t[key]).sort((a,b)=>a-b)[1]
const report={scope:"Native capacity routing delayed 500ms to expose CLI idle rendering; immutable inputs and native copper compared before/head",bun:Bun.version,components:count,delayMs:500,trials,medianWallMs:median("wallMs"),medianCpuMs:median("cpuMs"),medianIdleRenderPasses:median("rendersWhileWaiting"),peakRssBytes:Math.max(...trials.map(t=>t.peakRssBytes))}
if(process.argv[3]&&!process.argv[3].startsWith("--"))writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
