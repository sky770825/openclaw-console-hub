// DOM Elements
const gameLog = document.getElementById('game-log');
const playerHpSpan = document.getElementById('player-hp');
const playerMaxHpSpan = document.getElementById('player-max-hp');
const playerAtkSpan = document.getElementById('player-atk');
const playerDefSpan = document.getElementById('player-def');
const playerPotionsSpan = document.getElementById('player-potions');

const monsterHpSpan = document.getElementById('monster-hp');
const monsterMaxHpSpan = document.getElementById('monster-max-hp');
const monsterAtkSpan = document.getElementById('monster-atk');
const monsterDefSpan = document.getElementById('monster-def');

const attackBtn = document.getElementById('attack-btn');
const skillBtn = document.getElementById('skill-btn');
const potionBtn = document.getElementById('potion-btn');

// Game state variables
let player;
let monster;

class Character {
    constructor(name, hp, attack, defense, skills = {}, inventory = {}) {
        this.name = name;
        this.max_hp = hp;
        this.hp = hp;
        this.attack = attack;
        this.defense = defense;
        this.skills = skills;
        this.inventory = inventory;
    }

    isAlive() {
        return this.hp > 0;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(0, damage - this.defense);
        this.hp -= actualDamage;
        logMessage(${this.name} 受到 ${actualDamage} 點傷害！);
        if (!this.isAlive()) {
            logMessage(${this.name} 被擊敗了！);
        }
    }

    heal(amount) {
        this.hp = Math.min(this.max_hp, this.hp + amount);
        logMessage(${this.name} 回復了 ${amount} 點生命值，目前HP：${this.hp}/${this.max_hp});
    }
}

class Skill {
    constructor(name, damageMultiplier, cost = 0) {
        this.name = name;
        this.damageMultiplier = damageMultiplier;
        this.cost = cost;
    }
}

function logMessage(message) {
    const p = document.createElement('p');
    p.textContent = message;
    gameLog.appendChild(p);
    gameLog.scrollTop = gameLog.scrollHeight; // Auto-scroll to bottom
}

function updateStatusDisplay() {
    playerHpSpan.textContent = player.hp;
    playerMaxHpSpan.textContent = player.max_hp;
    playerAtkSpan.textContent = player.attack;
    playerDefSpan.textContent = player.defense;
    playerPotionsSpan.textContent = player.inventory['生命藥水'] || 0;

    monsterHpSpan.textContent = monster.hp;
    monsterMaxHpSpan.textContent = monster.max_hp;
    monsterAtkSpan.textContent = monster.attack;
    monsterDefSpan.textContent = monster.defense;

    // Update button states based on game conditions
    if (!player.isAlive() || !monster.isAlive()) {
        attackBtn.disabled = true;
        skillBtn.disabled = true;
        potionBtn.disabled = true;
    } else {
        attackBtn.disabled = false;
        skillBtn.disabled = false;
        potionBtn.disabled = (player.inventory['生命藥水'] || 0) <= 0;
    }
}

async function playerTurn(actionType) {
    if (!player.isAlive() || !monster.isAlive()) return;

    switch (actionType) {
        case 'attack':
            logMessage(${player.name} 發動了普通攻擊！);
            monster.takeDamage(player.attack);
            break;
        case 'skill':
            const skillName = Object.keys(player.skills)[0]; // Assuming one skill for now
            const skill = player.skills[skillName];
            logMessage(${player.name} 使用了技能：${skill.name}！);
            monster.takeDamage(player.attack * skill.damageMultiplier);
            break;
        case 'potion':
            if ((player.inventory['生命藥水'] || 0) > 0) {
                player.inventory['生命藥水']--;
                player.heal(20); // Potion heals 20 HP
            } else {
                logMessage("你沒有生命藥水了！");
                return; // Player turn doesn't end if no potion
            }
            break;
    }

    updateStatusDisplay();

    if (!monster.isAlive()) {
        logMessage(\n恭喜你，${player.name} 擊敗了 ${monster.name}！你贏了！);
        return;
    }

    // Monster's Turn after a short delay
    setTimeout(() => {
        if (monster.isAlive()) {
            logMessage(\n${monster.name} 的回合！);
            player.takeDamage(monster.attack);
            updateStatusDisplay();

            if (!player.isAlive()) {
                logMessage(\n很遺憾，${player.name} 被擊敗了。遊戲結束！);
            }
        }
    }, 1500); // 1.5 seconds delay for monster's turn
}

function initGame() {
    // Game Initialization
    const playerSkills = {"強力斬擊": new Skill("強力斬擊", 1.5)};
    const playerInventory = {"生命藥水": 2};
    player = new Character("勇者", 100, 15, 5, playerSkills, playerInventory);

    monster = new Character("哥布林", 50, 10, 2);

    logMessage("--- 迷霧森林的試煉：戰鬥開始！---");
    logMessage(你的勇者 ${player.name} 遭遇了 ${monster.name}！);
    updateStatusDisplay();
}

// Event Listeners
attackBtn.addEventListener('click', () => playerTurn('attack'));
skillBtn.addEventListener('click', () => playerTurn('skill'));
potionBtn.addEventListener('click', () => playerTurn('potion'));

// Start the game when the script loads
initGame();
