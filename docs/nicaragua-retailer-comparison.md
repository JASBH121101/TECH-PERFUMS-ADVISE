# Comparación exacta entre comercios de Nicaragua

## Propósito

`compareNicaraguaRetailerOffers()` consulta URLs exactas de producto en RadioShack, La Curacao y SIMAN. No busca categorías ni rastrea catálogos. Cada adaptador conserva sus restricciones de host, ruta, lectura GET, caché y timeout.

## Regla de identidad

El motor compara primero los identificadores universales (GTIN/EAN/UPC) y los identificadores de fabricante (MPN), y valida RAM/almacenamiento detectables en el nombre del producto. Un SKU interno de tienda no se trata como código universal, aunque una página lo etiquete incorrectamente como UPC si el mismo valor también aparece como SKU.

- `exact_variant`: todas las tiendas solicitadas coinciden en la misma variante.
- `partial_exact_variant`: al menos dos tiendas coinciden exactamente, pero una o más tiendas quedaron sin identidad suficiente; solo se puede comparar ese subconjunto.
- `review_required`: faltan identificadores comunes o hay atributos de variante insuficientes/conflictivos.
- `mismatch`: hay un conflicto explícito entre identificadores universales o identificadores de fabricante.
- `incomplete`: al menos una tienda no entregó identidad utilizable.

Los precios se ordenan únicamente dentro del conjunto con identidad exacta demostrada, cuando cada tienda de ese conjunto publica un precio y todas usan la misma moneda y el mismo estado de inclusión de impuestos. Si falta una tienda, el resultado se marca `partial_comparable` y no declara ganador global. No se convierten monedas ni se estiman IVA, envío, financiación o cargos de checkout.

## Resultado y seguridad

Cada oferta conserva URL, valores publicados, fuentes y marcas de tiempo por campo. Los datos continúan como candidatos no confirmados; la comparación no escribe en la base de conocimiento ni verifica datos de forma automática. La disponibilidad debe confirmarse con la tienda antes de comprar.

## Primer caso de smoke

Samsung Galaxy A17 4 GB RAM / 128 GB, gris:

- RadioShack: `https://www.radioshackla.com/nicaragua/celular-samsung-a17-128-gb-6-7-470890800019-gris/p`
- La Curacao: `https://www.lacuracaonline.com/nicaragua/celular-samsung-a17-128-gb-6-7-470890800019-gris/p`
- SIMAN: `https://ni.siman.com/celular-samsung-galaxy-a17-128gb-4gb-ram-pantalla-6-7---17-02-cm--octa-core-camara-trasera-triple-50mp-/p`

Las URLs son muestras concretas; una respuesta bloqueada, ausente o desactualizada se reporta como incompleta/diferida. No se da por supuesto que un slug funcione en el storefront de otro país.
