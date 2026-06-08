// IMPORTANT: Les clés doivent être NORMALISÉES (sans accents, tirets → espaces)
export const CITY_TO_REGION: Record<string, string> = {
  douala: "Littoral",
  yaounde: "Centre",
  garoua: "Nord",
  bamenda: "Nord-Ouest",
  maroua: "Extrême-Nord",
  bafoussam: "Ouest",
  ngaoundere: "Adamaoua",
  kribi: "Sud",
  buea: "Sud-Ouest",
};

export const normalizeKey = (val?: string | null) =>
  (val || "")
    .trim()
    .toLowerCase()
    // retire les accents (Yaoundé -> yaounde)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // uniformise séparateurs (Nord-Ouest -> nord ouest)
    .replace(/[-_,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getRegionFromCity = (city?: string | null) => {
  const k = normalizeKey(city);
  if (!k) return "Autre";

  // 1) Match exact (cas standard: "Douala", "Yaoundé", etc.)
  const direct = CITY_TO_REGION[k];
  if (direct) return direct;

  // 2) Match "contains" pour les valeurs provenant du geocoding
  // ex: "Douala II, Communauté urbaine de Douala, ... Région du Littoral, Cameroun"
  for (const [cityKey, region] of Object.entries(CITY_TO_REGION)) {
    if (k.includes(cityKey)) return region;
  }

  // 3) Match direct sur la région (souvent présent dans les adresses: "region du centre", etc.)
  for (const region of SELECTABLE_REGIONS) {
    const rk = normalizeKey(region);
    if (rk && k.includes(rk)) return region;

    // cas fréquent: "region du <region>"
    if (rk && (k.includes(`region du ${rk}`) || k.includes(`region de l ${rk}`) || k.includes(`region de la ${rk}`))) {
      return region;
    }
  }

  return "Autre";
};

export const REGION_ORDER = [
  "Toutes",
  "Mes régions",
  "Littoral",
  "Centre",
  "Ouest",
  "Nord-Ouest",
  "Sud-Ouest",
  "Sud",
  "Adamaoua",
  "Nord",
  "Extrême-Nord",
  "Autre",
];

export const SELECTABLE_REGIONS = REGION_ORDER.filter(
  (r) => r !== "Toutes" && r !== "Mes régions" && r !== "Autre"
);
