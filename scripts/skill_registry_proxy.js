const fs = require('fs');
const path = require('path');

class SkillRegistryProxy {
    constructor(workspaceDir) {
        this.workspaceDir = workspaceDir;
        this.registry = new Map();
    }

    // Optimization: Cache skill lookups to reduce Disk I/O
    loadRegistry() {
        const skillsPath = path.join(this.workspaceDir, 'skills');
        if (!fs.existsSync(skillsPath)) return;

        const files = fs.readdirSync(skillsPath);
        files.forEach(file => {
            if (file.endsWith('.js') || file.endsWith('.py')) {
                this.registry.set(file, path.join(skillsPath, file));
            }
        });
        console.log(`[ARCH_OPTIMIZATION] Loaded ${this.registry.size} skills into memory cache.`);
    }

    getSkill(name) {
        return this.registry.get(name);
    }
}

const proxy = new SkillRegistryProxy('/Users/sky770825/.openclaw/workspace');
proxy.loadRegistry();
