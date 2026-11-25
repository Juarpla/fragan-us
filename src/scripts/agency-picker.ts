import type { Agency, District } from '../lib/shipping';

type Position = [number, number];
type SelectEntry = [value: string, name: string];

const alphabetic = new Intl.Collator('es-PE');
const samePlace = new Intl.Collator('es-PE', { sensitivity: 'base' });
const sortedEntries = (values: SelectEntry[]) => values.sort((a, b) => alphabetic.compare(a[1], b[1]));

function optionSet(select: HTMLSelectElement, prompt: string, entries: SelectEntry[], keep = false) {
  const current = select.value;
  select.replaceChildren(new Option(prompt, ''), ...entries.map(([value, name]) => new Option(name, value)));
  select.disabled = entries.length === 0;
  select.value = keep && entries.some(([value]) => value === current) ? current : '';
}

function distance(from: Position, to: Position) {
  const radians = Math.PI / 180;
  const latitude = Math.sin((to[0] - from[0]) * radians / 2);
  const longitude = Math.sin((to[1] - from[1]) * radians / 2);
  const angle = latitude ** 2 + Math.cos(from[0] * radians) * Math.cos(to[0] * radians) * longitude ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(angle)));
}

function centerOf([, , , , lat, lng]: District): Position | undefined {
  return lat === null || lng === null ? undefined : [lat, lng];
}

function streetAddress(address: string, area: string[]) {
  const parts = address.split(/(,\s*|\s+[-–]\s+)/);
  while (parts.length > 1 && area.some(place => samePlace.compare(place, parts.at(-1)!.trim()) === 0)) {
    parts.splice(-2);
  }
  return parts.join('').trim();
}

export function setupAgencyPicker(form: HTMLFormElement, submit: HTMLButtonElement, paymentEnabled: boolean) {
  const picker = form.querySelector<HTMLElement>('[data-agency-picker]')!;
  const select = (name: string) => form.querySelector(`select[name=${name}]`) as unknown as HTMLSelectElement;
  const department = select('department');
  const province = select('province');
  const district = select('ubigeo');
  const agency = select('agency');
  const status = picker.querySelector<HTMLElement>('[data-agency-status]')!;
  const selection = picker.querySelector<HTMLElement>('[data-agency-selection]')!;
  const region = selection.querySelector<HTMLElement>('[data-agency-region]')!;
  const street = selection.querySelector<HTMLElement>('[data-agency-street]')!;
  const reference = selection.querySelector<HTMLElement>('[data-agency-reference]')!;
  const outside = selection.querySelector<HTMLElement>('[data-agency-outside]')!;
  const agencyField = picker.querySelector<HTMLElement>('[data-agency-field]')!;
  const retry = picker.querySelector<HTMLButtonElement>('[data-reload-agencies]')!;
  const locationPanel = picker.querySelector<HTMLElement>('[data-location-panel]')!;
  const locate = picker.querySelector<HTMLButtonElement>('[data-use-location]')!;
  let agencies: Agency[] = [];
  let districts = new Map<string, District>();
  let closestFrom: Position | undefined;
  let geolocationMessage = '';
  let loading = false;

  function showSelection() {
    const chosen = agencies.find(branch => String(branch.id) === agency.value);
    agency.setCustomValidity('');
    selection.hidden = !chosen;
    if (!chosen) return;
    const area = districts.get(chosen.ubigeo)!;
    const [address, ...details] = chosen.address.split(/(?:[,;–-]\s*|\s+)ref(?:erencia)?[.:]\s*/i);
    const [, departmentName, provinceName, districtName] = area;
    const places = [districtName, provinceName, departmentName];
    region.textContent = places.join(', ');
    street.textContent = streetAddress(address, places) || 'Dirección aún no disponible.';
    reference.textContent = details.length ? `Referencia: ${details.join(' · ')}` : '';
    reference.hidden = !details.length;
    outside.hidden = chosen.ubigeo === district.value;
  }

  function showAgencies(keep = false) {
    const selected = districts.get(district.value);
    agencyField.hidden = !selected;
    locationPanel.hidden = !selected;
    if (!selected) {
      status.textContent = '';
      optionSet(agency, 'Selecciona una agencia', []);
      showSelection();
      return;
    }
    const local = agencies.filter(item => item.ubigeo === selected[0]);
    const provinceCapital = districts.get(selected[0].slice(0, 4) + '01');
    const point = closestFrom ?? centerOf(selected) ?? (provinceCapital && centerOf(provinceCapital));
    const ranked = (local.length ? local : agencies).map(branch => ({
      branch, kilometers: point ? distance(point, [branch.latitude, branch.longitude]) : undefined,
    }));
    ranked.sort((a, b) => {
      if (a.kilometers !== undefined && b.kilometers !== undefined) return a.kilometers - b.kilometers;
      return Number(b.branch.ubigeo.startsWith(selected[0].slice(0, 4))) - Number(a.branch.ubigeo.startsWith(selected[0].slice(0, 4))) ||
        Number(b.branch.ubigeo.startsWith(selected[0].slice(0, 2))) - Number(a.branch.ubigeo.startsWith(selected[0].slice(0, 2))) ||
        alphabetic.compare(a.branch.name, b.branch.name);
    });
    const options = local.length ? ranked : ranked.slice(0, 5);
    if (keep && agency.value && !options.some(({ branch }) => String(branch.id) === agency.value)) {
      const current = ranked.find(({ branch }) => String(branch.id) === agency.value);
      if (current) options.push(current);
    }
    optionSet(agency, 'Selecciona una agencia', options.map(({ branch, kilometers }) => {
      const area = districts.get(branch.ubigeo)!;
      const place = local.length ? '' : ` · ${area[3]}, ${area[2]}`;
      const nearby = closestFrom && kilometers !== undefined ? ` · ${kilometers.toLocaleString('es-PE', { maximumFractionDigits: 1 })} km` : '';
      return [String(branch.id), `${branch.name}${place}${nearby}`];
    }), keep);
    const areaHint = local.length ? '' : 'Tu distrito no tiene una agencia disponible. Mostramos alternativas fuera del distrito.';
    let sortHint = '';
    if (closestFrom) {
      sortHint = options.length === 1 ? 'Distancia desde tu ubicación en línea recta.' : 'Agencias ordenadas por distancia en línea recta.';
    } else if (point && (geolocationMessage || !local.length)) {
      sortHint = 'La cercanía se estima desde la zona que elegiste.';
    }
    status.textContent = [geolocationMessage, areaHint, sortHint].filter(Boolean).join(' ');
    showSelection();
  }

  function showDistricts(keep = false) {
    optionSet(district, 'Selecciona', sortedEntries([...districts.values()]
      .filter(row => province.value && row[0].startsWith(province.value)).map(row => [row[0], row[3]])), keep);
    showAgencies(keep);
  }

  function showProvinces(keep = false) {
    const options = new Map<string, string>();
    for (const [code, , label] of districts.values()) {
      if (department.value && code.startsWith(department.value)) options.set(code.slice(0, 4), label);
    }
    optionSet(province, 'Selecciona', sortedEntries([...options]), keep);
    showDistricts(keep);
  }

  async function load() {
    if (loading) return;
    loading = true;
    submit.disabled = true;
    retry.hidden = true;
    status.textContent = 'Cargando el listado de agencias…';
    agency.disabled = true;
    try {
      const response = await fetch('/api/shipping/agencies', { cache: 'reload', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Listado no disponible.');
      const data = await response.json<{ agencies: Agency[]; districts: District[] }>();
      agencies = data.agencies;
      districts = new Map(data.districts.map(row => [row[0], row]));
      const options = new Map([...districts.values()].map(row => [row[0].slice(0, 2), row[1]]));
      optionSet(department, 'Selecciona', sortedEntries([...options]), true);
      showProvinces(true);
      submit.disabled = !paymentEnabled;
    } catch {
      status.textContent = 'No pudimos cargar las agencias. Vuelve a intentarlo.';
      retry.hidden = false;
    } finally {
      loading = false;
    }
  }

  department.addEventListener('change', () => showProvinces());
  province.addEventListener('change', () => showDistricts());
  district.addEventListener('change', () => showAgencies());
  agency.addEventListener('change', showSelection);
  retry.addEventListener('click', () => void load());
  locate.addEventListener('click', () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      closestFrom = undefined;
      geolocationMessage = 'La ubicación no está disponible en este navegador. Puedes elegir una agencia de la lista.';
      showAgencies(true);
      return;
    }
    locate.disabled = true;
    status.textContent = 'Buscando agencias cerca de ti…';
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      closestFrom = [coords.latitude, coords.longitude];
      geolocationMessage = '';
      locate.disabled = false;
      showAgencies(true);
    }, ({ code }) => {
      closestFrom = undefined;
      geolocationMessage = code === 1
        ? 'El navegador bloqueó el acceso a tu ubicación. Puedes habilitarlo en los permisos del sitio.'
        : code === 3
          ? 'La ubicación tardó demasiado. Puedes volver a intentarlo.'
          : 'El dispositivo no pudo determinar tu ubicación. Revisa si tienes activados los servicios de ubicación.';
      locate.disabled = false;
      showAgencies(true);
    }, { timeout: 12000, maximumAge: 300000 });
  });
  void load();
  return { reload: load };
}
