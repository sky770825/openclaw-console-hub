import random

class Character:
    def __init__(self, name, hp, attack, defense, skills=None, inventory=None):
        self.name = name
        self.max_hp = hp
        self.hp = hp
        self.attack = attack
        self.defense = defense
        self.skills = skills if skills is not None else {}
        self.inventory = inventory if inventory is not None else {}

    def is_alive(self):
        return self.hp > 0

    def take_damage(self, damage):
        actual_damage = max(0, damage - self.defense)
        self.hp -= actual_damage
        print(f"{self.name} 受到 {actual_damage} 點傷害！")
        if not self.is_alive():
            print(f"{self.name} 被擊敗了！")

    def heal(self, amount):
        self.hp = min(self.max_hp, self.hp + amount)
        print(f"{self.name} 回復了 {amount} 點生命值，目前HP：{self.hp}/{self.max_hp}")

    def display_status(self):
        print(f"\n[{self.name}] HP: {self.hp}/{self.max_hp} | ATK: {self.attack} | DEF: {self.defense}")


class Skill:
    def __init__(self, name, damage_multiplier, cost=0):
        self.name = name
        self.damage_multiplier = damage_multiplier
        self.cost = cost # For future use, e.g., mana cost

def battle(player, monster):
    print(f"\n--- {player.name} vs. {monster.name} ---")

    while player.is_alive() and monster.is_alive():
        player.display_status()
        monster.display_status()

        # Player's Turn
        print("\n你的回合！請選擇行動：")
        print("1. 普通攻擊")
        for i, skill_name in enumerate(player.skills, 2):
            print(f"{i}. 使用技能：{skill_name}")
        print(f"{len(player.skills) + 2}. 使用藥水 (HP+{player.inventory.get('生命藥水', 0) * 20}，剩餘：{player.inventory.get('生命藥水', 0)}個)")

        choice = input("輸入選項數字：")

        if choice == '1':
            print(f"{player.name} 發動了普通攻擊！")
            monster.take_damage(player.attack)
        elif choice.isdigit() and 2 <= int(choice) <= len(player.skills) + 1:
            skill_index = int(choice) - 2
            skill_name = list(player.skills.keys())[skill_index]
            skill = player.skills[skill_name]
            print(f"{player.name} 使用了技能：{skill.name}！")
            monster.take_damage(player.attack * skill.damage_multiplier)
        elif choice.isdigit() and int(choice) == len(player.skills) + 2:
            if player.inventory.get('生命藥水', 0) > 0:
                player.inventory['生命藥水'] -= 1
                player.heal(20) # Potion heals 20 HP
            else:
                print("你沒有生命藥水了！")
                continue # Skip monster's turn if player makes invalid choice
        else:
            print("無效的選項，請重新選擇！")
            continue

        if not monster.is_alive():
            break

        # Monster's Turn
        print(f"\n{monster.name} 的回合！")
        # Simple AI: Monster always attacks
        player.take_damage(monster.attack)

    if player.is_alive():
        print(f"\n恭喜你，{player.name} 擊敗了 {monster.name}！你贏了！")
    else:
        print(f"\n很遺憾，{player.name} 被擊敗了。遊戲結束！")


# Game Initialization
player_skills = {"強力斬擊": Skill("強力斬擊", 1.5)}
player_inventory = {"生命藥水": 2}
player = Character("勇者", 100, 15, 5, player_skills, player_inventory)

monster = Character("哥布林", 50, 10, 2)

battle(player, monster)
