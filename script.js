// No backend/browser-only: this app performs all calculations client-side and makes no network requests.
const RUNES = ["MANA", "POISON", "BLOOD", "MOON", "DARK"];

const STATIONS = [
  { name: "Grave", legendary: "Lich", bonus: 5, cost: { MANA: 320 } },
  { name: "Supply Cupboard", legendary: "Gorgon", bonus: 5, cost: { POISON: 320 } },
  { name: "Altar", legendary: "Harpy", bonus: 5, cost: { BLOOD: 320 } },
  { name: "Lectern", legendary: "Reaper", bonus: 10, cost: { MOON: 320, MANA: 800 } },
  { name: "Fridge", legendary: "Cyclops", bonus: 10, cost: { MOON: 320, POISON: 800 } },
  { name: "Portal", legendary: "Archdemon", bonus: 10, cost: { BLOOD: 480, DARK: 480 } },
  { name: "Chicken", legendary: "Robo Chicken", bonus: 10, cost: { POISON: 240, MANA: 480 } },
];

function createFields() {
  const runeFields = document.getElementById("rune-fields");
  const stationFields = document.getElementById("station-fields");

  RUNES.forEach((rune) => runeFields.appendChild(numberField(`rune-${rune}`, rune, 0)));
  STATIONS.forEach((station, idx) =>
    stationFields.appendChild(numberField(`station-${idx}`, station.name, 0)),
  );
}

function numberField(id, labelText, initial) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = labelText;

  const input = document.createElement("input");
  input.id = id;
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = String(initial);

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function getNonNegativeInt(id) {
  const value = Number(document.getElementById(id).value);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function vecFromCost(cost) {
  return RUNES.map((rune) => cost[rune] ?? 0);
}

function addVec(a, b) {
  return a.map((v, i) => v + b[i]);
}

function subVec(a, b) {
  return a.map((v, i) => v - b[i]);
}

function mulVec(v, n) {
  return v.map((x) => x * n);
}

function leqVec(a, b) {
  return a.every((v, i) => v <= b[i]);
}

function maxCountForBudget(cost, budget) {
  const limits = cost.map((c, i) => (c > 0 ? Math.floor(budget[i] / c) : Number.POSITIVE_INFINITY));
  return Math.min(...limits);
}

function solveOptimal(runes, builtMaxStations) {
  const budget = RUNES.map((r) => runes[r]);
  const packageTypes = [];

  STATIONS.forEach((station, idx) => {
    const base = vecFromCost(station.cost);
    const existing = builtMaxStations[station.name] ?? 0;

    if (existing % 2 === 1) {
      packageTypes.push({ stationIdx: idx, cost: base, bonus: station.bonus, isFirst: true });
    }

    packageTypes.push({ stationIdx: idx, cost: mulVec(base, 2), bonus: station.bonus, isFirst: false });
  });

  const bonusPerResource = RUNES.map((_, ri) => {
    let best = 0;
    packageTypes.forEach((pkg) => {
      if (pkg.cost[ri] > 0) {
        best = Math.max(best, pkg.bonus / pkg.cost[ri]);
      }
    });
    return best;
  });

  let bestBonus = -1;
  let bestUsage = null;
  const currentCounts = new Array(packageTypes.length).fill(0);

  function optimisticBound(remaining) {
    const bounds = [];
    remaining.forEach((amount, ri) => {
      if (bonusPerResource[ri] > 0) {
        bounds.push(amount * bonusPerResource[ri]);
      }
    });
    return bounds.length ? Math.min(...bounds) : 0;
  }

  function dfs(i, spent, currentBonus) {
    if (i === packageTypes.length) {
      if (currentBonus > bestBonus) {
        bestBonus = currentBonus;
        bestUsage = [...currentCounts];
      }
      return;
    }

    const remaining = subVec(budget, spent);
    if (currentBonus + optimisticBound(remaining) < bestBonus) {
      return;
    }

    const pkg = packageTypes[i];
    const limit = pkg.isFirst ? 1 : maxCountForBudget(pkg.cost, remaining);

    for (let count = limit; count >= 0; count -= 1) {
      const addCost = mulVec(pkg.cost, count);
      const nextSpent = addVec(spent, addCost);
      if (!leqVec(nextSpent, budget)) {
        continue;
      }
      currentCounts[i] = count;
      dfs(i + 1, nextSpent, currentBonus + count * pkg.bonus);
    }

    currentCounts[i] = 0;
  }

  dfs(0, [0, 0, 0, 0, 0], 0);

  const builtNow = Object.fromEntries(STATIONS.map((s) => [s.name, 0]));
  const spent = [0, 0, 0, 0, 0];

  bestUsage.forEach((count, i) => {
    if (count === 0) {
      return;
    }
    const pkg = packageTypes[i];
    const station = STATIONS[pkg.stationIdx];
    builtNow[station.name] += pkg.isFirst ? 1 : 2 * count;
    spent.forEach((_, ri) => {
      spent[ri] += pkg.cost[ri] * count;
    });
  });

  const totalBuilt = Object.fromEntries(
    STATIONS.map((s) => [s.name, (builtMaxStations[s.name] ?? 0) + builtNow[s.name]]),
  );

  const newLegendaries = {};
  STATIONS.forEach((s) => {
    const oldCount = Math.floor((builtMaxStations[s.name] ?? 0) / 2);
    const newCount = Math.floor(totalBuilt[s.name] / 2);
    const gained = newCount - oldCount;
    if (gained > 0) {
      newLegendaries[s.legendary] = gained;
    }
  });

  const leftover = Object.fromEntries(RUNES.map((r, i) => [r, budget[i] - spent[i]]));

  const suggestions = STATIONS.map((s) => {
    const total = totalBuilt[s.name];
    const neededStations = total % 2 === 1 ? 1 : 2;
    const neededCost = {};
    Object.entries(s.cost).forEach(([k, v]) => {
      neededCost[k] = v * neededStations;
    });

    const deficits = Object.fromEntries(
      RUNES.map((r) => [r, Math.max(0, (neededCost[r] ?? 0) - leftover[r])]),
    );

    const missingTotal = Object.values(deficits).reduce((a, b) => a + b, 0);
    return { station: s, deficits, missingTotal, neededStations };
  }).sort((a, b) => a.missingTotal - b.missingTotal || b.station.bonus - a.station.bonus);

  return {
    bonus: bestBonus,
    spent: Object.fromEntries(RUNES.map((r, i) => [r, spent[i]])),
    leftover,
    builtNow,
    newLegendaries,
    suggestions: suggestions.slice(0, 3),
  };
}

function renderResults(result) {
  const results = document.getElementById("results");
  results.classList.remove("hidden");

  const builtRows = STATIONS.filter((s) => result.builtNow[s.name] > 0)
    .map((s) => `<li>${s.name}: ${result.builtNow[s.name]}</li>`)
    .join("");

  const legRows = Object.entries(result.newLegendaries)
    .map(([name, count]) => `<li>${name} x${count}</li>`)
    .join("");

  const spendingRows = RUNES.map(
    (r) => `<li>${r}: spent ${result.spent[r]}, left ${result.leftover[r]}</li>`,
  ).join("");

  const suggestionRows = result.suggestions
    .map((entry) => {
      const neededLabel = entry.neededStations === 1 ? "one" : "two";
      const missing = Object.entries(entry.deficits)
        .filter(([, amount]) => amount > 0)
        .map(([r, amount]) => `${r} +${amount}`)
        .join(", ");

      return `<li>
        <strong>${entry.station.legendary} (${entry.station.name})</strong>: need ${neededLabel} max station(s)
        <br/>
        ${missing || "You can already afford this next legendary."}
      </li>`;
    })
    .join("");

  results.innerHTML = `
    <h2>Optimal plan</h2>
    <p><strong>Total restart bonus gained now: +${result.bonus}%</strong></p>

    <h3 class="subheading">Build these additional MAX stations</h3>
    ${builtRows ? `<ul>${builtRows}</ul>` : "<p>(No legendary-completing build is affordable right now.)</p>"}

    <h3 class="subheading">You can craft these new legendaries</h3>
    ${legRows ? `<ul>${legRows}</ul>` : "<p>(None with current runes.)</p>"}

    <h3 class="subheading">Rune spending</h3>
    <ul>${spendingRows}</ul>

    <h3 class="subheading">Best farm targets for next legendary</h3>
    <ul>${suggestionRows}</ul>
  `;
}

function renderError(message) {
  const results = document.getElementById("results");
  results.classList.remove("hidden");
  results.innerHTML = `<p class="error">${message}</p>`;
}

function onOptimize() {
  const runes = {};
  for (const rune of RUNES) {
    const value = getNonNegativeInt(`rune-${rune}`);
    if (value === null) {
      renderError(`Please enter a non-negative integer for ${rune}.`);
      return;
    }
    runes[rune] = value;
  }

  const built = {};
  for (const [idx, station] of STATIONS.entries()) {
    const value = getNonNegativeInt(`station-${idx}`);
    if (value === null) {
      renderError(`Please enter a non-negative integer for ${station.name}.`);
      return;
    }
    built[station.name] = value;
  }

  const result = solveOptimal(runes, built);
  renderResults(result);
}

createFields();
document.getElementById("optimize-btn").addEventListener("click", onOptimize);
