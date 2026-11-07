const form = document.getElementById("f");
const saved = document.getElementById("saved");

chrome.storage.sync.get({ mode: "indicator" }, ({ mode }) => {
  const input = form.querySelector(`input[value="${mode}"]`);
  if (input) input.checked = true;
});

form.addEventListener("change", (e) => {
  chrome.storage.sync.set({ mode: e.target.value }, () => {
    saved.style.opacity = 1;
    setTimeout(() => (saved.style.opacity = 0), 1200);
  });
});

const effects = document.getElementById("effects");
chrome.storage.sync.get({ effects: true }, (v) => (effects.checked = v.effects));
effects.addEventListener("change", () => {
  chrome.storage.sync.set({ effects: effects.checked }, () => {
    saved.style.opacity = 1;
    setTimeout(() => (saved.style.opacity = 0), 1200);
  });
});
