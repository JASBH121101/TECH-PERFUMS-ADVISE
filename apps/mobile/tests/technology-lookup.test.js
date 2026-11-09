import test from "node:test";
import assert from "node:assert/strict";
import {
  lookupTechnology,
  slugifyTechnologyModel,
  buildTechApiSlugCandidates,
  buildPrimarySpecSourceLinks,
} from "../src/technology-lookup.js";

const noPrimarySources = async (_path, _params, id, name) => ({
  id, name, status: "not_found", source: null, observedAt: null,
  facts: [], variants: [], error: null,
});

test("convierte el nombre del modelo en slug sin acentos", () => {
  assert.equal(slugifyTechnologyModel("  Samsung Galaxy A17  "), "samsung-galaxy-a17");
  assert.equal(slugifyTechnologyModel("Xiaomi 14T Pro"), "xiaomi-14t-pro");
});

test("consulta dos fuentes exactas y conserva el estado pendiente de revisión", async () => {
  const coreInfoProvider = {
    async search(request) {
      return request.field === "name"
        ? [{ value: "Galaxy A17", source: { name: "CoreInfo", url: "https://example.test/core" }, observedAt: "2026-11-08T00:00:00.000Z" }]
        : [];
    },
  };
  const techApiProvider = {
    async search(request) {
      return request.field === "name"
        ? [{ value: "Galaxy A17", source: { name: "TechAPI", url: "https://example.test/tech" }, observedAt: "2026-11-08T00:00:00.000Z" }]
        : [];
    },
  };
  const result = await lookupTechnology({
    model: "Samsung Galaxy A17",
    resource: "smartphones",
    coreInfoProvider,
    techApiProvider,
    primarySourceFetcher: noPrimarySources,
  });
  assert.equal(result.slug, "samsung-galaxy-a17");
  assert.equal(result.hasResults, true);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.saved, false);
  assert.equal(result.sources.length, 4);
  assert.deepEqual(result.sources.slice(0, 2).map(source => source.id), ["gsmarena", "xataka"]);
  assert.deepEqual(result.sources.slice(2).map(source => source.id), ["coreinfo", "techapi"]);
  assert.equal(result.sources[2].facts[0].value, "Galaxy A17");
});

test("rechaza categorías no soportadas", async () => {
  await assert.rejects(
    lookupTechnology({ model: "Some model", resource: "device-catalog" }),
    /categoría de dispositivo/,
  );
});

test("limita la consulta a campos solicitados y rechaza campos desconocidos",async()=>{
 const requests=[],provider={async search(request){requests.push(request.field);return[];}};
 await lookupTechnology({model:"Galaxy A17",resource:"smartphones",fields:["name","brand"],coreInfoProvider:provider,techApiProvider:provider,primarySourceFetcher:async(_path,_params,id,name)=>({id,name,status:"not_found",source:null,observedAt:null,facts:[],variants:[]})});
 assert.deepEqual(requests.sort(),["brand","manufacturer","name","name"]);
 await assert.rejects(lookupTechnology({model:"Galaxy A17",fields:["ram"]}),/solo pueden aportar identidad básica/);
 await assert.rejects(lookupTechnology({model:"Galaxy A17",fields:["imei"]}),/solo pueden aportar identidad básica/);
});


test("deriva slugs distintos para CoreInfo y TechAPI desde el modelo seleccionado",()=>{
 assert.deepEqual(
  buildTechApiSlugCandidates("Samsung Galaxy S26 Ultra","samsung-galaxy-s26-ultra"),
  ["samsung-galaxy-s26-ultra","galaxy-s26-ultra"],
 );
 assert.deepEqual(
  buildTechApiSlugCandidates("Apple iPhone 18 Pro Max","apple-iphone-18-pro-max"),
  ["apple-iphone-18-pro-max","iphone-18-pro-max"],
 );
});

test("reintenta TechAPI con el alias canonical cuando el slug CoreInfo no existe",async()=>{
 const coreQueries=[],techQueries=[];
 const coreInfoProvider={async search(request){coreQueries.push(request.query);return request.field==="name"?[{value:"Samsung Galaxy S26 Ultra",source:{name:"CoreInfo",url:"https://example.test/core"}}]:[];}};
 const techApiProvider={async search(request){
  techQueries.push(request.query);
  if(request.query==="smartphones:samsung-galaxy-s26-ultra") throw new Error("404 record not found");
  return request.field==="name"?[{value:"Galaxy S26 Ultra",source:{name:"TechAPI",url:"https://example.test/tech"}}]:[];
 }};
 const result=await lookupTechnology({
  model:"Samsung Galaxy S26 Ultra",
  catalogSlug:"samsung-galaxy-s26-ultra",
  resource:"smartphones",
  fields:["name","brand"],
  coreInfoProvider,
  techApiProvider,
  primarySourceFetcher: noPrimarySources,
 });
 assert.deepEqual(coreQueries,["samsung-galaxy-s26-ultra","samsung-galaxy-s26-ultra"]);
 assert.ok(techQueries.includes("smartphones:samsung-galaxy-s26-ultra"));
 assert.ok(techQueries.includes("smartphones:galaxy-s26-ultra"));
 assert.equal(result.techApiSlug,"galaxy-s26-ultra");
 assert.equal(result.sources[3].status,"found");
});


test("incluye variantes de slug para Samsung y Apple cuando las fuentes las separan",()=>{
 assert.deepEqual(buildTechApiSlugCandidates("Samsung Galaxy S26 Ultra","samsung-galaxy-s26-ultra"),[
  "samsung-galaxy-s26-ultra","galaxy-s26-ultra"
 ]);
 assert.deepEqual(buildTechApiSlugCandidates("Apple iPhone 18 Pro Max","apple-iphone-18-pro-max"),[
  "apple-iphone-18-pro-max","iphone-18-pro-max"
 ]);
});

test("reintenta TechAPI con el slug sin marca después de un 404",async()=>{
 const coreQueries=[],techQueries=[];
 const coreInfoProvider={async search(request){
  coreQueries.push(request.query);
  return request.field==="name"?[{value:"Samsung Galaxy S26 Ultra",source:{name:"CoreInfo",url:"https://example.test/core"}}]:[];
 }};
 const techApiProvider={async search(request){
  techQueries.push(request.query);
  if(request.query==="smartphones:samsung-galaxy-s26-ultra") throw new Error("404 record not found");
  return request.field==="name"?[{value:"Galaxy S26 Ultra",source:{name:"TechAPI",url:"https://example.test/tech"}}]:[];
 }};
 const result=await lookupTechnology({
  model:"Samsung Galaxy S26 Ultra",
  catalogSlug:"samsung-galaxy-s26-ultra",
  resource:"smartphones",
  fields:["name","brand"],
  coreInfoProvider,
  techApiProvider,
  primarySourceFetcher: noPrimarySources,
 });
 assert.equal(result.slug,"samsung-galaxy-s26-ultra");
 assert.equal(result.techApiSlug,"galaxy-s26-ultra");
 assert.ok(coreQueries.every(query=>query==="samsung-galaxy-s26-ultra"));
 assert.ok(techQueries.includes("smartphones:galaxy-s26-ultra"));
});


test("GSMArena y Xataka son las fuentes principales en orden de prioridad",()=>{
 const links=buildPrimarySpecSourceLinks("Samsung Galaxy S26 Ultra");
 assert.deepEqual(links.map(item=>item.id),["gsmarena","xataka"]);
 assert.equal(links[0].priority,1);
 assert.match(links[0].url,/gsmarena\.com\/results\.php3\?sQuickSearch=/u);
 assert.equal(links[1].url,"https://www.xataka.com/la-cacharreria/search");
 assert.equal(links[0].role,"Fuente principal de especificaciones");
});

test("rechaza modelos vacíos al preparar los enlaces de fuentes principales",()=>{
 assert.throws(()=>buildPrimarySpecSourceLinks(" "),/modelo/);
});
