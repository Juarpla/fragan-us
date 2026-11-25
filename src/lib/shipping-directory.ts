import snapshot from '../data/shalom-agencies.json';
import districtRows from '../data/peru-districts.json';
import type { AgencyDirectory, District } from './shipping';

const publishedDirectory = 'https://raw.githubusercontent.com/Juarpla/fragan-us/main/src/data/shalom-agencies.json';
export const districts = districtRows as District[];
export const districtsByCode = new Map(districts.map(district => [district[0], district]));

export async function getAgencyDirectory(env: StoreEnv): Promise<AgencyDirectory> {
  if (env.DEMO_MODE === 'true') return snapshot;
  try {
    const response = await fetch(publishedDirectory, {
      cf: { cacheEverything: true, cacheTtlByStatus: { '200': 900, '400-599': 0 } },
      signal: AbortSignal.timeout(3500),
    });
    if (response.ok) {
      const data = await response.json<AgencyDirectory>();
      if (data.agencies?.length >= 100 && data.checkedAt >= snapshot.checkedAt &&
          data.agencies.every(agency => districtsByCode.has(agency.ubigeo))) return data;
    }
  } catch {
    // A verified copy ships with the Worker for outages of the public feed.
  }
  return snapshot;
}
