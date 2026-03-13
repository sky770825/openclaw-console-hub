import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || '/Users/sky770825/.openclaw/workspace/sandbox/shop_db.json';

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading database:", err);
        return null;
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Error writing database:", err);
        return false;
    }
}

const args = process.argv.slice(2);
const command = args[0];

const db = readDB();

if (!db) {
    process.exit(1);
}

switch (command) {
    case 'get-info':
        console.log(JSON.stringify(db.shopInfo, null, 2));
        break;
    case 'update-info':
        const newInfo = JSON.parse(args[1]);
        db.shopInfo = { ...db.shopInfo, ...newInfo };
        writeDB(db);
        console.log("Shop info updated.");
        break;
    case 'list-services':
        console.log(JSON.stringify(db.services, null, 2));
        break;
    case 'add-service':
        const newService = JSON.parse(args[1]);
        newService.id = db.services.length > 0 ? Math.max(...db.services.map(s => s.id)) + 1 : 1;
        db.services.push(newService);
        writeDB(db);
        console.log("Service added.");
        break;
    case 'update-hours':
        const newHours = JSON.parse(args[1]);
        db.businessHours = { ...db.businessHours, ...newHours };
        writeDB(db);
        console.log("Business hours updated.");
        break;
    case 'add-portfolio':
        const newWork = JSON.parse(args[1]);
        newWork.id = db.portfolio.length > 0 ? Math.max(...db.portfolio.map(p => p.id)) + 1 : 1;
        db.portfolio.push(newWork);
        writeDB(db);
        console.log("Portfolio item added.");
        break;
    default:
        console.log("Usage: node shop_manager.js [command] [payload]");
        console.log("Commands: get-info, update-info, list-services, add-service, update-hours, add-portfolio");
}
