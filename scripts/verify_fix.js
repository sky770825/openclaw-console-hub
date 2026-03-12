const testCases = [
    "curl -s http://localhost:3011/api/health",
    "curl http://localhost:3011/api/health",
    "curl -s http://localhost:3000/api/health"
];

// 修正後的正則表達式
const improvedWhitelist = [
    /^curl (-s )?http:\/\/localhost:\d+\/api\/health$/,
    /^node -v$/,
    /^ls -R \/Users\/caijunchang\/\.openclaw\/workspace\/sandbox\/.*$/
];

function check(cmd) {
    return improvedWhitelist.some(re => re.test(cmd));
}

console.log("--- 驗證新正則表達式 ---");
testCases.forEach(cmd => {
    const passed = check(cmd);
    console.log(`Command: [${cmd}] -> ${passed ? "✅ ALLOWED" : "❌ BLOCKED"}`);
    if (!passed) process.exit(1);
});
console.log("--- 驗證成功 ---");
