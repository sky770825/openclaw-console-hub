// NEUXA 影像意境資料庫 v2.0 - 全量 18 層地獄
const GeminiPrompts = {
    "拔舌地獄": "Hyper-realistic 8K cinematic, ancient rusted iron pincers, glowing red embers, volumetric smoke, photorealistic textures.",
    "剪指地獄": "Close-up 8K, sharp cold steel blades with ancient engravings, dark stone background, eerie blue lighting, intense clarity.",
    "鐵樹地獄": "Massive black iron tree with razor-sharp branches, thorns reflecting lightning, dramatic dark sky, surreal and terrifying.",
    "孽鏡地獄": "Ancient bronze mirror, surface showing swirling spiritual energy, high contrast, reflection of a chaotic world, mystical glow.",
    "蒸籠地獄": "Giant bamboo steamers rising through dark mist, volumetric white steam, glowing heat from below, cinematic lighting.",
    "銅柱地獄": "Glow-red molten copper pillar, heat distortion in the air, sparks, dark cave background, high-definition metal textures.",
    "刀山地獄": "A mountain made of millions of obsidian blades, silver glints, dark red clouds, sharp focus, cinematic wide shot.",
    "冰山地獄": "Translucent jagged blue ice peaks, freezing mist, dim twilight, hyper-realistic frost textures, vast scale.",
    "油鍋地獄": "Bubbling black cauldron, liquid gold ripples, intense heat haze, dramatic shadows, photorealistic fire.",
    "牛坑地獄": "A stampede of celestial bulls with glowing eyes, dust clouds, dark earth, powerful motion blur, cinematic 8K.",
    "血池地獄": "Infinite crimson pool, thick visceral texture, dark reflections, red fog, dramatic low-key lighting.",
    "無間地獄": "Dark surrealist 8K, infinite collapsing dimensions, crimson black nebula, shattering reality fragments, eternal descent."
};

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
