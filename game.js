const ELEMENTS = {
  fire: { label: 'Fogo', emoji: '🔥', color: '#ef765b', names: ['Luma', 'Brasa', 'Faísca', 'Círio'] },
  water: { label: 'Água', emoji: '💧', color: '#5ba9e8', names: ['Nilo', 'Maré', 'Gota', 'Coral'] },
  earth: { label: 'Terra', emoji: '🌱', color: '#78b66c', names: ['Moss', 'Oliva', 'Raiz', 'Musgo'] },
  air: { label: 'Ar', emoji: '🌬️', color: '#b19be8', names: ['Brisa', 'Nimbo', 'Vento', 'Nuvem'] }
};
const XP_TO_LEVEL = 30;
const defaults = {
  coins: 120,
  food: 8,
  playerLevel: 1,
  selectedDragon: 'starter-fire',
  dragons: [{ id: 'starter-fire', name: 'Luma', element: 'fire', level: 1, xp: 0 }]
};
let state;
try {
  const saved = JSON.parse(localStorage.getItem('dragon-isles-save') || '{}');
  state = { ...defaults, ...saved };
  if (!Array.isArray(state.dragons) || !state.dragons.length) state.dragons = defaults.dragons.map(dragon => ({ ...dragon }));
  if (!state.dragons.some(dragon => dragon.id === state.selectedDragon)) state.selectedDragon = state.dragons[0].id;
  state.coins = Math.max(0, Number(state.coins) || 0);
  state.food = Math.max(0, Number(state.food) || 0);
} catch {
  state = { ...defaults, dragons: defaults.dragons.map(dragon => ({ ...dragon })) };
}
const byId = id => document.getElementById(id);
const activeDragon = () => state.dragons.find(dragon => dragon.id === state.selectedDragon) || state.dragons[0];
let toastTimer;
function save() { localStorage.setItem('dragon-isles-save', JSON.stringify(state)); }
function render() {
  const dragon = activeDragon();
  const element = ELEMENTS[dragon.element] || ELEMENTS.fire;
  byId('coins').textContent = state.coins;
  byId('food').textContent = state.food;
  byId('player-level').textContent = state.playerLevel;
  byId('dragon-name').textContent = dragon.name;
  byId('dragon-detail').textContent = `Dragão de ${element.label} · Nv. ${dragon.level} · ${dragon.xp}/${XP_TO_LEVEL} XP`;
  byId('mood').textContent = dragon.xp ? '♥' : '☺';
  byId('dragon').className = `dragon element-${dragon.element}`;
  byId('dragon').setAttribute('aria-label', `${dragon.name}, dragão de ${element.label}, nível ${dragon.level}`);
  byId('feed-hint').textContent = `+10 XP · ${dragon.xp}/${XP_TO_LEVEL} XP para subir de nível`;
  byId('dragon-count').textContent = `${state.dragons.length} ${state.dragons.length === 1 ? 'dragão' : 'dragões'}`;
  byId('dragon-list').innerHTML = state.dragons.map(item => {
    const itemElement = ELEMENTS[item.element] || ELEMENTS.fire;
    const selected = item.id === dragon.id;
    return `<button class="dragon-card ${selected ? 'selected' : ''}" data-dragon-id="${item.id}" aria-pressed="${selected}"><span class="dragon-card-emoji">${itemElement.emoji}</span><span class="dragon-card-copy"><strong>${item.name}</strong><small>${itemElement.label} · Nv. ${item.level}</small></span><span class="dragon-card-xp">${item.xp}/${XP_TO_LEVEL} XP</span></button>`;
  }).join('');
}
function toast(message) {
  const toastEl = byId('toast');
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
byId('feed-btn').addEventListener('click', () => {
  if (state.food < 1) { toast('Sem frutas. Compre mais no Mercado.'); return; }
  const dragon = activeDragon();
  state.food -= 1;
  state.coins += 3;
  dragon.xp += 10;
  let message = `${dragon.name} adorou a fruta! +10 XP e 3 moedas.`;
  if (dragon.xp >= XP_TO_LEVEL) {
    dragon.xp -= XP_TO_LEVEL;
    dragon.level += 1;
    state.playerLevel = Math.max(state.playerLevel, dragon.level);
    message = `${dragon.name} subiu para o nível ${dragon.level}!`;
  }
  byId('status').textContent = message;
  save(); render(); toast(message);
});
byId('collect-btn').addEventListener('click', () => {
  state.coins += 15;
  byId('status').textContent = 'O habitat rendeu 15 moedas.';
  save(); render(); toast('+15 moedas coletadas');
});
byId('egg-btn').addEventListener('click', () => {
  if (state.coins < 50) { toast('Você precisa de 50 moedas para chocar um ovo.'); return; }
  state.coins -= 50;
  const elementKeys = Object.keys(ELEMENTS);
  const element = elementKeys[Math.floor(Math.random() * elementKeys.length)];
  const data = ELEMENTS[element];
  const name = data.names[Math.floor(Math.random() * data.names.length)];
  const dragon = { id: `dragon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, element, level: 1, xp: 0 };
  state.dragons.push(dragon);
  state.selectedDragon = dragon.id;
  byId('status').textContent = `${name}, dragão de ${data.label}, nasceu!`;
  save(); render(); toast(`O ovo chocou: ${data.emoji} ${name}, dragão de ${data.label}!`);
});
byId('food-btn').addEventListener('click', () => {
  if (state.coins < 25) { toast('Você precisa de 25 moedas para comprar frutas.'); return; }
  state.coins -= 25;
  state.food += 5;
  save(); render(); toast('Você comprou 5 frutas.');
});
byId('dragon-list').addEventListener('click', event => {
  const card = event.target.closest('[data-dragon-id]');
  if (!card) return;
  state.selectedDragon = card.dataset.dragonId;
  save(); render();
  const dragon = activeDragon();
  byId('status').textContent = `${dragon.name} está no habitat!`;
});
render();
