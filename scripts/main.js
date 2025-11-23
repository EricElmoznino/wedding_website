const state = {
  guests: [],
  guestById: new Map(),
  tableIndex: new Map(),
  currentGuest: null
};

const elements = {
  splash: document.getElementById('splash'),
  splashError: document.getElementById('splash-error'),
  searchScreen: document.getElementById('search-screen'),
  infoScreen: document.getElementById('info-screen'),
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),
  searchHelper: document.getElementById('search-helper'),
  backButton: document.getElementById('back-button'),
  infoHeading: document.getElementById('info-heading'),
  infoSubheading: document.getElementById('info-subheading'),
  tableNumber: document.getElementById('table-number'),
  tablemates: document.getElementById('tablemates'),
  appetizer: document.getElementById('appetizer'),
  mainCourse: document.getElementById('main-course'),
  tableMapImage: document.getElementById('table-map-image'),
  photoLink: document.getElementById('photo-link')
};

const DEFAULT_TABLE_IMAGE = 'assets/images/tables/table-1.png';
const PHOTO_UPLOAD_URL = 'https://flowcode.com/p/eSwHvtolUB';
const MIN_SPLASH_DURATION = 2500;

const APPETIZER_DESCRIPTIONS = {
  soup: 'Parsnip and pear velouté',
  salad: 'Yellow beet salad, snow goat cheese with herbs, Chioggia beets, hazelnuts',
  salmon: 'Gravlax salmon with orange citrus gel, herbed labneh, pistachios and green oil'
};

const MAIN_COURSE_DESCRIPTIONS = {
  meat: 'Slow-cooked beef chuck, Yukon Gold mashed potatoes, forgotten root vegetables, and cooking jus',
  fish: 'Slow-cooked salmon fillet, carrot purée, broccolini, tomato salsa and preserved lemon',
  vegetarian: 'Roasted Eggplant Steak with Miso (vegan), Tahini, herbs, pomegranate and sesame'
};

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  const splashStart = performance.now();
  elements.searchInput.disabled = true;
  elements.photoLink.href = PHOTO_UPLOAD_URL;

  try {
    const guests = await fetchGuestData('assets/Eric Bonnie Wedding - Guests.csv');
    if (!guests.length) {
      throw new Error('No guests could be loaded from the data source.');
    }

    state.guests = guests;
    state.guestById = new Map(guests.map((guest) => [guest.id, guest]));
    state.tableIndex = buildTableIndex(guests);

    const elapsed = performance.now() - splashStart;
    if (elapsed < MIN_SPLASH_DURATION) {
      await sleep(MIN_SPLASH_DURATION - elapsed);
    }

    await hideSplash();
    activateSearch();
  } catch (error) {
    showSplashError(error);
  }
}

function activateSearch() {
  elements.searchInput.disabled = false;
  elements.searchInput.focus({ preventScroll: true });

  elements.searchInput.addEventListener('input', handleSearchInput);
  elements.searchInput.addEventListener('keydown', handleSearchKeydown);
  elements.searchResults.addEventListener('click', handleResultClick);
  elements.backButton.addEventListener('click', () => {
    state.currentGuest = null;
    setScreen(elements.searchScreen);
    clearInfoScreen();
    clearResults();
    elements.searchInput.value = '';
    elements.searchInput.setAttribute('aria-expanded', 'false');
    elements.searchHelper.textContent =
      "Can't find yourself? Double-check your spelling or ask us to update the guest list.";
    elements.searchInput.focus({ preventScroll: true });
  });
}

async function hideSplash() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      elements.splash.classList.remove('visible');
      setTimeout(resolve, 360);
    });
  });
}

function showSplashError(error) {
  console.error(error);
  elements.splashError.textContent =
    'We hit a snag while fetching the guest list. Please refresh the page in a moment.';
  elements.splashError.hidden = false;
  elements.splash.classList.add('visible');
}

function handleSearchInput(event) {
  const query = event.target.value;
  const matches = getMatches(query);
  renderResults(matches);

  if (query.trim() && matches.length === 1 && startsWithIgnoreDiacritics(matches[0].name, query)) {
    selectGuest(matches[0]);
  }
}

function handleSearchKeydown(event) {
  if (event.key !== 'Enter') {
    return;
  }

  const query = elements.searchInput.value;
  const matches = getMatches(query);
  if (matches.length === 1) {
    selectGuest(matches[0]);
  } else if (matches.length > 1) {
    selectGuest(matches[0]);
  }
}

function handleResultClick(event) {
  const button = event.target.closest('button[data-guest-id]');
  if (!button) {
    return;
  }

  const guest = state.guestById.get(button.dataset.guestId);
  if (guest) {
    selectGuest(guest);
  }
}

function selectGuest(guest) {
  state.currentGuest = guest;
  populateInfoScreen(guest);
  setScreen(elements.infoScreen);
  elements.searchInput.setAttribute('aria-expanded', 'false');
}

function setScreen(target) {
  for (const screen of [elements.searchScreen, elements.infoScreen]) {
    if (screen === target) {
      screen.classList.add('active');
      screen.hidden = false;
    } else {
      screen.classList.remove('active');
      screen.hidden = true;
    }
  }
}

function populateInfoScreen(guest) {
  elements.infoHeading.textContent = `${guest.name}!`;
  elements.infoSubheading.textContent = "Here's everything you need for tonight.";

  if (guest.table && guest.table !== 'TBD') {
    elements.tableNumber.textContent = `You are seated at Table ${guest.table}.`;
  } else {
    elements.tableNumber.textContent = 'Your table number will be confirmed shortly.';
  }

  const tablemates = (state.tableIndex.get(guest.table) || []).filter((mate) => mate.id !== guest.id);
  renderTablemates(tablemates);

  elements.appetizer.textContent = `Your appetizer: ${guest.appetizerDescription}.`;
  elements.mainCourse.textContent = `Your main course: ${guest.mainCourseDescription}.`;

  updateTableImage(guest.table);
}

function clearInfoScreen() {
  elements.infoHeading.textContent = '';
  elements.infoSubheading.textContent = '';
  elements.tableNumber.textContent = '';
  elements.tablemates.textContent = '';
  elements.appetizer.textContent = '';
  elements.mainCourse.textContent = '';
  elements.tableMapImage.src = DEFAULT_TABLE_IMAGE;
  delete elements.tableMapImage.dataset.currentImage;
  elements.tableMapImage.onerror = null;
  elements.tableMapImage.onload = null;
}

function updateTableImage(tableValue) {
  const img = elements.tableMapImage;
  const fallback = DEFAULT_TABLE_IMAGE;

  const useFallback = () => {
    img.onerror = null;
    img.onload = null;
    if (img.src !== fallback) {
      img.src = fallback;
    }
    img.dataset.currentImage = fallback;
  };

  if (!tableValue || tableValue === 'TBD') {
    useFallback();
    return;
  }

  const sanitized = String(tableValue)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const candidate = `assets/images/tables/table-${sanitized}.png`;

  if (img.dataset.currentImage === candidate) {
    return;
  }

  img.onerror = () => {
    useFallback();
  };
  img.onload = () => {
    img.dataset.currentImage = candidate;
    img.onload = null;
  };
  img.src = candidate;
}

function clearResults() {
  elements.searchResults.innerHTML = '';
}

function renderResults(matches) {
  clearResults();

  const query = elements.searchInput.value.trim();
  elements.searchInput.setAttribute('aria-expanded', matches.length > 0 ? 'true' : 'false');

  if (!query) {
    elements.searchHelper.textContent =
      'Start typing your first or last name to see your table assignment.';
    return;
  }

  if (!matches.length) {
    elements.searchHelper.textContent =
      'No matching guests just yet. Please check the spelling or reach out to Bonnie & Eric.';
    return;
  }

  elements.searchHelper.textContent = `Showing ${matches.length} matching ${
    matches.length === 1 ? 'guest' : 'guests'
  }.`;

  for (const guest of matches.slice(0, 12)) {
    const item = document.createElement('li');
    item.setAttribute('role', 'presentation');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    button.dataset.guestId = guest.id;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-label', `${guest.name}, Table ${guest.table}`);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'search-result-name';
    nameSpan.textContent = guest.name;

    button.appendChild(nameSpan);
    item.appendChild(button);
    elements.searchResults.appendChild(item);
  }
}

function getMatches(rawQuery) {
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }

  const normalizedQuery = normalizeForSearch(query);
  return state.guests
    .filter((guest) => guest.searchKey.includes(normalizedQuery))
    .sort((a, b) => {
      // Prefer exact prefix matches, then alphabetical
      const aStarts = startsWithIgnoreDiacritics(a.name, query);
      const bStarts = startsWithIgnoreDiacritics(b.name, query);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    });
}

async function fetchGuestData(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load data (status ${response.status}).`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  return cleanGuestRows(rows);
}

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, ''); // strip BOM if present

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          currentValue += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentValue);
      currentValue = '';
    } else if (char === '\r') {
      // ignore carriage returns
    } else if (char === '\n') {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  currentRow.push(currentValue);
  rows.push(currentRow);

  return rows.filter((row) => row.some((value) => value.trim() !== ''));
}

function cleanGuestRows(rows) {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.trim() === 'Name'));
  if (headerIndex === -1) {
    throw new Error('Could not locate the header row in the CSV file.');
  }

  const header = rows[headerIndex].map((cell) => cell.trim());
  const dataRows = rows.slice(headerIndex + 1);

  const guests = [];

  for (const row of dataRows) {
    if (!row.length) continue;

    const record = {};
    header.forEach((key, index) => {
      record[key] = typeof row[index] === 'string' ? row[index].trim() : '';
    });

    const attending = (record['Attending'] || '').toLowerCase();
    if (attending !== 'yes') {
      continue;
    }

    let name = record['Name'] || '';
    name = name.replace(/\s+\+1$/i, '').trim();
    if (!name) {
      continue;
    }

    const table = record['Table'] && record['Table'].trim() ? record['Table'].trim() : 'TBD';
    const appetizerCode = record['Meal -- Appetizer'] || '';
    const mainCourseCode = record['Meal -- Main course'] || '';

    const guest = {
      id: slugify(`${name}-${table || 'tbd'}`),
      name,
      searchKey: normalizeForSearch(name),
      table,
      appetizerCode,
      mainCourseCode,
      appetizerDescription: describeAppetizer(appetizerCode),
      mainCourseDescription: describeMainCourse(mainCourseCode)
    };

    guests.push(guest);
  }

  return guests;
}

function buildTableIndex(guests) {
  const map = new Map();
  for (const guest of guests) {
    const key = guest.table || 'TBD';
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(guest);
  }
  return map;
}

function normalizeForSearch(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function startsWithIgnoreDiacritics(value, query) {
  return normalizeForSearch(value).startsWith(normalizeForSearch(query.trim()));
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderTablemates(tablemates) {
  elements.tablemates.innerHTML = '';

  if (!tablemates.length) {
    elements.tablemates.textContent =
      'At this table are also seated guests to be confirmed -- you might be one of the first to arrive!';
    return;
  }

  tablemates.forEach((mate, index) => {
    elements.tablemates.appendChild(document.createTextNode(mate.name));
    if (index !== tablemates.length - 1) {
      elements.tablemates.appendChild(document.createElement('br'));
    }
  });
}

function describeAppetizer(value) {
  return describeMeal(value, APPETIZER_DESCRIPTIONS);
}

function describeMainCourse(value) {
  return describeMeal(value, MAIN_COURSE_DESCRIPTIONS);
}

function describeMeal(value, lookup) {
  if (!value) {
    return "Chef's choice";
  }

  const key = value.trim().toLowerCase();
  if (!key) {
    return "Chef's choice";
  }

  if (lookup[key]) {
    return lookup[key];
  }

  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
