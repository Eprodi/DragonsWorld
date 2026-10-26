const defaults = { coins: 120, food: 8, fed: false, eggHatched: false };
let state;
try { state = { ...defaults, ...JSON.parse(localStorage.getItem('dragon-isles-save') || '{}') }; }
catch { state = { ...defaults }; }
const coinsEl = document.querySelector('#coins');
const foodEl = document.querySelector('#food');
const statusEl = document.querySelector('#status');
const moodEl = document.querySelector('#mood');
const toastEl = document.querySelector('#toast');
let toastTimer;
function save() { localStorage.setItem('dragon-isles-save', JSON.stringify(state)); }
function render() {
  coinsEl.textContent = state.coins;
  foodEl.textContent = state.food;
  document.querySelector('#egg-label').textContent = state.eggHatched ? 'Ovo chocado!' : 'Chocar ovo';
  document.querySelector('#dragon-name').textContent = state.eggHatched ? 'Luma & Pipo' : 'Luma';
  moodEl.textContent = state.fed ? '♥' : '☺';
  document.querySelector('#dragon').setAttribute('aria-label', state.eggHatched ? 'Luma e Pipo, seus dragões' : 'Luma, sua dragão de brasa');
}
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2100);
}
document.querySelector('#feed-btn').addEventListener('click', () => {
  if (state.food < 1) { toast('Sem frutas! Colete moedas para reabastecer.'); return; }
  state.food -= 1; state.fed = true; state.coins += 3;
  statusEl.textContent = 'Luma adorou a fruta!';
  save(); render(); toast('Luma ganhou energia · +3 moedas');
});
document.querySelector('#collect-btn').addEventListener('click', () => {
  state.coins += 15;
  statusEl.textContent = 'O habitat rendeu algumas moedas.';
  save(); render(); toast('+15 moedas coletadas');
});
document.querySelector('#egg-btn').addEventListener('click', () => {
  if (state.eggHatched) { toast('Pipo ainda está conhecendo a ilha!'); return; }
  if (state.coins < 50) { toast('Você precisa de 50 moedas para chocar o ovo.'); return; }
  state.coins -= 50; state.eggHatched = true;
  statusEl.textContent = 'Uma nova vida chegou à ilha!';
  save(); render(); toast('O ovo chocou! Conheça Pipo, o dragão-brotinho.');
});
render();
