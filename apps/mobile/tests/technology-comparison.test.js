import test from "node:test";
import assert from "node:assert/strict";
import { buildTechnologyComparison, buildTechnologyApprovalCandidate, saveTechnologyCandidate } from "../src/technology-comparison.js";
import { KnowledgeStore, MemoryKnowledgeAdapter } from "../../../src/index.js";
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

test("crea un candidato TECH con evidencia reportada por campo y sin elevar verificación",()=>{
 const input=lookup("Phone A","phone-a",[["brand","Acme"],["chipset","Snapdragon X"],["ram","8 GB"],["storage","256 GB"]]);
 const candidate=buildTechnologyApprovalCandidate({lookup:input,resource:"smartphones",idPrefix:"approval-test"});
 assert.equal(candidate.product.id,"technology-phone-a-ram-8gb-storage-256gb");
 assert.equal(candidate.product.attributes.ramGB,8);
 assert.equal(candidate.product.evidenceIds.ramGB.length,1);
 assert.equal(candidate.product.evidenceIds.brand.length,1);
 assert.ok(candidate.evidenceRecords.every(record=>record.status==="reported"));
 assert.equal(candidate.evidenceRecords[0].source.type,"database");
});

test("does not persist conflicting or untraceable provider fields",()=>{
 const input=lookup("Phone A","phone-a",[["ram","8 GB"]],[["ram","12 GB"],["storage","256 GB"]]);
 const candidate=buildTechnologyApprovalCandidate({lookup:input,resource:"smartphones",idPrefix:"conflict-test"});
 assert.equal(candidate.product.attributes.ramGB,undefined);
 assert.equal(candidate.product.evidenceIds.ramGB,undefined);
 assert.equal(candidate.product.attributes.storageGB,256);
 assert.equal(candidate.product.evidenceIds.storageGB.length,1);
});

test("saves product and evidence in one knowledge snapshot and refuses overwrite",async()=>{
 const adapter=new MemoryKnowledgeAdapter();
 const store=await KnowledgeStore.open({adapter});
 const input=lookup("Phone A","phone-a",[["brand","Acme"],["chipset","Snapdragon X"],["ram","8 GB"],["storage","256 GB"]]);
 const candidate=buildTechnologyApprovalCandidate({lookup:input,resource:"smartphones",idPrefix:"atomic-test"});
 const saved=await saveTechnologyCandidate(store,candidate);
 assert.equal(saved.newProductCount,1);
 assert.equal(saved.newRecordCount,candidate.evidenceCount);
 const product=store.getProducts({domain:"technology"})[0];
 assert.equal(product.id,"technology-phone-a-ram-8gb-storage-256gb");
 assert.ok(store.queryEvidence({subjectId:product.id}).length>0);
 await assert.rejects(saveTechnologyCandidate(store,candidate),/ya existe/);
 const reopened=await KnowledgeStore.open({adapter});
 assert.equal(reopened.getProducts({domain:"technology"}).length,1);
 assert.equal(reopened.queryEvidence({subjectId:product.id}).length,candidate.evidenceCount);
});

test("guarda variantes de RAM/almacenamiento del mismo modelo como SKU distintos",()=>{
 const base={resource:"smartphones"};
 const a=buildTechnologyApprovalCandidate({lookup:lookup("Phone A","phone-a",[["brand","Acme"],["ram","8 GB"],["storage","256 GB"]]),...base,idPrefix:"variant-a"});
 const b=buildTechnologyApprovalCandidate({lookup:lookup("Phone A","phone-a",[["brand","Acme"],["ram","12 GB"],["storage","512 GB"]]),...base,idPrefix:"variant-b"});
 assert.notEqual(a.product.id,b.product.id);
 assert.deepEqual(a.product.variant,{ramGB:8,storageGB:256});
 assert.deepEqual(b.product.variant,{ramGB:12,storageGB:512});
});


test("el perfil Uso general pondera dimensiones diversas y desglosa cada puntuación",()=>{
 const devices=[
  lookup("Phone A","profile-a",[["brand","Acme"],["ram","12 GB"],["storage","512 GB"],["battery","5000 mAh"],["camera","50 MP"],["weight","190 g"]]),
  lookup("Phone B","profile-b",[["brand","Beta"],["ram","8 GB"],["storage","256 GB"],["battery","4500 mAh"],["camera","64 MP"],["weight","210 g"]]),
 ];
 const result=buildTechnologyComparison({lookups:devices,resource:"smartphones"});
 assert.equal(result.metric.value,"general");
 assert.equal(result.profile.available,true);
 assert.equal(result.profile.coveragePercent,100);
 assert.equal(result.profile.availableDimensionCount,5);
 assert.equal(result.ranking.decision,"ranked");
 assert.equal(result.profile.scores.length,2);
 assert.ok(result.profile.scores.every(item=>item.dimensions.length===5));
 assert.ok(result.profile.notes.some(note=>note.includes("megapíxeles")));
});

test("el perfil no inventa puntuación con menos de tres dimensiones comunes",()=>{
 const result=buildTechnologyComparison({
  resource:"smartphones",
  lookups:[
   lookup("Phone A","sparse-a",[["ram","8 GB"],["storage","256 GB"]]),
   lookup("Phone B","sparse-b",[["ram","12 GB"],["storage","512 GB"]]),
  ],
 });
 assert.equal(result.profile.available,false);
 assert.equal(result.ranking,null);
 assert.equal(result.profile.coveragePercent,40);
});

test("el perfil no mezcla capacidades de batería en mAh y Wh",()=>{
 const result=buildTechnologyComparison({
  resource:"laptops",
  lookups:[
   lookup("Laptop A","battery-a",[["ram","16 GB"],["storage","512 GB"],["weight","1.4 kg"]]),
   lookup("Laptop B","battery-b",[["ram","8 GB"],["storage","256 GB"],["weight","1.6 kg"]], [["batteryWh","60 Wh"]]),
  ],
 });
 assert.equal(result.profile.dimensions.some(item=>item.label==="Batería"),false);
 assert.equal(result.profile.coveragePercent,55);
 assert.equal(result.profile.available,false);
});
