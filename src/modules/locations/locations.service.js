const IBGE_MUNICIPALITIES_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

let cachedCities = [];
let cacheExpiresAt = 0;
let pendingLoad = null;

const normalizeSearch = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const extractState = (city) => {
  return (
    city?.microrregiao?.mesorregiao?.UF?.sigla ||
    city?.["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ||
    null
  );
};

const mapCity = (city) => {
  const state = extractState(city);
  if (!city?.nome || !state) return null;

  const label = `${city.nome}, ${state}`;
  return {
    label,
    search: normalizeSearch(label),
  };
};

const loadCitiesFromIbge = async () => {
  const response = await fetch(IBGE_MUNICIPALITIES_URL, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`IBGE respondeu com status ${response.status}`);
  }

  const data = await response.json();
  const uniqueLabels = new Set();

  return data
    .map(mapCity)
    .filter(Boolean)
    .filter((city) => {
      if (uniqueLabels.has(city.label)) return false;
      uniqueLabels.add(city.label);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
};

const getCities = async () => {
  const now = Date.now();
  if (cachedCities.length > 0 && cacheExpiresAt > now) return cachedCities;

  if (!pendingLoad) {
    pendingLoad = loadCitiesFromIbge()
      .then((cities) => {
        cachedCities = cities;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return cities;
      })
      .finally(() => {
        pendingLoad = null;
      });
  }

  try {
    return await pendingLoad;
  } catch (error) {
    if (cachedCities.length > 0) return cachedCities;
    throw error;
  }
};

export const searchCities = async ({ query, limit }) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  const cities = await getCities();

  return cities
    .filter((city) => city.search.includes(normalizedQuery))
    .slice(0, limit)
    .map((city) => city.label);
};
