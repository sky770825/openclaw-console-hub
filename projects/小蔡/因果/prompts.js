// NEUXA 影像意境資料庫 v2.0 - 全量 18 層地獄（中國煉獄・靈體哀嚎・痛苦・依文生成）
const HELL_LEVELS = [
    { name: "拔舌地獄", en: "TONGUE-REMOVAL HELL", file: "tongue-removal.jpg",
      prompt: "Chinese traditional hell scene, ghostly spirits wailing in agony, iron pincers pulling tongues, dark underworld court, red and gold accents, volumetric smoke, photorealistic 8K, no text." },
    { name: "剪指地獄", en: "FINGER-CUTTING HELL", file: "finger-cutting.jpg",
      prompt: "Chinese hell scene, souls in extreme pain, cold steel blades cutting fingers, dark stone chamber, wailing spirits, ancient engravings, eerie blue light, photorealistic 8K, no text." },
    { name: "鐵樹地獄", en: "IRON TREE HELL", file: "iron-tree.png",
      prompt: "Chinese underworld, massive black iron tree with razor blades as branches, spirits impaled and wailing, lightning and dark sky, agony and despair, photorealistic 8K, no text." },
    { name: "孽鏡地獄", en: "MIRROR OF KARMA HELL", file: "mirror-karma.jpg",
      prompt: "Ancient bronze karma mirror in Chinese hell, swirling spiritual energy, souls collapsing before their reflected sins, wailing and terror, mystical glow, dark court, photorealistic 8K, no text." },
    { name: "蒸籠地獄", en: "STEAMER HELL", file: "steamer-hell.jpg",
      prompt: "Chinese hell, giant bamboo steamers, ghostly figures in scorching steam, wailing spirits, heat haze, dark mist, suffering and repentance, photorealistic 8K, no text." },
    { name: "銅柱地獄", en: "COPPER PILLAR HELL", file: "copper-pillar.jpg",
      prompt: "Chinese hell, glowing red-hot copper pillar, souls clinging in agony, intense heat distortion, sparks and embers, wailing spirits, dark cave, photorealistic 8K, no text." },
    { name: "刀山地獄", en: "MOUNTAIN OF KNIVES HELL", file: "mountain-knives.jpg",
      prompt: "Chinese hell, mountain of sharp blades, naked spirits climbing in agony, blood and despair, wailing souls, dark red clouds, cinematic wide shot, photorealistic 8K, no text." },
    { name: "冰山地獄", en: "ICE MOUNTAIN HELL", file: "ice-mountain.jpg",
      prompt: "Chinese hell, frozen souls trapped in jagged blue ice, wailing in cold agony, freezing mist, translucent ice peaks, despair, photorealistic 8K, no text." },
    { name: "油鍋地獄", en: "BOILING OIL HELL", file: "oil-cauldron.jpg",
      prompt: "Chinese hell, bubbling black cauldron, liquid gold ripples, spirits in boiling oil wailing in agony, intense heat haze, dramatic shadows, photorealistic fire, no text." },
    { name: "牛坑地獄", en: "OX PIT HELL", file: "ox-pit.jpg",
      prompt: "Chinese hell, stampede of iron-horned bulls, souls trampled and wailing, dust and chaos, dark earth, spirits in extreme suffering, cinematic 8K, no text." },
    { name: "石壓地獄", en: "CRUSHING STONE HELL", file: "crushing-stone.jpg",
      prompt: "Chinese hell, massive stone crushing souls, bones and agony, wailing spirits under weight, dark cavern, visceral despair, photorealistic 8K, no text." },
    { name: "舂臼地獄", en: "MORTAR HELL", file: "mortar-hell.jpg",
      prompt: "Chinese hell, giant stone mortar pounding spirits, wailing and grinding, pestle and suffering, dark underworld, photorealistic 8K, no text." },
    { name: "血池地獄", en: "BLOOD POOL HELL", file: "blood-pool.jpg",
      prompt: "Chinese hell, infinite crimson blood pool, souls drowning and wailing, thick visceral texture, red fog, spirits in agony, dramatic low-key lighting, photorealistic 8K, no text." },
    { name: "枉死地獄", en: "WRONGFUL DEATH HELL", file: "wrongful-death.jpg",
      prompt: "Chinese hell, spirits reliving death in loop, wailing in regret and terror, dark void, repeated dying moments, despair and remorse, photorealistic 8K, no text." },
    { name: "磔刑地獄", en: "DISMEMBERMENT HELL", file: "dismemberment.jpg",
      prompt: "Chinese hell, souls bound to frame, thousand cuts punishment, wailing in agony, blood and suffering, dark execution ground, photorealistic 8K, no text." },
    { name: "火山地獄", en: "VOLCANO HELL", file: "volcano-hell.jpg",
      prompt: "Chinese hell, souls falling into lava volcano, molten rock, wailing spirits burning, ash and fire, despair, photorealistic 8K, no text." },
    { name: "石磨地獄", en: "GRINDING MILL HELL", file: "grinding-mill.jpg",
      prompt: "Chinese hell, giant stone mill grinding souls, wailing spirits crushed, dark grinding chamber, visceral suffering, photorealistic 8K, no text." },
    { name: "刀鋸地獄", en: "SAW HELL", file: "saw-hell.jpg",
      prompt: "Chinese hell, spirits sawn in half from groin, wailing in ultimate agony, blood and terror, dark execution platform, photorealistic 8K, no text." }
];

// 相容舊版：標題對應意境指令（供頁面 badge 用）
const GeminiPrompts = {};
HELL_LEVELS.forEach(h => { GeminiPrompts[h.name] = h.prompt; });

// 神明提示詞
const DeityPrompts = {
    "玉皇大天尊": "Jade Emperor, divine golden armor, eyes reflecting galaxies, transcendent starlight, epic scale, 100% photorealistic.",
    "地藏王菩薩": "Ksitigarbha, glowing golden staff, floating lotuses in dark void, serene powerful aura, ethereal cinematic lighting.",
    "三清道祖": "The Supreme Trinity, three beams of primary light merging into one, cosmic order, ancient Taoist temple clouds, 8K."
};

document.addEventListener('DOMContentLoaded', () => {
    const allPrompts = { ...GeminiPrompts, ...DeityPrompts };
    Object.keys(allPrompts).forEach(key => {
        document.querySelectorAll('h1, h2, h3, h4').forEach(el => {
            if(el.textContent.includes(key)) {
                const badge = document.createElement('div');
                badge.className = 'prompt-badge';
                badge.textContent = `意境指令: ${allPrompts[key]}`;
                el.parentNode.insertBefore(badge, el.nextSibling);
            }
        });
    });
});
