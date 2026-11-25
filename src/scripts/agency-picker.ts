import type { Agency, District } from '../lib/shipping';

type Position = [number, number];
type SelectEntry = [value: string, name: string];

const alphabetic = new Intl.Collator('es-PE');
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

export function setupAgencyPicker(form: HTMLFormElement, submit: HTMLButtonElement, paymentEnabled: boolean) {
  const picker = form.querySelector<HTMLElement>('[data-agency-picker]')!;
  const select = (name: string) => form.querySelector(`select[name=${name}]`) as unknown as HTMLSelectElement;
  const department = select('department');
  const province = select('province');
  const district = select('ubigeo');
  const agency = select('agency');
  const status = picker.querySelector<HTMLElement>('[data-agency-status]')!;
  const selection = picker.querySelector<HTMLElement>('[data-agency-selection]')!;
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
    const outside = chosen.ubigeo !== district.value ? ' · Fuera del distrito elegido' : '';
    selection.textContent = `${chosen.address} · ${area.slice(1, 4).reverse().join(', ')}${outside}`;
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
    optionSet(agency, 'Selecciona una agencia', options.map(({ branch, kilometers }) => {
      const area = districts.get(branch.ubigeo)!;
      const place = local.length ? '' : ` · ${area[3]}, ${area[2]}`;
      const nearby = closestFrom && kilometers !== undefined ? ` · ${kilometers.toLocaleString('es-PE', { maximumFractionDigits: 1 })} km` : '';
      return [String(branch.id), `${branch.name}${place}${nearby}`];
    }), keep);
    const hint = local.length
      ? (closestFrom ? 'Agencias de tu distrito ordenadas por distancia en línea recta.' : '')
      : point ? 'Tu distrito no tiene una agencia disponible. Mostramos las más cercanas, fuera del distrito.'
        : 'Tu distrito no tiene una agencia disponible. Mostramos alternativas fuera del distrito.';
    status.textContent = [geolocationMessage, hint].filter(Boolean).join(' ');
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
    if (!navigator.geolocation) {
      geolocationMessage = 'Tu navegador no pudo compartir la ubicación. Puedes elegir una agencia de la lista.';
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
    }, () => {
      geolocationMessage = 'No pudimos acceder a tu ubicación. Puedes elegir una agencia de la lista.';
      locate.disabled = false;
      showAgencies(true);
    }, { timeout: 8000, maximumAge: 300000 });
  });
  void load();
  return { reload: load };
}
