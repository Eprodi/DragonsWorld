const ELEMENTS = {
  fire: { label: 'Fogo', emoji: '🔥', color: '#ef765b', names: ['Luma', 'Brasa', 'Faísca', 'Círio'] },
  water: { label: 'Água', emoji: '💧', color: '#5ba9e8', names: ['Nilo', 'Maré', 'Gota', 'Coral'] },
  earth: { label: 'Terra', emoji: '🌱', color: '#78b66c', names: ['Moss', 'Oliva', 'Raiz', 'Musgo'] },
  air: { label: 'Ar', emoji: '🌬️', color: '#b19be8', names: ['Brisa', 'Nimbo', 'Vento', 'Nuvem'] }
};
const XP_TO_LEVEL = 30;
const defaults = {
  coins: 120, food: 8, playerLevel: 1, playerXp: 0, islands: 1, cleared: [],
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
  state.islands = Math.max(1, Number(state.islands) || 1);
  state.cleared = Array.isArray(state.cleared) ? state.cleared : [];
} catch { state = { ...defaults, dragons: defaults.dragons.map(dragon => ({ ...dragon })) }; }
const byId = id => document.getElementById(id);
const activeDragon = () => state.dragons.find(dragon => dragon.id === state.selectedDragon) || state.dragons[0];
let toastTimer;
let cleanupMode = false;
function save() { localStorage.setItem('dragon-isles-save', JSON.stringify(state)); }
function addXp(amount) {
  state.playerXp += amount;
  while (state.playerXp >= XP_TO_LEVEL) { state.playerXp -= XP_TO_LEVEL; state.playerLevel += 1; }
}
function render() {
  const dragon = activeDragon();
  const element = ELEMENTS[dragon.element] || ELEMENTS.fire;
  byId('coins').textContent = state.coins;
  byId('food').textContent = state.food;
  byId('player-level').textContent = state.playerLevel;
  byId('dragon-name').textContent = dragon.name;
  byId('dragon-detail').textContent = `Dragão de ${element.label} · Nv. ${dragon.level} · ${dragon.xp}/${XP_TO_LEVEL} XP`;
  byId('mood').textContent = dragon.xp ? '♥' : '☺';
  byId('feed-hint').textContent = `+10 XP · ${dragon.xp}/${XP_TO_LEVEL} XP para subir de nível`;
  byId('dragon-count').textContent = `${state.dragons.length} ${state.dragons.length === 1 ? 'dragão' : 'dragões'}`;
  byId('island-number').textContent = state.islands;
  byId('island-name').textContent = state.islands === 1 ? 'Ilha do Começo' : `Ilha ${state.islands}`;
  byId('island-price').textContent = `${250 * state.islands} moedas · nova área`;
  byId('dragon-list').innerHTML = state.dragons.map(item => {
    const itemElement = ELEMENTS[item.element] || ELEMENTS.fire;
    const selected = item.id === dragon.id;
    return `<button class="dragon-card ${selected ? 'selected' : ''}" data-dragon-id="${item.id}" aria-pressed="${selected}"><span class="dragon-card-emoji">${itemElement.emoji}</span><span class="dragon-card-copy"><strong>${item.name}</strong><small>${itemElement.label} · Nv. ${item.level}</small></span><span class="dragon-card-xp">${item.xp}/${XP_TO_LEVEL} XP</span></button>`;
  }).join('');
  window.dispatchEvent(new CustomEvent('dragon:change', { detail: dragon }));
}
function toast(message) {
  const el = byId('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
byId('feed-btn').addEventListener('click', () => {
  if (state.food < 1) { toast('Sem frutas. Compre mais no Mercado.'); return; }
  const dragon = activeDragon(); state.food -= 1; state.coins += 3; dragon.xp += 10; addXp(5);
  if (dragon.xp >= XP_TO_LEVEL) { dragon.xp -= XP_TO_LEVEL; dragon.level += 1; }
  const message = `${dragon.name} adorou a fruta! +10 XP.`;
  byId('status').textContent = message; save(); render(); toast(message);
});
byId('collect-btn').addEventListener('click', () => {
  const gain = 15 * state.islands; state.coins += gain;
  byId('status').textContent = `Seus habitats renderam ${gain} moedas.`;
  save(); render(); toast(`+${gain} moedas coletadas`);
});
byId('egg-btn').addEventListener('click', () => {
  const price = 250 * state.islands;
  if (state.coins < price) { toast(`Junte ${price} moedas para comprar uma ilha.`); return; }
  state.coins -= price; state.islands += 1; save(); render();
  window.dispatchEvent(new CustomEvent('world:island-purchased', { detail: { number: state.islands } }));
  const message = `Ilha ${state.islands} comprada! Agora limpe as árvores e pedras para ganhar XP.`;
  byId('status').textContent = message; toast(message);
});
byId('food-btn').addEventListener('click', () => {
  if (state.coins < 25) { toast('Você precisa de 25 moedas para comprar frutas.'); return; }
  state.coins -= 25; state.food += 5; save(); render(); toast('Você comprou 5 frutas.');
});
byId('clear-mode-btn').addEventListener('click', () => {
  cleanupMode = !cleanupMode;
  byId('clear-mode-btn').setAttribute('aria-pressed', String(cleanupMode));
  byId('clear-mode-btn').textContent = cleanupMode ? '✕ Concluir limpeza' : '⛏️ Limpar terreno';
  byId('status').textContent = cleanupMode ? 'Toque em uma árvore ou pedra para limpar o terreno.' : 'Luma está feliz em ver você!';
  document.querySelector('.island').classList.toggle('cleanup-active', cleanupMode);
});
window.addEventListener('world:clear-obstacle', event => {
  if (!cleanupMode) return;
  const { id, kind, cost, xp } = event.detail;
  if (state.cleared.includes(id)) return;
  if (state.coins < cost) { toast(`Você precisa de ${cost} moedas para remover este obstáculo.`); return; }
  state.coins -= cost; state.cleared.push(id); addXp(xp); save(); render();
  window.dispatchEvent(new CustomEvent('world:remove-obstacle', { detail: { id } }));
  const message = `${kind === 'tree' ? 'Árvore' : 'Pedra'} removida! -${cost} moedas · +${xp} XP.`;
  byId('status').textContent = message; toast(message);
});
byId('dragon-list').addEventListener('click', event => {
  const card = event.target.closest('[data-dragon-id]'); if (!card) return;
  state.selectedDragon = card.dataset.dragonId; save(); render();
  byId('status').textContent = `${activeDragon().name} está no habitat!`;
});
render();
