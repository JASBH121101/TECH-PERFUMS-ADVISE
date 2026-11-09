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


test("normaliza conectividad y descarta entradas vacías de los proveedores",()=>{
 const devices=[
  lookup("Samsung S26 Ultra","s26-ultra",[
   ["ram","12 GB"],["storage","256 GB"],["connectivity",["5G","",null,"Wi-Fi 7","  ", "5G"]],
  ]),
  lookup("iPhone 18 Pro Max","iphone-18-pro-max",[
   ["ram","12 GB"],["storage","512 GB"],["connectivity",["5G","Wi-Fi 7",""]],
  ]),
 ];
 const result=buildTechnologyComparison({lookups:devices,resource:"smartphones"});
 assert.deepEqual(result.products[0].attributes.connectivity,["5G","Wi-Fi 7"]);
 assert.deepEqual(result.products[1].attributes.connectivity,["5G","Wi-Fi 7"]);
 assert.match(result.rows.find(row=>row.key==="connectivity").values[0].display,/5G, Wi-Fi 7/u);
});

test("omite conectividad vacía sin abortar la comparación",()=>{
 const devices=[
  lookup("Device A","device-a",[["ram","8 GB"],["storage","128 GB"],["connectivity",["",null,"  "]]]),
  lookup("Device B","device-b",[["ram","12 GB"],["storage","256 GB"],["connectivity",[]]]),
 ];
 const result=buildTechnologyComparison({lookups:devices,resource:"smartphones"});
 assert.equal(Object.hasOwn(result.products[0].attributes,"connectivity"),false);
 assert.equal(Object.hasOwn(result.products[1].attributes,"connectivity"),false);
 assert.equal(result.rows.find(row=>row.key==="connectivity").values[0].display,"Sin dato en las fuentes consultadas");
});

test("la interfaz TECH no muestra texto de ejemplo ni marcas de opcionalidad",async()=>{
 const {readFile}=await import("node:fs/promises");
 const {fileURLToPath}=await import("node:url");
 const {dirname,join}=await import("node:path");
 const main=await readFile(join(dirname(fileURLToPath(import.meta.url)),"../src/main.js"),"utf8");
 const start=main.indexOf("function renderTechComparisonForm()");
 const end=main.indexOf("function renderTechComparisonResults()",start);
 const form=main.slice(start,end);
 assert.ok(form.includes("required-marker"));
 assert.ok(form.includes('i<2?"required":""'));
 assert.doesNotMatch(form,/OBLIGATORIO|OPCIONAL|placeholder=/u);
});

test("el formulario TECH limpia los cuatro modelos al enviarlos",async()=>{
 const {readFile}=await import("node:fs/promises");
 const {fileURLToPath}=await import("node:url");
 const {dirname,join}=await import("node:path");
 const main=await readFile(join(dirname(fileURLToPath(import.meta.url)),"../src/main.js"),"utf8");
 const start=main.indexOf('if (event.target.id === "tech-compare-form")');
 const end=main.indexOf('if (event.target.id === "tech-lookup-form")',start);
 const submit=main.slice(start,end);
 assert.match(submit,/state\.techCompareModels = \["", "", "", ""\]/u);
});


test("el comparador bloquea resultados parciales y conserva el detalle de cobertura",()=>{
 const result=buildTechnologyComparison({
  resource:"smartphones",
  lookups:[
   lookup("Samsung Galaxy S26 Ultra","samsung-galaxy-s26-ultra",[["brand","Samsung"],["ram","12 GB"],["storage","256 GB"],["chipset","Snapdragon 8 Elite Gen 5"]]),
   lookup("Apple iPhone 18 Pro Max","apple-iphone-18-pro-max",[["brand","Apple"],["chipset","A20 Pro"]]),
  ],
 });
 assert.ok(result.error);
 assert.equal(result.qualityGate.valid,false);
 assert.ok(result.qualityGate.devices.some(device=>device.availableDimensionCount<3));
 assert.equal(result.ranking,null);
});

test("extrae la cámara principal desde datos estructurados y texto en MP",()=>{
 const result=buildTechnologyComparison({
  resource:"smartphones",
  lookups:[
   lookup("Phone A","camera-a",[["ram","12 GB"],["storage","512 GB"],["battery","5000 mAh"],["camera",[{type:"main",mp:200},{type:"ultrawide",mp:50}]],["weight","210 g"]]),
   lookup("Phone B","camera-b",[["ram","12 GB"],["storage","512 GB"],["battery","5000 mAh"],["camera","48 MP + 12 MP"],["weight","215 g"]]),
  ],
 });
 assert.equal(result.products[0].attributes.cameraMegapixels,200);
 assert.equal(result.products[1].attributes.cameraMegapixels,48);
});

test("la UI de TECH usa autocompletado en ficha y comparación y deja los campos vacíos",async()=>{
 const {readFile}=await import("node:fs/promises");
 const {fileURLToPath}=await import("node:url");
 const {dirname,join}=await import("node:path");
 const main=await readFile(join(dirname(fileURLToPath(import.meta.url)),"../src/main.js"),"utf8");
 assert.match(main,/searchTechnologyCatalog\(normalized, \{ resource, limit: 8 \}\)/u);
 assert.match(main,/role="combobox" aria-autocomplete="list"/u);
 assert.match(main,/id="tech-model-suggestions"/u);
 assert.match(main,/id="tech-compare-suggestions-/u);
 assert.match(main,/catalogSlug: selected\.slug/u);
 assert.match(main,/catalogSlug: item\.slug/u);
 assert.doesNotMatch(main,/placeholder="Ej\.: Samsung Galaxy S24 Ultra"/u);
 assert.doesNotMatch(main,/OBLIGATORIO|OPCIONAL/u);
});

test("un error de cobertura se muestra antes de cualquier tabla de comparación",async()=>{
 const {readFile}=await import("node:fs/promises");
 const {fileURLToPath}=await import("node:url");
 const {dirname,join}=await import("node:path");
 const main=await readFile(join(dirname(fileURLToPath(import.meta.url)),"../src/main.js"),"utf8");
 const start=main.indexOf("function renderTechComparisonResults()");
 const end=main.indexOf("function renderTech()",start);
 const renderer=main.slice(start,end);
 assert.ok(renderer.indexOf("if(result.error)") < renderer.indexOf("tech-comparison-table"));
 assert.match(renderer,/No hay datos suficientes para comparar estos modelos/u);
});
