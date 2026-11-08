import test from "node:test";
import assert from "node:assert/strict";
import { buildTechnologyComparison } from "../src/technology-comparison.js";
function lookup(model,slug,core=[],tech=[]) {
 const facts=(items,name)=>items.map(([key,value])=>({key,value,source:{name,url:"https://example.test/"+name},observedAt:"2026-11-08T00:00:00.000Z"}));
 return {model,slug,sources:[{id:"coreinfo",name:"CoreInfo",facts:facts(core,"CoreInfo")},{id:"techapi",name:"TechAPI",facts:facts(tech,"TechAPI")}]};
}
test("compara dos dispositivos y normaliza TB/GB",()=>{
 const r=buildTechnologyComparison({resource:"smartphones",metric:"storageGB",lookups:[lookup("Phone A","phone-a",[["brand","Acme"],["ram","8 GB"],["storage","1 TB"]]),lookup("Phone B","phone-b",[["brand","Acme"],["ram","12 GB"],["storage","512 GB"]])]});
 assert.equal(r.products[0].attributes.storageGB,1024); assert.equal(r.products[1].attributes.storageGB,512);
 assert.equal(r.ranking.decision,"ranked"); assert.equal(r.ranking.ranking[0].id,r.products[0].id);
});
test("conserva conflictos y no puntúa valores discrepantes",()=>{
 const r=buildTechnologyComparison({resource:"smartphones",metric:"ramGB",lookups:[lookup("Phone A","phone-a",[["ram","8 GB"]],[["ram","12 GB"]]),lookup("Phone B","phone-b",[["ram","8 GB"]])]});
 assert.equal(r.rows.find(x=>x.key==="ram").values[0].conflict,true); assert.equal(r.metricUnavailable,true); assert.equal(r.ranking,null);
});
test("no puntúa si falta el dato en uno de los modelos",()=>{
 const r=buildTechnologyComparison({resource:"laptops",metric:"weightGrams",lookups:[lookup("Laptop A","laptop-a",[["weight","1.2 kg"]]),lookup("Laptop B","laptop-b",[["chipset","CPU"]]),lookup("Laptop C","laptop-c",[["weight","1400 g"]])]});
 assert.equal(r.products[0].attributes.weightGrams,1200); assert.equal(r.metricUnavailable,true); assert.equal(r.ranking,null);
});
test("acepta hasta cuatro modelos y rechaza duplicados/categorías desconocidas",()=>{
 const items=["a","b","c","d"].map(x=>lookup("Phone "+x,"phone-"+x,[["ram","8 GB"]]));
 assert.equal(buildTechnologyComparison({lookups:items,resource:"smartphones"}).products.length,4);
 assert.throws(()=>buildTechnologyComparison({lookups:[items[0],items[0]],resource:"smartphones"}),/no repetirse/);
 assert.throws(()=>buildTechnologyComparison({lookups:items,resource:"other"}),/categoría/);
});
